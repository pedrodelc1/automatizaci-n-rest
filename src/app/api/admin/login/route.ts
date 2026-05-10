import { NextRequest, NextResponse } from "next/server";
import { getAdminCookieName, getSessionToken } from "@/lib/admin-auth";

// Rate limiting en memoria — válido para instancia única en Railway
const intentos = new Map<string, { count: number; desde: number }>();
const MAX_INTENTOS = 10;
const VENTANA_MS = 15 * 60 * 1000; // 15 minutos

function getIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function checkRateLimit(ip: string): boolean {
  const ahora = Date.now();
  const record = intentos.get(ip);

  if (!record || ahora - record.desde > VENTANA_MS) {
    intentos.set(ip, { count: 1, desde: ahora });
    return true;
  }
  if (record.count >= MAX_INTENTOS) return false;
  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: "Demasiados intentos. Esperá 15 minutos." },
      { status: 429 }
    );
  }

  let password: string;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta" }, { status: 401 });
  }

  // Limpiar intentos fallidos tras login exitoso
  intentos.delete(ip);

  const res = NextResponse.json({ ok: true });
  // Cookie contiene un token HMAC opaco — nunca la contraseña en crudo
  res.cookies.set(getAdminCookieName(), getSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: "/",
  });
  return res;
}
