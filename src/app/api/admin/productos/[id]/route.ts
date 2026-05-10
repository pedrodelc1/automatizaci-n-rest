import { NextRequest, NextResponse } from "next/server";
import { esAdminAutorizado } from "@/lib/admin-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";


const updateSchema = z.object({
  nombre: z.string().min(2).max(200).optional(),
  descripcion: z.string().max(500).optional(),
  precio: z.number().positive().optional(),
  precioCarrito: z.number().positive().nullable().optional(),
  imagenUrl: z.string().url().optional().or(z.literal("")).optional(),
  categoriaId: z.number().int().positive().optional(),
  disponible: z.boolean().optional(),
  destacado: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!esAdminAutorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const id = parseInt(params.id);
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const producto = await prisma.producto.update({
      where: { id },
      data: {
        ...parsed.data,
        imagenUrl: parsed.data.imagenUrl === "" ? null : parsed.data.imagenUrl,
        // precioCarrito: null quita el precio especial; undefined = sin cambio
        precioCarrito: parsed.data.precioCarrito === undefined ? undefined : (parsed.data.precioCarrito ?? null),
      },
    });
    return NextResponse.json({ ok: true, data: producto });
  } catch {
    return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!esAdminAutorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const id = parseInt(params.id);
  try {
    await prisma.producto.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });
  }
}
