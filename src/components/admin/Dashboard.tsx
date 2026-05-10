"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ShoppingBag, Users, Receipt, Truck, Store } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { clsx } from "clsx";

type Periodo = "dia" | "semana" | "mes";

interface DashboardData {
  periodo: Periodo;
  ventas: {
    total: number;
    pedidos: number;
    ticketPromedio: number;
    cambio: number | null;
    cambioPedidos: number | null;
    previo: { total: number; pedidos: number };
  };
  topPlatos: { nombre: string; cantidad: number; ingresos: number }[];
  pedidosPorHora: { hora: number; cantidad: number }[];
  splitTipo: { tipo: string; cantidad: number; total: number }[];
  ultimosClientes: {
    nombre_cliente: string;
    telefono: string;
    email: string;
    pedidos: number;
    gasto_total: number;
    ultimo_pedido: string;
  }[];
}

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "dia", label: "Hoy" },
  { value: "semana", label: "7 días" },
  { value: "mes", label: "30 días" },
];

function fmt(n: number) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPrecio(n: number) {
  return `$${fmt(n)}`;
}

function Cambio({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-gray-500 text-xs">sin datos anteriores</span>;
  const positivo = valor >= 0;
  const Icon = valor === 0 ? Minus : positivo ? TrendingUp : TrendingDown;
  return (
    <span className={clsx("flex items-center gap-1 text-xs font-semibold", positivo ? "text-emerald-400" : "text-red-400")}>
      <Icon size={12} />
      {positivo ? "+" : ""}{valor.toFixed(1)}% vs período anterior
    </span>
  );
}

function KpiCard({
  titulo,
  valor,
  cambio,
  icon: Icon,
}: {
  titulo: string;
  valor: string;
  cambio: number | null;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{titulo}</span>
        <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <Icon size={15} className="text-orange-400" />
        </div>
      </div>
      <span className="text-2xl font-bold text-white">{valor}</span>
      <Cambio valor={cambio} />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string | number }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400">{`${label}:00 hs`}</p>
      <p className="text-white font-bold">{payload[0].value} pedidos</p>
    </div>
  );
};

export function Dashboard() {
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [data, setData] = useState<DashboardData | null>(null);
  const [cargando, setCargando] = useState(true);

  const fetchData = useCallback(async (p: Periodo) => {
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/dashboard?periodo=${p}`, { credentials: "same-origin" });
      const json = await res.json();
      if (json.ok) setData(json.data);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { fetchData(periodo); }, [fetchData, periodo]);

  const delivery = data?.splitTipo.find((s) => s.tipo === "DELIVERY");
  const retiro = data?.splitTipo.find((s) => s.tipo === "RETIRO");
  const totalPedidos = (delivery?.cantidad ?? 0) + (retiro?.cantidad ?? 0);

  const maxCantidad = data ? Math.max(...data.topPlatos.map((p) => p.cantidad), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header con selector de período */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <div className="flex bg-gray-900 rounded-xl border border-gray-800 p-1 gap-1">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={clsx(
                "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
                periodo === p.value
                  ? "bg-orange-500 text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-24">
          <Spinner className="w-8 h-8 text-orange-500" />
        </div>
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              titulo="Ventas del período"
              valor={fmtPrecio(data.ventas.total)}
              cambio={data.ventas.cambio}
              icon={Receipt}
            />
            <KpiCard
              titulo="Pedidos"
              valor={String(data.ventas.pedidos)}
              cambio={data.ventas.cambioPedidos}
              icon={ShoppingBag}
            />
            <KpiCard
              titulo="Ticket promedio"
              valor={fmtPrecio(data.ventas.ticketPromedio)}
              cambio={null}
              icon={TrendingUp}
            />
          </div>

          {/* Gráfico pedidos por hora + Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <p className="text-sm font-semibold text-gray-400 mb-4">Pedidos por hora · últimos 7 días</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.pedidosPorHora} barCategoryGap="20%">
                  <XAxis
                    dataKey="hora"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    tickFormatter={(h) => `${h}h`}
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(249,115,22,0.08)" }} />
                  <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                    {data.pedidosPorHora.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.cantidad > 0 ? "#f97316" : "#1f2937"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Split delivery/retiro */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 flex flex-col gap-4">
              <p className="text-sm font-semibold text-gray-400">Modalidad de entrega</p>
              {totalPedidos === 0 ? (
                <p className="text-gray-600 text-sm my-auto text-center">Sin pedidos en el período</p>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    {[
                      { label: "Delivery", data: delivery, icon: Truck, color: "bg-orange-500" },
                      { label: "Retiro", data: retiro, icon: Store, color: "bg-blue-500" },
                    ].map(({ label, data: d, icon: Icon, color }) => (
                      <div key={label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                            <Icon size={12} /> {label}
                          </span>
                          <span className="text-gray-400">{d?.cantidad ?? 0} pedidos</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={clsx("h-full rounded-full transition-all", color)}
                            style={{ width: `${totalPedidos ? ((d?.cantidad ?? 0) / totalPedidos) * 100 : 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">{fmtPrecio(d?.total ?? 0)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Top 5 platos + Últimos clientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top platos */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <p className="text-sm font-semibold text-gray-400 mb-4">Top 5 platos más pedidos</p>
              {data.topPlatos.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">Sin ventas en el período</p>
              ) : (
                <div className="space-y-3">
                  {data.topPlatos.map((p, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-200 font-medium truncate pr-2">
                          <span className="text-orange-500 font-bold mr-1.5">#{i + 1}</span>
                          {p.nombre}
                        </span>
                        <span className="text-gray-400 flex-shrink-0">{p.cantidad} und</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${(p.cantidad / maxCantidad) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600">{fmtPrecio(p.ingresos)} en ventas</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Últimos clientes */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <p className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
                <Users size={14} /> Últimos clientes
              </p>
              {data.ultimosClientes.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">Sin clientes registrados</p>
              ) : (
                <div className="space-y-0 divide-y divide-gray-800">
                  {data.ultimosClientes.map((c, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{c.nombre_cliente}</p>
                        <p className="text-xs text-gray-500">{c.telefono}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-orange-400">{fmtPrecio(c.gasto_total)}</p>
                        <p className="text-xs text-gray-600">{c.pedidos} {c.pedidos === 1 ? "pedido" : "pedidos"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-gray-500 text-center py-16">Error al cargar datos</p>
      )}
    </div>
  );
}
