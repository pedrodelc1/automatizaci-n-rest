import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { imprimirTicket } from "@/lib/printer";
import { notificar } from "@/lib/notificaciones";
import { esAdminAutorizado } from "@/lib/admin-auth";
import { FormaPago, TipoPedido } from "@prisma/client";

const itemSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.number().int().min(1).max(50),
  notasItem: z.string().max(200).optional(),
});

const crearPedidoSchema = z
  .object({
    tipo: z.nativeEnum(TipoPedido),
    nombreCliente: z.string().min(2).max(200),
    telefono: z.string().min(6).max(30),
    email: z.string().email(),
    direccionEntrega: z.string().max(300).optional(),
    formaPago: z.nativeEnum(FormaPago),
    notas: z.string().max(500).optional(),
    items: z.array(itemSchema).min(1).max(50),
  })
  .refine(
    (data) =>
      data.tipo !== TipoPedido.DELIVERY ||
      (data.direccionEntrega && data.direccionEntrega.trim().length > 5),
    { message: "La dirección es obligatoria para delivery", path: ["direccionEntrega"] }
  );

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = crearPedidoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { tipo, nombreCliente, telefono, email, direccionEntrega, formaPago, notas, items } =
      parsed.data;

    // Verificar que todos los productos existen y están disponibles
    const productoIds = items.map((i) => i.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productoIds }, disponible: true },
    });

    if (productos.length !== productoIds.length) {
      return NextResponse.json(
        { ok: false, error: "Uno o más productos no están disponibles" },
        { status: 400 }
      );
    }

    // Calcular totales con precios actuales de la BD
    const productoMap = new Map(productos.map((p) => [p.id, p]));
    const itemsConPrecio = items.map((item) => {
      const prod = productoMap.get(item.productoId)!;
      const precioUnitario = prod.precio.toNumber();
      return {
        productoId: item.productoId,
        cantidad: item.cantidad,
        notasItem: item.notasItem,
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
        notas,
        total,
        // Pago contra entrega se confirma directamente; online queda PENDIENTE
        estadoPago: formaPago === FormaPago.CONTRA_ENTREGA ? "PENDIENTE" : "PENDIENTE",
        estado: formaPago === FormaPago.CONTRA_ENTREGA ? "CONFIRMADO" : "PENDIENTE",
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

    // Contra entrega: confirmar, imprimir y notificar de inmediato
    if (formaPago === FormaPago.CONTRA_ENTREGA) {
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

// GET /api/pedidos — para el panel de admin
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const tipo = searchParams.get("tipo");

  if (!esAdminAutorizado(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const pedidos = await prisma.pedido.findMany({
      where: {
        ...(estado && { estado: estado as never }),
        ...(tipo && { tipo: tipo as never }),
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
