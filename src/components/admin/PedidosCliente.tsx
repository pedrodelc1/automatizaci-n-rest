"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Printer, ChevronDown, Clock, MapPin, Phone, Bike, ShoppingBag } from "lucide-react";
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

const ESTADO_BADGE: Record<Estado, string> = {
  PENDIENTE:     "bg-amber-100   dark:bg-amber-900/30   text-amber-700   dark:text-amber-400   border border-amber-200   dark:border-amber-700/40",
  CONFIRMADO:    "bg-sky-100     dark:bg-sky-900/30     text-sky-700     dark:text-sky-400     border border-sky-200     dark:border-sky-700/40",
  EN_PREPARACION:"bg-orange-100  dark:bg-orange-900/30  text-orange-700  dark:text-orange-400  border border-orange-200  dark:border-orange-700/40",
  LISTO:         "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/40",
  ENTREGADO:     "bg-neutral-100 dark:bg-neutral-800    text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700",
  CANCELADO:     "bg-red-100     dark:bg-red-900/30     text-red-600     dark:text-red-400     border border-red-200     dark:border-red-700/40",
};

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
        toast.success(`Estado: ${ESTADO_LABEL[estado]}`);
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

  const tabs: (Estado | "ACTIVOS")[] = ["ACTIVOS", ...ESTADOS];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps mb-1">Panel de gestión</p>
          <h1 className="section-title text-2xl">Pedidos</h1>
        </div>
        <button
          onClick={() => fetchPedidos()}
          className="btn-ghost text-sm"
        >
          <RefreshCw size={15} className={cargando ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Tabs de filtro */}
      <div className="card p-1 flex gap-0.5 flex-wrap">
        {tabs.map((e) => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
              filtroEstado === e
                ? "bg-orange-500 text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            {e === "ACTIVOS" ? "Activos" : ESTADO_LABEL[e as Estado]}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {cargando ? (
        <div className="flex justify-center py-24">
          <Spinner className="w-8 h-8 text-orange-500" />
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="card text-center py-20 space-y-3">
          <p className="text-4xl">🎉</p>
          <p className="font-semibold text-neutral-700 dark:text-neutral-300">No hay pedidos en este estado</p>
          <p className="text-sm text-neutral-400">Los nuevos pedidos aparecerán aquí automáticamente</p>
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

  const siguientesEstados: Record<Estado, Estado[]> = {
    PENDIENTE:      ["CONFIRMADO", "CANCELADO"],
    CONFIRMADO:     ["EN_PREPARACION", "CANCELADO"],
    EN_PREPARACION: ["LISTO", "CANCELADO"],
    LISTO:          ["ENTREGADO"],
    ENTREGADO:      [],
    CANCELADO:      [],
  };

  const esPagadoOnline =
    pedido.formaPago === "ONLINE" && pedido.estadoPago === "PAGADO";
  const esPendientePago =
    pedido.formaPago === "ONLINE" && pedido.estadoPago !== "PAGADO";

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Franja de color según estado */}
      <div
        className={clsx(
          "h-1 w-full",
          estado === "PENDIENTE"      && "bg-amber-400",
          estado === "CONFIRMADO"     && "bg-sky-400",
          estado === "EN_PREPARACION" && "bg-orange-400",
          estado === "LISTO"          && "bg-emerald-400",
          estado === "ENTREGADO"      && "bg-neutral-300 dark:bg-neutral-700",
          estado === "CANCELADO"      && "bg-red-400",
        )}
      />

      <div className="p-4 space-y-3 flex-1">
        {/* Número + estado */}
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-orange-500 text-xl tracking-tight">
            #{String(pedido.numeroPedido).padStart(4, "0")}
          </span>
          <span className={clsx("badge text-[10px]", ESTADO_BADGE[estado])}>
            {ESTADO_LABEL[estado]}
          </span>
        </div>

        {/* Info cliente */}
        <div className="space-y-1.5">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-[15px] leading-tight">
            {pedido.nombreCliente}
          </p>
          <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500 text-xs">
            <Phone size={11} />
            <span>{pedido.telefono}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {hora} hs
            </span>
            <span className="flex items-center gap-1">
              {pedido.tipo === "DELIVERY" ? <Bike size={11} /> : <ShoppingBag size={11} />}
              {pedido.tipo === "DELIVERY" ? "Delivery" : "Retiro"}
            </span>
            <span className={clsx(
              "font-medium",
              esPagadoOnline && "text-emerald-600 dark:text-emerald-400",
              esPendientePago && "text-amber-600 dark:text-amber-400",
            )}>
              {pedido.formaPago === "ONLINE"
                ? esPagadoOnline ? "💳 Pagado" : "💳 Pendiente"
                : "💵 Contra entrega"}
            </span>
          </div>
          {pedido.tipo === "DELIVERY" && pedido.direccionEntrega && (
            <p className="flex items-start gap-1 text-neutral-400 dark:text-neutral-500 text-xs">
              <MapPin size={11} className="mt-0.5 flex-shrink-0" />
              {pedido.direccionEntrega}
            </p>
          )}
        </div>

        {/* Items colapsables */}
        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2.5">
          <button
            onClick={() => setAbierto(!abierto)}
            className="flex items-center justify-between w-full text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <span className="flex items-center gap-1">
              <ChevronDown
                size={13}
                className={clsx("transition-transform duration-200", abierto && "rotate-180")}
              />
              {pedido.items.length} producto{pedido.items.length !== 1 && "s"}
            </span>
            <span className="display-price text-sm font-bold text-neutral-900 dark:text-neutral-100">
              ${Number(pedido.total).toLocaleString("es-AR")}
            </span>
          </button>

          {abierto && (
            <div className="mt-2 space-y-1.5">
              {pedido.items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {item.cantidad}×
                    </span>{" "}
                    {item.producto.nombre}
                  </span>
                  <span className="font-medium">${Number(item.subtotal).toLocaleString("es-AR")}</span>
                </div>
              ))}
              {pedido.notas && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1.5 mt-1">
                  📝 {pedido.notas}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      {(siguientesEstados[estado].length > 0 || true) && (
        <div className="px-4 pb-4 flex gap-2">
          {siguientesEstados[estado].map((sig) => (
            <button
              key={sig}
              onClick={() => onCambiarEstado(pedido.id, sig)}
              disabled={actualizando}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 disabled:opacity-50",
                sig === "CANCELADO"
                  ? "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                  : "bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white",
              )}
            >
              {actualizando ? <Spinner className="w-3 h-3 mx-auto" /> : ESTADO_LABEL[sig]}
            </button>
          ))}
          <button
            onClick={() => onReimprimir(pedido.id)}
            disabled={actualizando}
            title="Reimprimir ticket"
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <Printer size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
