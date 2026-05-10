import { NextRequest, NextResponse } from "next/server";
import { esAdminAutorizado } from "@/lib/admin-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";


const productoSchema = z.object({
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(500).optional(),
  precio: z.number().positive(),
  precioCarrito: z.number().positive().nullable().optional(),
  imagenUrl: z.string().url().optional().or(z.literal("")),
  categoriaId: z.number().int().positive(),
  disponible: z.boolean().default(true),
  destacado: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  if (!esAdminAutorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const productos = await prisma.producto.findMany({
    include: { categoria: true },
    orderBy: [{ categoriaId: "asc" }, { nombre: "asc" }],
  });
  return NextResponse.json({ ok: true, data: productos });
}

export async function POST(req: NextRequest) {
  if (!esAdminAutorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json();
  const parsed = productoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const producto = await prisma.producto.create({
    data: {
      ...parsed.data,
      imagenUrl: parsed.data.imagenUrl || null,
      precioCarrito: parsed.data.precioCarrito ?? null,
    },
  });
  return NextResponse.json({ ok: true, data: producto }, { status: 201 });
}
