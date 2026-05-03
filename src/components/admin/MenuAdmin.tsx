"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { clsx } from "clsx";
import { Spinner } from "@/components/ui/Spinner";
import toast from "react-hot-toast";

interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  orden: number;
  _count: { productos: number };
}

interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: string;
  imagenUrl: string | null;
  categoriaId: number;
  disponible: boolean;
  destacado: boolean;
  categoria: { nombre: string };
}

export function MenuAdmin() {
  const [tab, setTab] = useState<"productos" | "categorias">("productos");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalProducto, setModalProducto] = useState<Partial<Producto> | null>(null);
  const [modalCategoria, setModalCategoria] = useState<Partial<Categoria> | null>(null);
  const [guardando, setGuardando] = useState(false);

  const fetchTodo = useCallback(async () => {
    setCargando(true);
    const [resP, resC] = await Promise.all([
      fetch("/api/admin/productos", { credentials: "same-origin" }),
      fetch("/api/admin/categorias", { credentials: "same-origin" }),
    ]);
    const [dataP, dataC] = await Promise.all([resP.json(), resC.json()]);
    if (dataP.ok) setProductos(dataP.data);
    if (dataC.ok) setCategorias(dataC.data);
    setCargando(false);
  }, []);

  useEffect(() => { fetchTodo(); }, [fetchTodo]);

  async function toggleDisponible(producto: Producto) {
    const res = await fetch(`/api/admin/productos/${producto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ disponible: !producto.disponible }),
    });
    if ((await res.json()).ok) {
      setProductos((prev) => prev.map((p) => p.id === producto.id ? { ...p, disponible: !p.disponible } : p));
    }
  }

  async function eliminarProducto(id: number) {
    if (!confirm("¿Eliminar este producto?")) return;
    const res = await fetch(`/api/admin/productos/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if ((await res.json()).ok) {
      toast.success("Producto eliminado");
      setProductos((prev) => prev.filter((p) => p.id !== id));
    }
  }

  async function guardarProducto(data: Partial<Producto>) {
    setGuardando(true);
    const esNuevo = !data.id;
    const url = esNuevo ? "/api/admin/productos" : `/api/admin/productos/${data.id}`;
    const method = esNuevo ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ ...data, precio: Number(data.precio) }),
    });
    const result = await res.json();
    setGuardando(false);

    if (result.ok) {
      toast.success(esNuevo ? "Producto creado" : "Producto actualizado");
      setModalProducto(null);
      fetchTodo();
    } else {
      toast.error(result.error);
    }
  }

  async function guardarCategoria(data: Partial<Categoria>) {
    setGuardando(true);
    const esNuevo = !data.id;
    const url = esNuevo ? "/api/admin/categorias" : `/api/admin/categorias/${data.id}`;
    const method = esNuevo ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data),
    });
    const result = await res.json();
    setGuardando(false);

    if (result.ok) {
      toast.success(esNuevo ? "Categoría creada" : "Categoría actualizada");
      setModalCategoria(null);
      fetchTodo();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["productos", "categorias"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-semibold transition-colors capitalize",
                tab === t ? "bg-orange-500 text-white" : "text-gray-400 hover:bg-gray-800"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => tab === "productos" ? setModalProducto({}) : setModalCategoria({})}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {cargando ? (
        <div className="flex justify-center py-20"><Spinner className="w-8 h-8 text-orange-500" /></div>
      ) : tab === "productos" ? (
        <div className="space-y-2">
          {productos.map((p) => (
            <div key={p.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">{p.nombre}</p>
                  {p.destacado && <Star size={13} className="text-yellow-400 flex-shrink-0" fill="currentColor" />}
                  {!p.disponible && <span className="text-xs text-red-400 font-medium">No disponible</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{p.categoria.nombre}</p>
              </div>
              <span className="font-bold text-orange-400">${Number(p.precio).toLocaleString("es-AR")}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleDisponible(p)} title={p.disponible ? "Desactivar" : "Activar"}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                  {p.disponible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button onClick={() => setModalProducto(p)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => eliminarProducto(p.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {categorias.map((c) => (
            <div key={c.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-white">{c.nombre}</p>
                <p className="text-xs text-gray-500">{c._count.productos} productos · orden {c.orden}</p>
              </div>
              {!c.activo && <span className="text-xs text-red-400 font-medium">Inactiva</span>}
              <button onClick={() => setModalCategoria(c)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                <Pencil size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Producto */}
      {modalProducto && (
        <Modal titulo={modalProducto.id ? "Editar producto" : "Nuevo producto"} onClose={() => setModalProducto(null)}>
          <FormProducto
            inicial={modalProducto}
            categorias={categorias}
            guardando={guardando}
            onGuardar={guardarProducto}
            onCancelar={() => setModalProducto(null)}
          />
        </Modal>
      )}

      {/* Modal Categoría */}
      {modalCategoria && (
        <Modal titulo={modalCategoria.id ? "Editar categoría" : "Nueva categoría"} onClose={() => setModalCategoria(null)}>
          <FormCategoria
            inicial={modalCategoria}
            guardando={guardando}
            onGuardar={guardarCategoria}
            onCancelar={() => setModalCategoria(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="font-bold text-white">{titulo}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function FormProducto({ inicial, categorias, guardando, onGuardar, onCancelar }: {
  inicial: Partial<Producto>;
  categorias: Categoria[];
  guardando: boolean;
  onGuardar: (data: Partial<Producto>) => void;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState({ ...inicial });
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onGuardar(form); }} className="space-y-3">
      <input className="input bg-gray-800 border-gray-700 text-white placeholder-gray-500" placeholder="Nombre *" value={form.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} required />
      <textarea className="input bg-gray-800 border-gray-700 text-white placeholder-gray-500 resize-none" placeholder="Descripción" rows={2} value={form.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} />
      <input className="input bg-gray-800 border-gray-700 text-white placeholder-gray-500" placeholder="Precio *" type="number" min="0" step="1" value={form.precio ?? ""} onChange={(e) => set("precio", e.target.value)} required />
      <input className="input bg-gray-800 border-gray-700 text-white placeholder-gray-500" placeholder="URL de imagen (opcional)" value={form.imagenUrl ?? ""} onChange={(e) => set("imagenUrl", e.target.value)} />
      <select className="input bg-gray-800 border-gray-700 text-white" value={form.categoriaId ?? ""} onChange={(e) => set("categoriaId", parseInt(e.target.value))} required>
        <option value="">Seleccioná una categoría *</option>
        {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={form.disponible ?? true} onChange={(e) => set("disponible", e.target.checked)} className="w-4 h-4 accent-orange-500" />
          Disponible
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={form.destacado ?? false} onChange={(e) => set("destacado", e.target.checked)} className="w-4 h-4 accent-orange-500" />
          Destacado
        </label>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancelar} className="btn-secondary flex-1 bg-gray-800 border-gray-700 text-gray-300">Cancelar</button>
        <button type="submit" disabled={guardando} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {guardando ? <Spinner className="w-4 h-4" /> : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function FormCategoria({ inicial, guardando, onGuardar, onCancelar }: {
  inicial: Partial<Categoria>;
  guardando: boolean;
  onGuardar: (data: Partial<Categoria>) => void;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState({ ...inicial });
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onGuardar(form); }} className="space-y-3">
      <input className="input bg-gray-800 border-gray-700 text-white placeholder-gray-500" placeholder="Nombre *" value={form.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} required />
      <input className="input bg-gray-800 border-gray-700 text-white placeholder-gray-500" placeholder="Descripción" value={form.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} />
      <input className="input bg-gray-800 border-gray-700 text-white placeholder-gray-500" placeholder="Orden (número)" type="number" value={form.orden ?? 0} onChange={(e) => set("orden", parseInt(e.target.value))} />
      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
        <input type="checkbox" checked={form.activo ?? true} onChange={(e) => set("activo", e.target.checked)} className="w-4 h-4 accent-orange-500" />
        Categoría activa
      </label>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancelar} className="btn-secondary flex-1 bg-gray-800 border-gray-700 text-gray-300">Cancelar</button>
        <button type="submit" disabled={guardando} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {guardando ? <Spinner className="w-4 h-4" /> : "Guardar"}
        </button>
      </div>
    </form>
  );
}
