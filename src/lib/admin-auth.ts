import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

const COOKIE_NAME = "admin_session";

export function verificarAdminServer() {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (session?.value !== process.env.ADMIN_PASSWORD) {
    redirect("/admin/login");
  }
}

export function esAdminAutorizado(req: NextRequest): boolean {
  // Acepta el header x-admin-key (acceso programático) o la cookie HttpOnly (panel web)
  const headerKey = req.headers.get("x-admin-key");
  if (headerKey && headerKey === process.env.ADMIN_PASSWORD) return true;

  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  return session?.value === process.env.ADMIN_PASSWORD;
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}
