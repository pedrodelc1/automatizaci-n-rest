import { NextRequest, NextResponse } from "next/server";
import { esAdminAutorizado } from "@/lib/admin-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";


const categoriaSchema = z.object({
  nombre: z.string().min(2).max(100),
  descripcion: z.string().max(300).optional(),
  orden: z.number().int().default(0),
  activo: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  if (!esAdminAutorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const categorias = await prisma.categoria.findMany({
    orderBy: { orden: "asc" },
    include: { _count: { select: { productos: true } } },
  });
  return NextResponse.json({ ok: true, data: categorias });
}

export async function POST(req: NextRequest) {
  if (!esAdminAutorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json();
  const parsed = categoriaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const categoria = await prisma.categoria.create({ data: parsed.data });
  return NextResponse.json({ ok: true, data: categoria }, { status: 201 });
}
