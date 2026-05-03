import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categorias = await prisma.categoria.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
      include: {
        productos: {
          where: { disponible: true },
          orderBy: [{ destacado: "desc" }, { nombre: "asc" }],
        },
      },
    });

    // Excluir categorías vacías (todos sus productos desactivados)
    const conProductos = categorias.filter((c) => c.productos.length > 0);

    return NextResponse.json({ ok: true, data: conProductos });
  } catch (error) {
    console.error("[GET /api/menu]", error);
    return NextResponse.json(
      { ok: false, error: "Error al obtener el menú" },
      { status: 500 }
    );
  }
}
