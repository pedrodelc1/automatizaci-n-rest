"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";

export function BotonCarrito() {
  const { totalItems, totalPrecio } = useCarrito();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-6 inset-x-4 z-50 flex justify-center pointer-events-none">
      <Link
        href="/carrito"
        className="pointer-events-auto flex items-center gap-4 pl-4 pr-2 py-2.5 rounded-2xl w-full max-w-sm transition-all duration-200 active:scale-[0.97] select-none hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(135deg, #110E0A 0%, #1C1814 100%)",
          boxShadow: "0 4px 16px rgba(249,115,22,0.22), 0 16px 48px rgba(0,0,0,0.38), 0 1px 3px rgba(0,0,0,0.3)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
      >
        {/* Ícono */}
        <div className="relative flex-shrink-0">
          <div
            className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center"
            style={{ boxShadow: "0 2px 8px rgba(249,115,22,0.45)" }}
          >
            <ShoppingBag size={17} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#110E0A]">
            {totalItems}
          </span>
        </div>

        <span className="font-bold flex-1 text-white/90 text-[14px] tracking-wide">Ver pedido</span>

        <div
          className="bg-orange-500 text-white font-display font-semibold text-[15px] px-4 py-2 rounded-xl"
          style={{
            boxShadow: "0 2px 8px rgba(249,115,22,0.40)",
            letterSpacing: "-0.01em",
          }}
        >
          ${totalPrecio.toLocaleString("es-AR")}
        </div>
      </Link>
    </div>
  );
}
