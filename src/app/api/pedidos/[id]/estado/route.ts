import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { imprimirTicket } from "@/lib/printer";
import { notificar, type EventoTipo } from "@/lib/notificaciones";
import { esAdminAutorizado } from "@/lib/admin-auth";
import { EstadoPedido } from "@prisma/client";

const schema = z.object({
  estado: z.nativeEnum(EstadoPedido),
});

// Mapeo de estado → evento N8N
const ESTADO_A_EVENTO: Partial<Record<EstadoPedido, EventoTipo>> = {
  [EstadoPedido.EN_PREPARACION]: "pedido.en_preparacion",
  [EstadoPedido.LISTO]:          "pedido.listo",
  [EstadoPedido.ENTREGADO]:      "pedido.entregado",
  [EstadoPedido.CANCELADO]:      "pedido.cancelado",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!esAdminAutorizado(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const nuevoEstado = parsed.data.estado;
    const pedido = await prisma.pedido.update({
      where: { id },
      data: { estado: nuevoEstado },
      include: { items: { include: { producto: true } } },
    });

    // Imprimir si se confirma manualmente
    if (nuevoEstado === EstadoPedido.CONFIRMADO) {
      imprimirTicket(pedido).catch((e) =>
        console.error("[PATCH estado] Error de impresión:", e)
      );
    }

    // Notificar a N8N según el estado
    const evento = ESTADO_A_EVENTO[nuevoEstado];
    if (evento) {
      notificar(evento, pedido).catch(() => {});
    }

    return NextResponse.json({ ok: true, data: pedido });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
    }
    console.error("[PATCH /api/pedidos/estado]", error);
    return NextResponse.json({ ok: false, error: "Error al actualizar el pedido" }, { status: 500 });
  }
}
