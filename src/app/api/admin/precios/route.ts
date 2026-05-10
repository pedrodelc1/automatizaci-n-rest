import { NextRequest, NextResponse } from "next/server";
import { esAdminAutorizado } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  porcentaje: z.number().min(0.1).max(500),
  categoriaId: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  if (!esAdminAutorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const categorias = await prisma.categoria.findMany({
    where: { activo: true },
    orderBy: { orden: "asc" },
    include: {
      productos: {
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, precio: true, disponible: true },
      },
    },
  });

  return NextResponse.json({ ok: true, data: categorias });
}

export async function POST(req: NextRequest) {
  if (!esAdminAutorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { porcentaje, categoriaId } = parsed.data;
  const factor = 1 + porcentaje / 100;

  try {
    // Obtener productos a actualizar
    const whereClause = categoriaId ? { categoriaId } : {};
    const productos = await prisma.producto.findMany({
      where: whereClause,
      select: { id: true, precio: true },
    });

    // Actualizar cada producto con el nuevo precio redondeado al entero más cercano
    await prisma.$transaction(
      productos.map((p) =>
        prisma.producto.update({
          where: { id: p.id },
          data: { precio: Math.round(Number(p.precio) * factor) },
        })
      )
    );

    // Registrar en el historial
    const categoriaNombre = categoriaId
      ? (await prisma.categoria.findUnique({ where: { id: categoriaId }, select: { nombre: true } }))?.nombre
      : null;

    await prisma.historialPrecio.create({
      data: {
        porcentaje,
        categoriaId: categoriaId ?? null,
        descripcion: categoriaNombre
          ? `+${porcentaje}% en categoría "${categoriaNombre}" (${productos.length} productos)`
          : `+${porcentaje}% en todos los productos (${productos.length} productos)`,
      },
    });

    return NextResponse.json({ ok: true, actualizados: productos.length });
  } catch (error) {
    console.error("[POST /api/admin/precios]", error);
    return NextResponse.json({ ok: false, error: "Error al actualizar precios" }, { status: 500 });
  }
}
