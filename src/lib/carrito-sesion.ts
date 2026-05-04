import { prisma } from "./prisma";

export const COOKIE_CARRITO = "cid";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: TTL_MS / 1000,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function obtenerSesionActiva(id: string | null | undefined) {
  if (!id) return null;
  return prisma.sesionCarrito.findFirst({
    where: { id, expiraEn: { gt: new Date() } },
  });
}

export async function crearSesion() {
  // Limpieza lazy de sesiones expiradas
  prisma.sesionCarrito
    .deleteMany({ where: { expiraEn: { lt: new Date() } } })
    .catch(() => {});
  return prisma.sesionCarrito.create({
    data: { expiraEn: new Date(Date.now() + TTL_MS) },
  });
}
