import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  COOKIE_CARRITO,
  cookieOpts,
  obtenerSesionActiva,
  crearSesion,
} from "@/lib/carrito-sesion";

const addSchema = z.object({
  productoId: z.number().int().positive(),
  esCrossSell: z.boolean().default(false),
});

async function itemsConProducto(sesionId: string) {
  return prisma.itemCarritoSesion.findMany({
    where: { sesionId },
    include: { producto: true },
    orderBy: { id: "asc" },
  });
}

// GET /api/carrito — obtener items del carrito actual
export async function GET(req: NextRequest) {
  const sesionId = req.cookies.get(COOKIE_CARRITO)?.value;
  const sesion = await obtenerSesionActiva(sesionId);
  if (!sesion) return NextResponse.json({ ok: true, data: [] });

  const items = await itemsConProducto(sesion.id);
  return NextResponse.json({ ok: true, data: items });
}

// POST /api/carrito — agregar 1 unidad de un producto
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { productoId, esCrossSell } = parsed.data;

  const producto = await prisma.producto.findFirst({
    where: { id: productoId, disponible: true },
  });
  if (!producto) {
    return NextResponse.json(
      { ok: false, error: "Producto no disponible" },
      { status: 400 }
    );
  }

  const sesionId = req.cookies.get(COOKIE_CARRITO)?.value;
  let sesion = await obtenerSesionActiva(sesionId);
  let nueva = false;

  if (!sesion) {
    sesion = await crearSesion();
    nueva = true;
  }

  await prisma.itemCarritoSesion.upsert({
    where: { sesionId_productoId: { sesionId: sesion.id, productoId } },
    // Si es cross-sell y el item no existía, marcarlo; si ya existía, no cambiar el flag
    create: { sesionId: sesion.id, productoId, cantidad: 1, esCrossSell },
    update: { cantidad: { increment: 1 } },
  });

  const items = await itemsConProducto(sesion.id);
  const res = NextResponse.json({ ok: true, data: items });
  if (nueva) res.cookies.set(COOKIE_CARRITO, sesion.id, cookieOpts());
  return res;
}

// DELETE /api/carrito — vaciar carrito
export async function DELETE(req: NextRequest) {
  const sesionId = req.cookies.get(COOKIE_CARRITO)?.value;
  if (sesionId) {
    await prisma.sesionCarrito.deleteMany({ where: { id: sesionId } }).catch(() => {});
  }
  const res = NextResponse.json({ ok: true, data: [] });
  res.cookies.delete(COOKIE_CARRITO);
  return res;
}
