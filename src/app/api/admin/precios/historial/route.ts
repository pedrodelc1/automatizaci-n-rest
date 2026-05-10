import { NextRequest, NextResponse } from "next/server";
import { esAdminAutorizado } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!esAdminAutorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const historial = await prisma.historialPrecio.findMany({
    orderBy: { creadoEn: "desc" },
    take: 50,
  });

  return NextResponse.json({ ok: true, data: historial });
}
