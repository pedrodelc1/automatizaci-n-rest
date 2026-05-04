import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { imprimirTicket } from "@/lib/printer";
import { esAdminAutorizado } from "@/lib/admin-auth";

export async function GET(
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
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: { items: { include: { producto: true } } },
    });

    if (!pedido) {
      return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: pedido });
  } catch (error) {
    console.error("[GET /api/pedidos/[id]]", error);
    return NextResponse.json({ ok: false, error: "Error al obtener el pedido" }, { status: 500 });
  }
}

// POST /api/pedidos/[id]/reimprimir — para el admin
export async function POST(
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
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: { items: { include: { producto: true } } },
    });

    if (!pedido) {
      return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
    }

    await imprimirTicket(pedido);
    return NextResponse.json({ ok: true, message: "Reimpresión enviada" });
  } catch (error) {
    console.error("[POST /api/pedidos/[id]/reimprimir]", error);
    return NextResponse.json({ ok: false, error: "Error al reimprimir" }, { status: 500 });
  }
}
