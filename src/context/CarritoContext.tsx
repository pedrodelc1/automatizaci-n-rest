"use client";

import { createContext, useContext, useEffect, useReducer, ReactNode } from "react";
import { type Producto } from "@prisma/client";

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  notasItem?: string;
}

interface CarritoState {
  items: ItemCarrito[];
}

type CarritoAction =
  | { type: "AGREGAR"; producto: Producto }
  | { type: "QUITAR"; productoId: number }
  | { type: "CAMBIAR_CANTIDAD"; productoId: number; cantidad: number }
  | { type: "ACTUALIZAR_NOTAS"; productoId: number; notas: string }
  | { type: "VACIAR" };

function carritoReducer(state: CarritoState, action: CarritoAction): CarritoState {
  switch (action.type) {
    case "AGREGAR": {
      const existe = state.items.find((i) => i.producto.id === action.producto.id);
      if (existe) {
        return {
          items: state.items.map((i) =>
            i.producto.id === action.producto.id
              ? { ...i, cantidad: i.cantidad + 1 }
              : i
          ),
        };
      }
      return { items: [...state.items, { producto: action.producto, cantidad: 1 }] };
    }
    case "QUITAR":
      return { items: state.items.filter((i) => i.producto.id !== action.productoId) };
    case "CAMBIAR_CANTIDAD": {
      if (action.cantidad <= 0) {
        return { items: state.items.filter((i) => i.producto.id !== action.productoId) };
      }
      return {
        items: state.items.map((i) =>
          i.producto.id === action.productoId ? { ...i, cantidad: action.cantidad } : i
        ),
      };
    }
    case "ACTUALIZAR_NOTAS":
      return {
        items: state.items.map((i) =>
          i.producto.id === action.productoId ? { ...i, notasItem: action.notas } : i
        ),
      };
    case "VACIAR":
      return { items: [] };
    default:
      return state;
  }
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

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(carritoReducer, { items: [] }, (initial) => {
    // Hidratar desde localStorage al montar
    if (typeof window === "undefined") return initial;
    try {
      const saved = localStorage.getItem("carrito");
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });

  // Persistir en localStorage ante cualquier cambio
  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(state));
  }, [state]);

  const totalItems = state.items.reduce((sum, i) => sum + i.cantidad, 0);
  const totalPrecio = state.items.reduce(
    (sum, i) => sum + Number(i.producto.precio) * i.cantidad,
    0
  );

  return (
    <CarritoContext.Provider
      value={{
        items: state.items,
        totalItems,
        totalPrecio,
        agregar: (producto) => dispatch({ type: "AGREGAR", producto }),
        quitar: (productoId) => dispatch({ type: "QUITAR", productoId }),
        cambiarCantidad: (productoId, cantidad) =>
          dispatch({ type: "CAMBIAR_CANTIDAD", productoId, cantidad }),
        actualizarNotas: (productoId, notas) =>
          dispatch({ type: "ACTUALIZAR_NOTAS", productoId, notas }),
        vaciar: () => dispatch({ type: "VACIAR" }),
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
