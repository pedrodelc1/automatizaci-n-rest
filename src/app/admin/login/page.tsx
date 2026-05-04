"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error ?? "Contraseña incorrecta");
        return;
      }
      router.push("/admin/pedidos");
      router.refresh();
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-[#0D0C0A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo / título */}
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto"
            style={{ boxShadow: "0 4px 16px rgba(249,115,22,0.35)" }}
          >
            <Lock size={28} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-[-0.02em]">
              Panel de administración
            </h1>
            <p className="text-neutral-400 dark:text-neutral-500 text-sm mt-1">
              Ingresá la contraseña para continuar
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="label-caps">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                autoFocus
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-red-500 dark:text-red-400 text-sm text-center font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando || !password}
              className="btn-primary w-full py-3.5 mt-2"
            >
              {cargando ? (
                <><Spinner className="w-4 h-4" /> Verificando...</>
              ) : (
                "Entrar al panel"
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
