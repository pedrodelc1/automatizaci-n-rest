import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_CARRITO, obtenerSesionActiva } from "@/lib/carrito-sesion";

// Keywords para detectar categorías de bebidas y postres en español/inglés
const KW_BEBIDA = ["gaseosa", "bebida", "trago", "cerveza", "vino", "agua", "jugo", "refresco", "drink", "cola", "fanta", "sprite"];
const KW_POSTRE = ["postre", "dulce", "torta", "helado", "alfajor", "budín", "flan", "dessert", "mousse", "brownie", "tiramisu"];

function matchKw(texto: string, keywords: string[]): boolean {
  const lower = texto.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function primerNombre(nombre: string | null | undefined): string | null {
  if (!nombre?.trim()) return null;
  return nombre.trim().split(/\s+/)[0];
}

function fmt(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function generarMensaje(
  contexto: "bebida" | "postre",
  producto: { nombre: string; precio: { toNumber(): number } | string | number; precioCarrito: { toNumber(): number } | string | number | null },
  hora: number,
  nombreCliente: string | null
): string {
  const nombre = primerNombre(nombreCliente);
  const esAlmuerzo = hora >= 11 && hora < 15;
  const esCena = hora >= 19 && hora < 23;
  const esTarde = hora >= 15 && hora < 19;
  const esManana = hora >= 6 && hora < 11;

  const precioOriginal = typeof producto.precio === "object" ? producto.precio.toNumber() : Number(producto.precio);
  const precioPromo = producto.precioCarrito
    ? (typeof producto.precioCarrito === "object" ? producto.precioCarrito.toNumber() : Number(producto.precioCarrito))
    : null;
  const tienePromo = precioPromo !== null && precioPromo < precioOriginal;

  const promoStr = tienePromo
    ? ` Y si lo sumás ahora, te sale $${fmt(precioPromo!)} en lugar de $${fmt(precioOriginal)} — precio exclusivo del carrito.`
    : "";

  if (contexto === "bebida") {
    if (nombre) {
      if (esAlmuerzo) return `${nombre}, ¿almorzás sin tomar nada? El ${producto.nombre} va perfecto con tu pedido.${promoStr}`;
      if (esCena) return `${nombre}, la cena pide algo para tomar. Sumá un ${producto.nombre}.${promoStr}`;
      if (esTarde) return `${nombre}, ¿sin bebida a esta hora? El ${producto.nombre} lo soluciona.${promoStr}`;
      if (esManana) return `${nombre}, ¿empezás el día sin tomar nada? Sumá un ${producto.nombre}.${promoStr}`;
      return `${nombre}, falta una bebida para completar el pedido. ¿Sumás ${producto.nombre}?${promoStr}`;
    }
    if (esAlmuerzo) return `El almuerzo pide algo para tomar. ${producto.nombre} es el complemento ideal.${promoStr}`;
    if (esCena) return `Cena sin bebida no es lo mismo — ${producto.nombre} cierra el pedido perfectamente.${promoStr}`;
    if (esTarde) return `Para la tarde siempre viene bien una bebida. ${producto.nombre} está esperando.${promoStr}`;
    return `¿Sin bebida? El ${producto.nombre} completa el pedido.${promoStr}`;
  }

  // postre
  if (nombre) {
    if (esAlmuerzo) return `${nombre}, ¿cerrás el almuerzo con algo dulce? El ${producto.nombre} es el cierre ideal.${promoStr}`;
    if (esCena) return `${nombre}, la cena merece un buen cierre. ¿Le sumás ${producto.nombre}?${promoStr}`;
    return `${nombre}, ¿no cerrás con algo dulce? El ${producto.nombre} es el match perfecto para tu pedido.${promoStr}`;
  }
  if (esAlmuerzo) return `El mejor cierre para el almuerzo — ${producto.nombre} antes de volver al laburo.${promoStr}`;
  if (esCena) return `Noche sin postre no es noche. ${producto.nombre} está esperando para cerrar.${promoStr}`;
  return `¿Y de postre? El ${producto.nombre} es el match perfecto para tu pedido.${promoStr}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nombreCliente = searchParams.get("nombre") ?? null;
  const hora = new Date().getHours();

  // Leer el carrito actual
  const sesionId = req.cookies.get(COOKIE_CARRITO)?.value;
  const sesion = await obtenerSesionActiva(sesionId);

  const cartItems = sesion
    ? await prisma.itemCarritoSesion.findMany({
        where: { sesionId: sesion.id },
        include: { producto: { include: { categoria: true } } },
      })
    : [];

  const cartProductIds = cartItems.map((i) => i.productoId);
  const cartCategorias = cartItems.map((i) => i.producto.categoria.nombre);

  const tieneBebida = cartCategorias.some((c) => matchKw(c, KW_BEBIDA));
  const tienePostre = cartCategorias.some((c) => matchKw(c, KW_POSTRE));

  // Traer todos los productos disponibles que NO están ya en el carrito
  const todosDisponibles = await prisma.producto.findMany({
    where: { disponible: true, id: { notIn: [...cartProductIds] } },
    include: { categoria: true },
    orderBy: { destacado: "desc" },
  });

  // Separar por tipo de categoría
  const candidatosBebida = todosDisponibles.filter((p) =>
    matchKw(p.categoria.nombre, KW_BEBIDA)
  );
  const candidatosPostre = todosDisponibles.filter((p) =>
    matchKw(p.categoria.nombre, KW_POSTRE)
  );

  // Función que elige el mejor candidato: primero los que tienen precioCarrito, luego el resto
  function elegirCandidato<T extends { precioCarrito: unknown }>(lista: T[]): T | null {
    if (lista.length === 0) return null;
    return lista.find((p) => p.precioCarrito !== null) ?? lista[0];
  }

  const recomendaciones: {
    producto: {
      id: number;
      nombre: string;
      precio: string;
      precioCarrito: string | null;
      imagenUrl: string | null;
      categoria: { nombre: string };
    };
    contexto: "bebida" | "postre";
    mensaje: string;
  }[] = [];

  // Prioridad 1: bebida si no tiene y tiene comida en el carrito
  if (!tieneBebida && cartItems.length > 0) {
    const c = elegirCandidato(candidatosBebida);
    if (c) {
      recomendaciones.push({
        producto: {
          id: c.id,
          nombre: c.nombre,
          precio: c.precio.toString(),
          precioCarrito: c.precioCarrito?.toString() ?? null,
          imagenUrl: c.imagenUrl,
          categoria: { nombre: c.categoria.nombre },
        },
        contexto: "bebida",
        mensaje: generarMensaje("bebida", c, hora, nombreCliente),
      });
    }
  }

  // Prioridad 2: postre si no tiene y es hora de almuerzo o cena
  const esHoraComida = (hora >= 11 && hora < 15) || (hora >= 19 && hora < 23);
  if (!tienePostre && cartItems.length > 0 && esHoraComida) {
    const c = elegirCandidato(candidatosPostre);
    if (c) {
      recomendaciones.push({
        producto: {
          id: c.id,
          nombre: c.nombre,
          precio: c.precio.toString(),
          precioCarrito: c.precioCarrito?.toString() ?? null,
          imagenUrl: c.imagenUrl,
          categoria: { nombre: c.categoria.nombre },
        },
        contexto: "postre",
        mensaje: generarMensaje("postre", c, hora, nombreCliente),
      });
    }
  }

  // Si no hay carrito o está vacío, no recomendar nada
  if (cartItems.length === 0) {
    return NextResponse.json({ ok: true, data: [] });
  }

  return NextResponse.json({ ok: true, data: recomendaciones });
}
