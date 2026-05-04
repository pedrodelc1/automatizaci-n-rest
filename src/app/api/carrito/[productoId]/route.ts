import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { COOKIE_CARRITO, obtenerSesionActiva } from "@/lib/carrito-sesion";

const updateSchema = z.object({
  cantidad: z.number().int().min(0).max(50).optional(),
  notasItem: z.string().max(200).optional(),
});

async function itemsConProducto(sesionId: string) {
  return prisma.itemCarritoSesion.findMany({
    where: { sesionId },
    include: { producto: true },
    orderBy: { id: "asc" },
  });
}

// PUT /api/carrito/[productoId] — actualizar cantidad y/o notas
export async function PUT(
  req: NextRequest,
  { params }: { params: { productoId: string } }
) {
  const productoId = parseInt(params.productoId);
  if (isNaN(productoId)) {
    return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const sesionId = req.cookies.get(COOKIE_CARRITO)?.value;
  const sesion = await obtenerSesionActiva(sesionId);
  if (!sesion) {
    return NextResponse.json({ ok: true, data: [] });
  }

  const { cantidad, notasItem } = parsed.data;

  // Si cantidad es 0, eliminar el item
  if (cantidad === 0) {
    await prisma.itemCarritoSesion.deleteMany({
      where: { sesionId: sesion.id, productoId },
    });
    const items = await itemsConProducto(sesion.id);
    return NextResponse.json({ ok: true, data: items });
  }

  await prisma.itemCarritoSesion.updateMany({
    where: { sesionId: sesion.id, productoId },
    data: {
      ...(cantidad !== undefined && { cantidad }),
      ...(notasItem !== undefined && { notasItem }),
    },
  });

  const items = await itemsConProducto(sesion.id);
  return NextResponse.json({ ok: true, data: items });
}

// DELETE /api/carrito/[productoId] — quitar un producto del carrito
export async function DELETE(
  req: NextRequest,
  { params }: { params: { productoId: string } }
) {
  const productoId = parseInt(params.productoId);
  if (isNaN(productoId)) {
    return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  }

  const sesionId = req.cookies.get(COOKIE_CARRITO)?.value;
  const sesion = await obtenerSesionActiva(sesionId);
  if (!sesion) {
    return NextResponse.json({ ok: true, data: [] });
  }

  await prisma.itemCarritoSesion.deleteMany({
    where: { sesionId: sesion.id, productoId },
  });

  const items = await itemsConProducto(sesion.id);
  return NextResponse.json({ ok: true, data: items });
}
