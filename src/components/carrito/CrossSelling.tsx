"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Check, Sparkles, Tag } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";

interface ProductoRec {
  id: number;
  nombre: string;
  precio: string;
  precioCarrito: string | null;
  imagenUrl: string | null;
  categoria: { nombre: string };
}

interface Recomendacion {
  producto: ProductoRec;
  contexto: "bebida" | "postre";
  mensaje: string;
}

interface CrossSellingProps {
  nombreCliente: string;
  onAgregado: () => void; // para refrescar el carrito padre
}

function fmt(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function TarjetaRec({
  rec,
  onAgregar,
}: {
  rec: Recomendacion;
  onAgregar: (id: number) => Promise<void>;
}) {
  const [estado, setEstado] = useState<"idle" | "cargando" | "listo">("idle");

  const precio = Number(rec.producto.precio);
  const precioPromo = rec.producto.precioCarrito ? Number(rec.producto.precioCarrito) : null;
  const tienePromo = precioPromo !== null && precioPromo < precio;

  async function handleAgregar() {
    if (estado !== "idle") return;
    setEstado("cargando");
    try {
      await onAgregar(rec.producto.id);
      setEstado("listo");
    } catch {
      setEstado("idle");
      toast.error("No pudimos agregar el producto");
    }
  }

  return (
    <div className={clsx(
      "flex items-center gap-3 p-3 rounded-2xl border transition-all",
      tienePromo
        ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40"
        : "bg-white dark:bg-neutral-800/60 border-neutral-100 dark:border-neutral-700/60"
    )}>
      {/* Imagen o placeholder */}
      {rec.producto.imagenUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={rec.producto.imagenUrl}
          alt={rec.producto.nombre}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0 text-2xl">
          {rec.contexto === "bebida" ? "🥤" : "🍮"}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-[13px] truncate">
          {rec.producto.nombre}
        </p>
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{rec.producto.categoria.nombre}</p>
        <div className="flex items-baseline gap-1.5 mt-1">
          {tienePromo ? (
            <>
              <span className="font-bold text-orange-500 text-[13px]">${fmt(precioPromo!)}</span>
              <span className="text-neutral-400 line-through text-[11px]">${fmt(precio)}</span>
              <span className="text-[10px] font-bold text-orange-500 bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Tag size={8} /> Solo carrito
              </span>
            </>
          ) : (
            <span className="font-semibold text-neutral-700 dark:text-neutral-300 text-[13px]">${fmt(precio)}</span>
          )}
        </div>
      </div>

      {/* Botón */}
      <button
        onClick={handleAgregar}
        disabled={estado !== "idle"}
        className={clsx(
          "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
          estado === "listo"
            ? "bg-emerald-500 text-white"
            : estado === "cargando"
            ? "bg-orange-200 dark:bg-orange-900/40 text-orange-400 cursor-wait"
            : "bg-orange-500 hover:bg-orange-600 text-white active:scale-95"
        )}
      >
        {estado === "listo" ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
      </button>
    </div>
  );
}

export function CrossSelling({ nombreCliente, onAgregado }: CrossSellingProps) {
  const [recs, setRecs] = useState<Recomendacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [visible, setVisible] = useState(false);

  const fetchRecs = useCallback(async () => {
    try {
      const params = nombreCliente.trim()
        ? `?nombre=${encodeURIComponent(nombreCliente.trim())}`
        : "";
      const res = await fetch(`/api/recomendaciones${params}`);
      const data = await res.json();
      if (data.ok && data.data.length > 0) {
        setRecs(data.data);
        setVisible(true);
      } else {
        setVisible(false);
      }
    } catch {
      setVisible(false);
    } finally {
      setCargando(false);
    }
  }, [nombreCliente]);

  useEffect(() => { fetchRecs(); }, [fetchRecs]);

  async function agregarCrossSell(productoId: number) {
    const res = await fetch("/api/carrito", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productoId, esCrossSell: true }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    onAgregado();
    toast.success("¡Agregado al pedido!");
  }

  if (cargando || !visible || recs.length === 0) return null;

  // Usar el mensaje de la primera recomendación como texto principal
  const mensajePrincipal = recs[0].mensaje;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-orange-400" />
          <span className="label-caps text-orange-500">Para completar tu pedido</span>
        </div>
        <p className="text-[14px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
          {mensajePrincipal}
        </p>
      </div>

      {/* Tarjetas */}
      <div className="px-4 pb-4 space-y-2">
        {recs.map((rec) => (
          <TarjetaRec key={rec.producto.id} rec={rec} onAgregar={agregarCrossSell} />
        ))}
      </div>
    </div>
  );
}
