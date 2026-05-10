"use client";

import { useEffect, useState, useCallback } from "react";
import { Percent, ChevronRight, History, AlertCircle, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { Spinner } from "@/components/ui/Spinner";
import toast from "react-hot-toast";

interface Producto {
  id: number;
  nombre: string;
  precio: string;
  disponible: boolean;
}

interface CategoriaConProductos {
  id: number;
  nombre: string;
  productos: Producto[];
}

interface HistorialItem {
  id: number;
  porcentaje: number;
  categoriaId: number | null;
  descripcion: string | null;
  creadoEn: string;
}

interface Preview {
  id: number;
  nombre: string;
  categoria: string;
  precioActual: number;
  precioNuevo: number;
}

function fmt(n: number) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function Precios() {
  const [categorias, setCategorias] = useState<CategoriaConProductos[]>([]);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [porcentaje, setPorcentaje] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | "">("");
  const [preview, setPreview] = useState<Preview[] | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const fetchTodo = useCallback(async () => {
    setCargando(true);
    const [resP, resH] = await Promise.all([
      fetch("/api/admin/precios", { credentials: "same-origin" }),
      fetch("/api/admin/precios/historial", { credentials: "same-origin" }),
    ]);
    const [dataP, dataH] = await Promise.all([resP.json(), resH.json()]);
    if (dataP.ok) setCategorias(dataP.data);
    if (dataH.ok) setHistorial(dataH.data);
    setCargando(false);
  }, []);

  useEffect(() => { fetchTodo(); }, [fetchTodo]);

  function generarPreview() {
    const pct = parseFloat(porcentaje);
    if (!pct || pct <= 0) {
      toast.error("Ingresá un porcentaje válido mayor a 0");
      return;
    }

    const factor = 1 + pct / 100;
    const catFiltro = categoriaId !== "" ? Number(categoriaId) : null;
    const items: Preview[] = [];

    for (const cat of categorias) {
      if (catFiltro !== null && cat.id !== catFiltro) continue;
      for (const prod of cat.productos) {
        const actual = parseFloat(prod.precio);
        items.push({
          id: prod.id,
          nombre: prod.nombre,
          categoria: cat.nombre,
          precioActual: actual,
          precioNuevo: Math.round(actual * factor),
        });
      }
    }

    if (items.length === 0) {
      toast.error("No hay productos en la categoría seleccionada");
      return;
    }

    setPreview(items);
    setConfirmando(true);
  }

  async function confirmar() {
    setGuardando(true);
    try {
      const res = await fetch("/api/admin/precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          porcentaje: parseFloat(porcentaje),
          ...(categoriaId !== "" ? { categoriaId: Number(categoriaId) } : {}),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`${data.actualizados} precios actualizados`);
        setConfirmando(false);
        setPreview(null);
        setPorcentaje("");
        setCategoriaId("");
        fetchTodo();
      } else {
        toast.error(data.error ?? "Error al actualizar");
      }
    } finally {
      setGuardando(false);
    }
  }

  function cancelar() {
    setConfirmando(false);
    setPreview(null);
  }

  function fmtFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (cargando) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-8 h-8 text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Actualización de precios</h1>

      {/* Formulario de aumento */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">
        <p className="text-sm text-gray-400">
          Aplicá un aumento porcentual a todos los productos o a una categoría específica.
          Los precios se redondean al número entero más cercano.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Porcentaje */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Porcentaje de aumento
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.1"
                max="500"
                step="0.1"
                placeholder="Ej: 15"
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
                className="input bg-gray-800 border-gray-700 text-white placeholder-gray-600 pr-10 w-full"
              />
              <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Categoría (opcional)
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value === "" ? "" : parseInt(e.target.value))}
              className="input bg-gray-800 border-gray-700 text-white w-full"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.productos.length} productos)
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={generarPreview}
          disabled={!porcentaje}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <ChevronRight size={16} />
          Ver preview
        </button>
      </div>

      {/* Preview + confirmación */}
      {confirmando && preview && (
        <div className="bg-gray-900 rounded-2xl border border-orange-500/30 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-orange-400" />
            <p className="text-sm font-semibold text-orange-400">
              Preview — +{porcentaje}% en {categoriaId !== "" ? categorias.find((c) => c.id === Number(categoriaId))?.nombre : "todos los productos"}
            </p>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-0 divide-y divide-gray-800 -mx-1 px-1">
            {preview.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{item.nombre}</p>
                  <p className="text-xs text-gray-500">{item.categoria}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                  <span className="text-gray-500 line-through">${fmt(item.precioActual)}</span>
                  <ChevronRight size={12} className="text-gray-600" />
                  <span className="text-emerald-400 font-bold">${fmt(item.precioNuevo)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={cancelar}
              disabled={guardando}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={guardando}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {guardando ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  Confirmar actualización
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
        <p className="text-sm font-semibold text-gray-400 flex items-center gap-2">
          <History size={14} /> Historial de actualizaciones
        </p>

        {historial.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">No hay actualizaciones registradas</p>
        ) : (
          <div className="space-y-0 divide-y divide-gray-800">
            {historial.map((h) => (
              <div key={h.id} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-white">
                    <span className={clsx("font-bold", h.porcentaje > 0 ? "text-emerald-400" : "text-red-400")}>
                      +{h.porcentaje}%
                    </span>
                    {" · "}
                    {h.descripcion ?? "Actualización de precios"}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">{fmtFecha(h.creadoEn)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
