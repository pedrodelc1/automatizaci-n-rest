import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { imprimirTicket } from "@/lib/printer";
import { notificar } from "@/lib/notificaciones";
import { esAdminAutorizado } from "@/lib/admin-auth";
import { EstadoPedido, FormaPago, TipoPedido } from "@prisma/client";
import { COOKIE_CARRITO, obtenerSesionActiva } from "@/lib/carrito-sesion";
import { getEstadoHorario } from "@/config/restaurante";

// Rate limiting en memoria — 5 pedidos por IP cada 5 minutos
const pedidosRateLimit = new Map<string, { count: number; desde: number }>();
const MAX_PEDIDOS = 5;
const VENTANA_PEDIDOS_MS = 5 * 60 * 1000;

function getIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function checkPedidoRateLimit(ip: string): boolean {
  const ahora = Date.now();
  const record = pedidosRateLimit.get(ip);
  if (!record || ahora - record.desde > VENTANA_PEDIDOS_MS) {
    pedidosRateLimit.set(ip, { count: 1, desde: ahora });
    return true;
  }
  if (record.count >= MAX_PEDIDOS) return false;
  record.count++;
  return true;
}

const crearPedidoSchema = z
  .object({
    tipo: z.nativeEnum(TipoPedido),
    nombreCliente: z.string().min(2).max(200),
    telefono: z.string().min(6).max(30),
    email: z.string().email(),
    direccionEntrega: z.string().max(300).optional(),
    formaPago: z.nativeEnum(FormaPago),
    montoCon: z.number().positive().optional(),
    notas: z.string().max(500).optional(),
  })
  .refine(
    (data) =>
      data.tipo !== TipoPedido.DELIVERY ||
      (data.direccionEntrega && data.direccionEntrega.trim().length > 5),
    { message: "La dirección es obligatoria para delivery", path: ["direccionEntrega"] }
  );

export async function POST(req: NextRequest) {
  // Rate limiting
  if (!checkPedidoRateLimit(getIP(req))) {
    return NextResponse.json(
      { ok: false, error: "Demasiados pedidos. Esperá unos minutos." },
      { status: 429 }
    );
  }

  // Bloquear pedidos fuera de horario
  const horario = getEstadoHorario();
  if (!horario.abierto) {
    return NextResponse.json(
      { ok: false, error: `El restaurante está cerrado. ${horario.etiqueta}.` },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const parsed = crearPedidoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { tipo, nombreCliente, telefono, email, direccionEntrega, formaPago, montoCon, notas } =
      parsed.data;

    // Leer items del carrito server-side (nunca del body del cliente)
    const sesionId = req.cookies.get(COOKIE_CARRITO)?.value;
    const sesion = await obtenerSesionActiva(sesionId);
    if (!sesion) {
      return NextResponse.json(
        { ok: false, error: "Carrito no encontrado o expirado" },
        { status: 400 }
      );
    }

    const carritoItems = await prisma.itemCarritoSesion.findMany({
      where: { sesionId: sesion.id },
    });

    if (carritoItems.length === 0) {
      return NextResponse.json(
        { ok: false, error: "El carrito está vacío" },
        { status: 400 }
      );
    }

    // Verificar que todos los productos existen y están disponibles
    const productoIds = carritoItems.map((i) => i.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productoIds }, disponible: true },
    });

    if (productos.length !== productoIds.length) {
      return NextResponse.json(
        { ok: false, error: "Uno o más productos no están disponibles" },
        { status: 400 }
      );
    }

    // Calcular totales con precios de la BD
    // Si el item es cross-sell y tiene precioCarrito, aplicar el precio promocional
    const productoMap = new Map(productos.map((p) => [p.id, p]));
    const itemsConPrecio = carritoItems.map((item) => {
      const prod = productoMap.get(item.productoId)!;
      const pCarrito = prod.precioCarrito?.toNumber() ?? null;
      const precioUnitario =
        item.esCrossSell && pCarrito !== null && pCarrito < prod.precio.toNumber()
          ? pCarrito
          : prod.precio.toNumber();
      return {
        productoId: item.productoId,
        cantidad: item.cantidad,
        notasItem: item.notasItem ?? undefined,
        precioUnitario,
        subtotal: precioUnitario * item.cantidad,
      };
    });

    const total = itemsConPrecio.reduce((sum, i) => sum + i.subtotal, 0);

    // Crear pedido con sus items en una transacción
    const pedido = await prisma.pedido.create({
      data: {
        tipo,
        nombreCliente,
        telefono,
        email,
        direccionEntrega: tipo === TipoPedido.DELIVERY ? direccionEntrega : null,
        formaPago,
        montoCon: montoCon ?? null,
        notas,
        total,
        estadoPago: "PENDIENTE",
        estado: formaPago === FormaPago.ONLINE ? "PENDIENTE" : "CONFIRMADO",
        items: {
          create: itemsConPrecio.map((i) => ({
            productoId: i.productoId,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
            subtotal: i.subtotal,
            notasItem: i.notasItem,
          })),
        },
      },
      include: {
        items: { include: { producto: true } },
      },
    });

    // Pago presencial (efectivo o tarjeta al llegar): confirmar, imprimir y notificar de inmediato
    if (formaPago !== FormaPago.ONLINE) {
      imprimirTicket(pedido).catch((e) =>
        console.error("[POST /api/pedidos] Error de impresión:", e)
      );
      notificar("pedido.nuevo", pedido).catch(() => {});
    }

    return NextResponse.json({ ok: true, data: pedido }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/pedidos]", error);
    return NextResponse.json(
      { ok: false, error: "Error al crear el pedido" },
      { status: 500 }
    );
  }
}

const querySchema = z.object({
  estado: z.nativeEnum(EstadoPedido).optional(),
  tipo: z.nativeEnum(TipoPedido).optional(),
});

// GET /api/pedidos — para el panel de admin
export async function GET(req: NextRequest) {
  if (!esAdminAutorizado(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    estado: searchParams.get("estado") ?? undefined,
    tipo: searchParams.get("tipo") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Parámetros inválidos" }, { status: 400 });
  }

  const { estado, tipo } = parsed.data;

  try {
    const pedidos = await prisma.pedido.findMany({
      where: {
        ...(estado && { estado }),
        ...(tipo && { tipo }),
      },
      include: { items: { include: { producto: true } } },
      orderBy: { creadoEn: "desc" },
      take: 100,
    });

    return NextResponse.json({ ok: true, data: pedidos });
  } catch (error) {
    console.error("[GET /api/pedidos]", error);
    return NextResponse.json(
      { ok: false, error: "Error al obtener pedidos" },
      { status: 500 }
    );
  }
}
