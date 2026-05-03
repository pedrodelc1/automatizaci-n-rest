"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Printer, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { Spinner } from "@/components/ui/Spinner";
import toast from "react-hot-toast";
import { type PedidoConItems } from "@/types";

const ESTADOS = ["PENDIENTE", "CONFIRMADO", "EN_PREPARACION", "LISTO", "ENTREGADO", "CANCELADO"] as const;
type Estado = (typeof ESTADOS)[number];

const ESTADO_LABEL: Record<Estado, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_PREPARACION: "En preparación",
  LISTO: "Listo",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const ESTADO_COLOR: Record<Estado, string> = {
  PENDIENTE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  CONFIRMADO: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  EN_PREPARACION: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  LISTO: "bg-green-500/20 text-green-400 border-green-500/30",
  ENTREGADO: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  CANCELADO: "bg-red-500/20 text-red-400 border-red-500/30",
};

// Estados activos (no terminados) que se muestran por defecto
const ESTADOS_ACTIVOS: Estado[] = ["PENDIENTE", "CONFIRMADO", "EN_PREPARACION", "LISTO"];

export function PedidosCliente() {
  const [pedidos, setPedidos] = useState<PedidoConItems[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<Estado | "ACTIVOS">("ACTIVOS");
  const [actualizando, setActualizando] = useState<number | null>(null);

  const fetchPedidos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const params = filtroEstado === "ACTIVOS" ? "" : `?estado=${filtroEstado}`;
      const res = await fetch(`/api/pedidos${params}`, { credentials: "same-origin" });
      const data = await res.json();
      if (data.ok) setPedidos(data.data);
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [filtroEstado]);

  // Polling cada 15 segundos para "tiempo real" sin WebSockets
  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(() => fetchPedidos(true), 15_000);
    return () => clearInterval(interval);
  }, [fetchPedidos]);

  async function cambiarEstado(pedidoId: number, estado: Estado) {
    setActualizando(pedidoId);
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ estado }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Estado actualizado: ${ESTADO_LABEL[estado]}`);
        fetchPedidos(true);
      } else {
        toast.error(data.error);
      }
    } finally {
      setActualizando(null);
    }
  }

  async function reimprimir(pedidoId: number) {
    setActualizando(pedidoId);
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json();
      toast[data.ok ? "success" : "error"](
        data.ok ? "Reimpresión enviada" : data.error
      );
    } finally {
      setActualizando(null);
    }
  }

  const pedidosFiltrados =
    filtroEstado === "ACTIVOS"
      ? pedidos.filter((p) => ESTADOS_ACTIVOS.includes(p.estado as Estado))
      : pedidos;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Pedidos</h1>
        <button
          onClick={() => fetchPedidos()}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={15} className={cargando ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(["ACTIVOS", ...ESTADOS] as const).map((e) => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
              filtroEstado === e
                ? "bg-orange-500 border-orange-500 text-white"
                : "border-gray-700 text-gray-400 hover:border-gray-500"
            )}
          >
            {e === "ACTIVOS" ? "Activos" : ESTADO_LABEL[e]}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-8 h-8 text-orange-500" />
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-medium">No hay pedidos en este estado</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pedidosFiltrados.map((pedido) => (
            <TarjetaPedido
              key={pedido.id}
              pedido={pedido}
              actualizando={actualizando === pedido.id}
              onCambiarEstado={cambiarEstado}
              onReimprimir={reimprimir}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaPedido({
  pedido,
  actualizando,
  onCambiarEstado,
  onReimprimir,
}: {
  pedido: PedidoConItems;
  actualizando: boolean;
  onCambiarEstado: (id: number, estado: Estado) => void;
  onReimprimir: (id: number) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const estado = pedido.estado as Estado;
  const hora = new Date(pedido.creadoEn).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Estados posibles siguientes según el estado actual
  const siguientesEstados: Record<Estado, Estado[]> = {
    PENDIENTE: ["CONFIRMADO", "CANCELADO"],
    CONFIRMADO: ["EN_PREPARACION", "CANCELADO"],
    EN_PREPARACION: ["LISTO", "CANCELADO"],
    LISTO: ["ENTREGADO"],
    ENTREGADO: [],
    CANCELADO: [],
  };

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-black text-orange-400 text-lg">
            #{String(pedido.numeroPedido).padStart(4, "0")}
          </span>
          <span className={clsx("text-xs font-semibold px-2.5 py-1 rounded-full border", ESTADO_COLOR[estado])}>
            {ESTADO_LABEL[estado]}
          </span>
        </div>

        <div className="space-y-1 text-sm">
          <p className="font-semibold text-white">{pedido.nombreCliente}</p>
          <p className="text-gray-400">{pedido.telefono}</p>
          <div className="flex items-center gap-3 text-gray-500 text-xs">
            <span>{hora} hs</span>
            <span className="font-medium text-gray-300">
              {pedido.tipo === "DELIVERY" ? "🛵 Delivery" : "🏪 Retiro"}
            </span>
            <span>
              {pedido.formaPago === "ONLINE"
                ? pedido.estadoPago === "PAGADO" ? "💳 Pagado" : "💳 Pendiente"
                : "💵 Contra entrega"}
            </span>
          </div>
          {pedido.tipo === "DELIVERY" && pedido.direccionEntrega && (
            <p className="text-gray-400 text-xs">📍 {pedido.direccionEntrega}</p>
          )}
        </div>

        {/* Items colapsables */}
        <button
          onClick={() => setAbierto(!abierto)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ChevronDown size={14} className={clsx("transition-transform", abierto && "rotate-180")} />
          {pedido.items.length} producto{pedido.items.length !== 1 && "s"} —{" "}
          <span className="font-bold text-white">${Number(pedido.total).toLocaleString("es-AR")}</span>
        </button>

        {abierto && (
          <div className="space-y-1 pt-1 border-t border-gray-800">
            {pedido.items.map((item) => (
              <div key={item.id} className="flex justify-between text-xs text-gray-400">
                <span>{item.cantidad}× {item.producto.nombre}</span>
                <span>${Number(item.subtotal).toLocaleString("es-AR")}</span>
              </div>
            ))}
            {pedido.notas && (
              <p className="text-xs text-yellow-400 mt-1">📝 {pedido.notas}</p>
            )}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="px-4 pb-4 flex gap-2">
        {siguientesEstados[estado].map((sig) => (
          <button
            key={sig}
            onClick={() => onCambiarEstado(pedido.id, sig)}
            disabled={actualizando}
            className={clsx(
              "flex-1 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50",
              sig === "CANCELADO"
                ? "bg-red-900/50 hover:bg-red-900 text-red-400"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            )}
          >
            {actualizando ? <Spinner className="w-3 h-3 mx-auto" /> : ESTADO_LABEL[sig]}
          </button>
        ))}
        <button
          onClick={() => onReimprimir(pedido.id)}
          disabled={actualizando}
          title="Reimprimir ticket"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <Printer size={15} />
        </button>
      </div>
    </div>
  );
}

