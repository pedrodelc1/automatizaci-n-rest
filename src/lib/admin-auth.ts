import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

const COOKIE_NAME = "admin_session";
const TOKEN_VERSION = "v1";

// Genera el token de sesión como HMAC(ADMIN_PASSWORD, version)
// — la contraseña nunca se guarda en la cookie, solo su firma opaca
function generarSessionToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? "";
  return createHmac("sha256", secret).update(TOKEN_VERSION).digest("hex");
}

function validarToken(value: string): boolean {
  const expected = generarSessionToken();
  try {
    return timingSafeEqual(Buffer.from(value, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function getSessionToken(): string {
  return generarSessionToken();
}

export function verificarAdminServer() {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session?.value || !validarToken(session.value)) {
    redirect("/admin/login");
  }
}

export function esAdminAutorizado(req: NextRequest): boolean {
  // Header x-admin-key: acepta la contraseña directa (uso programático interno)
  const headerKey = req.headers.get("x-admin-key");
  if (headerKey) {
    try {
      const expected = Buffer.from(process.env.ADMIN_PASSWORD ?? "");
      const actual   = Buffer.from(headerKey);
      if (expected.length === actual.length && timingSafeEqual(expected, actual)) return true;
    } catch {
      return false;
    }
  }

  // Cookie: valida el token opaco
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  return !!session?.value && validarToken(session.value);
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}
