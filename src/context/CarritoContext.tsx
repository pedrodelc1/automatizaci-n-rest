"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { type Producto } from "@prisma/client";

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  notasItem?: string | null;
}

interface CarritoContextType {
  items: ItemCarrito[];
  totalItems: number;
  totalPrecio: number;
  agregar: (producto: Producto) => void;
  quitar: (productoId: number) => void;
  cambiarCantidad: (productoId: number, cantidad: number) => void;
  actualizarNotas: (productoId: number, notas: string) => void;
  vaciar: () => void;
}

const CarritoContext = createContext<CarritoContextType | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItems(data: any[]): ItemCarrito[] {
  return data.map((i) => ({
    producto: i.producto,
    cantidad: i.cantidad,
    notasItem: i.notasItem,
  }));
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);

  // Cargar carrito al montar
  useEffect(() => {
    fetch("/api/carrito")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setItems(mapItems(d.data)); })
      .catch(() => {});
  }, []);

  // Sincroniza el estado local con la respuesta del servidor
  const sync = useCallback(async (fn: () => Promise<Response>) => {
    try {
      const res = await fn();
      const data = await res.json();
      if (data.ok) setItems(mapItems(data.data));
    } catch {}
  }, []);

  const agregar = useCallback(
    (producto: Producto) => {
      sync(() =>
        fetch("/api/carrito", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productoId: producto.id }),
        })
      );
    },
    [sync]
  );

  const quitar = useCallback(
    (productoId: number) => {
      sync(() => fetch(`/api/carrito/${productoId}`, { method: "DELETE" }));
    },
    [sync]
  );

  const cambiarCantidad = useCallback(
    (productoId: number, cantidad: number) => {
      if (cantidad <= 0) {
        quitar(productoId);
        return;
      }
      sync(() =>
        fetch(`/api/carrito/${productoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cantidad }),
        })
      );
    },
    [sync, quitar]
  );

  const actualizarNotas = useCallback(
    (productoId: number, notas: string) => {
      sync(() =>
        fetch(`/api/carrito/${productoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notasItem: notas }),
        })
      );
    },
    [sync]
  );

  const vaciar = useCallback(() => {
    sync(() => fetch("/api/carrito", { method: "DELETE" }));
  }, [sync]);

  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0);
  const totalPrecio = items.reduce(
    (sum, i) => sum + Number(i.producto.precio) * i.cantidad,
    0
  );

  return (
    <CarritoContext.Provider
      value={{
        items,
        totalItems,
        totalPrecio,
        agregar,
        quitar,
        cambiarCantidad,
        actualizarNotas,
        vaciar,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito(): CarritoContextType {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de CarritoProvider");
  return ctx;
}
