import { NextRequest, NextResponse } from "next/server";
import { esAdminAutorizado } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type Periodo = "dia" | "semana" | "mes";

function getRango(periodo: Periodo): { inicio: Date; duracionMs: number } {
  const ahora = new Date();
  let inicio: Date;
  let duracionMs: number;

  switch (periodo) {
    case "dia":
      inicio = new Date(ahora);
      inicio.setHours(0, 0, 0, 0);
      duracionMs = 24 * 60 * 60 * 1000;
      break;
    case "mes":
      inicio = new Date(ahora);
      inicio.setDate(ahora.getDate() - 30);
      duracionMs = 30 * 24 * 60 * 60 * 1000;
      break;
    default:
      inicio = new Date(ahora);
      inicio.setDate(ahora.getDate() - 7);
      duracionMs = 7 * 24 * 60 * 60 * 1000;
  }

  return { inicio, duracionMs };
}

export async function GET(req: NextRequest) {
  if (!esAdminAutorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const periodo = ((searchParams.get("periodo") ?? "semana") as Periodo);
  const { inicio, duracionMs } = getRango(periodo);
  const inicioPrevio = new Date(inicio.getTime() - duracionMs);

  type RawHora = { hora: number; cantidad: number };
  type RawCliente = {
    nombre_cliente: string;
    telefono: string;
    email: string;
    pedidos: number;
    gasto_total: string;
    ultimo_pedido: Date;
  };

  const [resumen, resumenPrevio, topItems, pedidosPorHora, splitTipo, ultimosClientes] =
    await Promise.all([
      prisma.pedido.aggregate({
        where: { creadoEn: { gte: inicio }, estado: { not: "CANCELADO" } },
        _sum: { total: true },
        _count: { _all: true },
        _avg: { total: true },
      }),
      prisma.pedido.aggregate({
        where: {
          creadoEn: { gte: inicioPrevio, lt: inicio },
          estado: { not: "CANCELADO" },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.itemPedido.groupBy({
        by: ["productoId"],
        where: {
          pedido: { creadoEn: { gte: inicio }, estado: { not: "CANCELADO" } },
        },
        _sum: { cantidad: true, subtotal: true },
        orderBy: { _sum: { cantidad: "desc" } },
        take: 5,
      }),
      prisma.$queryRaw<RawHora[]>`
        SELECT EXTRACT(HOUR FROM creado_en)::int AS hora, COUNT(*)::int AS cantidad
        FROM pedidos
        WHERE creado_en >= NOW() - INTERVAL '7 days'
          AND estado != 'CANCELADO'
        GROUP BY hora
        ORDER BY hora
      `,
      prisma.pedido.groupBy({
        by: ["tipo"],
        where: { creadoEn: { gte: inicio }, estado: { not: "CANCELADO" } },
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.$queryRaw<RawCliente[]>`
        SELECT nombre_cliente, telefono, email,
               COUNT(*)::int          AS pedidos,
               SUM(total)::text       AS gasto_total,
               MAX(creado_en)         AS ultimo_pedido
        FROM pedidos
        WHERE estado != 'CANCELADO'
        GROUP BY nombre_cliente, telefono, email
        ORDER BY ultimo_pedido DESC
        LIMIT 10
      `,
    ]);

  const productoIds = topItems.map((t) => t.productoId);
  const productos = await prisma.producto.findMany({
    where: { id: { in: productoIds } },
    select: { id: true, nombre: true },
  });
  const productoMap = new Map(productos.map((p) => [p.id, p.nombre]));

  const topPlatos = topItems.map((t) => ({
    nombre: productoMap.get(t.productoId) ?? "Desconocido",
    cantidad: t._sum.cantidad ?? 0,
    ingresos: Number(t._sum.subtotal ?? 0),
  }));

  // Llenar horas faltantes con 0 para el gráfico (0–23)
  const horaMap = new Map(pedidosPorHora.map((r) => [r.hora, r.cantidad]));
  const pedidosPorHoraCompleto = Array.from({ length: 24 }, (_, h) => ({
    hora: h,
    cantidad: horaMap.get(h) ?? 0,
  }));

  const totalActual = Number(resumen._sum.total ?? 0);
  const totalPrevio = Number(resumenPrevio._sum.total ?? 0);
  const cambio =
    totalPrevio > 0 ? ((totalActual - totalPrevio) / totalPrevio) * 100 : null;

  const cantidadActual = resumen._count._all;
  const cantidadPrevio = resumenPrevio._count._all;
  const cambioPedidos =
    cantidadPrevio > 0
      ? ((cantidadActual - cantidadPrevio) / cantidadPrevio) * 100
      : null;

  return NextResponse.json({
    ok: true,
    data: {
      periodo,
      ventas: {
        total: totalActual,
        pedidos: cantidadActual,
        ticketPromedio: Number(resumen._avg.total ?? 0),
        cambio,
        cambioPedidos,
        previo: { total: totalPrevio, pedidos: cantidadPrevio },
      },
      topPlatos,
      pedidosPorHora: pedidosPorHoraCompleto,
      splitTipo: splitTipo.map((s) => ({
        tipo: s.tipo,
        cantidad: s._count._all,
        total: Number(s._sum.total ?? 0),
      })),
      ultimosClientes: ultimosClientes.map((c) => ({
        ...c,
        gasto_total: parseFloat(c.gasto_total),
      })),
    },
  });
}
