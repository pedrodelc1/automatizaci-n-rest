import { NextRequest, NextResponse } from "next/server";
import { esAdminAutorizado } from "@/lib/admin-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";


const updateSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  descripcion: z.string().max(300).optional(),
  orden: z.number().int().optional(),
  activo: z.boolean().optional(),
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
    const categoria = await prisma.categoria.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ ok: true, data: categoria });
  } catch {
    return NextResponse.json({ ok: false, error: "Categoría no encontrada" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!esAdminAutorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const id = parseInt(params.id);
  try {
    await prisma.categoria.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Categoría no encontrada o tiene productos" }, { status: 400 });
  }
}
