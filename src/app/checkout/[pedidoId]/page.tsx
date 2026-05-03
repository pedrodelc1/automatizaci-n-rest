"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { AlertCircle } from "lucide-react";

export default function CheckoutPage() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "failure") {
      setError("El pago fue rechazado. Podés intentarlo de nuevo.");
      setCargando(false);
      return;
    }

    async function iniciarPago() {
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pedidoId: parseInt(pedidoId) }),
        });

        const data = await res.json();
        if (!data.ok) {
          setError(data.error ?? "Error al iniciar el pago");
          setCargando(false);
          return;
        }

        const url = data.data.checkoutUrl;

        window.location.href = url;
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
        setCargando(false);
      }
    }

    iniciarPago();
  }, [pedidoId, status]);

  if (cargando) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-cream-50 dark:bg-[#0D0C0A]">
        <Spinner className="w-9 h-9 text-orange-500" />
        <div className="text-center">
          <p className="font-display text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            Redirigiendo a MercadoPago
          </p>
          <p className="text-neutral-400 text-sm mt-1">Un momento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 bg-cream-50 dark:bg-[#0D0C0A]">
      <div className="card p-8 max-w-sm w-full text-center space-y-5">
        <div
          className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto"
        >
          <AlertCircle size={30} className="text-red-500" />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Pago no completado
          </h1>
          <p className="text-neutral-400 text-[13px] mt-2 leading-relaxed">{error}</p>
        </div>
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={() => window.location.reload()}
            className="btn-primary w-full"
          >
            Reintentar pago
          </button>
          <Link href="/" className="btn-secondary w-full text-center">
            Volver al menú
          </Link>
        </div>
      </div>
    </div>
  );
}
