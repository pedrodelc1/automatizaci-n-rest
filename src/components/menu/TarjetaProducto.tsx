"use client";

import Image from "next/image";
import { Plus, Minus } from "lucide-react";
import { useState } from "react";
import { type Producto } from "@prisma/client";
import { useCarrito } from "@/context/CarritoContext";
import toast from "react-hot-toast";
import { clsx } from "clsx";

function getEmoji(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes("empanada")) return "🥟";
  if (n.includes("milanesa")) return "🍖";
  if (n.includes("hamburguesa")) return "🍔";
  if (n.includes("pollo")) return "🍗";
  if (n.includes("pasta") || n.includes("fideos") || n.includes("spaghetti")) return "🍝";
  if (n.includes("pizza")) return "🍕";
  if (n.includes("ensalada")) return "🥗";
  if (n.includes("cerveza")) return "🍺";
  if (n.includes("gaseosa") || n.includes("coca") || n.includes("sprite")) return "🥤";
  if (n.includes("agua")) return "💧";
  if (n.includes("vino")) return "🍷";
  if (n.includes("café") || n.includes("cafe")) return "☕";
  if (n.includes("brownie") || n.includes("chocolate")) return "🍫";
  if (n.includes("helado")) return "🍦";
  if (n.includes("flan") || n.includes("postre")) return "🍮";
  if (n.includes("tabla") || n.includes("fiambre")) return "🧀";
  if (n.includes("sandwich") || n.includes("sánguche")) return "🥪";
  if (n.includes("papas") || n.includes("fritas")) return "🍟";
  return "🍽️";
}

export function TarjetaProducto({ producto }: { producto: Producto }) {
  const { agregar, cambiarCantidad, items } = useCarrito();
  const [animando, setAnimando] = useState(false);

  const enCarrito = items.find((i) => i.producto.id === producto.id);

  function handleAgregar() {
    agregar(producto);
    toast.success(`${producto.nombre} agregado`);
    setAnimando(true);
    setTimeout(() => setAnimando(false), 300);
  }

  return (
    <div className={clsx(
      "flex items-center gap-4 px-3 py-4 rounded-2xl transition-all duration-200 group",
      "hover:bg-cream-50 dark:hover:bg-neutral-800/40"
    )}>
      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-[15px] leading-snug tracking-[-0.01em]">
            {producto.nombre}
          </h3>
          {producto.destacado && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-700/30 flex-shrink-0">
              ★ Popular
            </span>
          )}
        </div>
        {producto.descripcion && (
          <p className="text-neutral-400 dark:text-neutral-500 text-[13px] leading-relaxed line-clamp-2">
            {producto.descripcion}
          </p>
        )}
        <div className="flex items-center justify-between pt-1.5">
          <span className="display-price text-[18px]">
            ${Number(producto.precio).toLocaleString("es-AR")}
          </span>

          {enCarrito ? (
            <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/40 rounded-xl px-1.5 py-1.5">
              <button
                onClick={() => cambiarCantidad(producto.id, enCarrito.cantidad - 1)}
                className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-800 flex items-center justify-center text-orange-500 hover:bg-orange-50 transition-colors"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
              >
                <Minus size={12} strokeWidth={3} />
              </button>
              <span className="w-6 text-center font-bold text-sm text-orange-600 dark:text-orange-400 font-display">
                {enCarrito.cantidad}
              </span>
              <button
                onClick={handleAgregar}
                className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white hover:bg-orange-600 transition-colors"
                style={{ boxShadow: "0 1px 4px rgba(249,115,22,0.35)" }}
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAgregar}
              className={clsx(
                "flex items-center gap-1.5 text-[13px] font-bold px-4 py-2 rounded-xl transition-all duration-200 select-none",
                "bg-orange-500 text-white hover:bg-orange-600",
                animando && "scale-95"
              )}
              style={{ boxShadow: "0 2px 8px rgba(249,115,22,0.30)" }}
            >
              <Plus size={13} strokeWidth={3} />
              Agregar
            </button>
          )}
        </div>
      </div>

      {/* Imagen */}
      <div className="relative w-[88px] h-[88px] flex-shrink-0 rounded-2xl overflow-hidden">
        {producto.imagenUrl ? (
          <Image
            src={producto.imagenUrl}
            alt={producto.nombre}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="88px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-neutral-800 dark:to-neutral-700/80 text-[2.2rem]">
            {getEmoji(producto.nombre)}
          </div>
        )}
      </div>
    </div>
  );
}
