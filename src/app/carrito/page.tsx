"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ElementType } from "react";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, ChevronRight, CreditCard, Banknote, Truck, Store, Wallet } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";
import { Spinner } from "@/components/ui/Spinner";
import toast from "react-hot-toast";
import { clsx } from "clsx";

type Modalidad = "DELIVERY" | "RETIRO";
type FormaPagoLocal = "ONLINE" | "EFECTIVO" | "TARJETA_LOCAL";
type TipoTarjeta = "DEBITO" | "CREDITO";

interface FormData {
  nombreCliente: string;
  telefono: string;
  email: string;
  direccionEntrega: string;
  notas: string;
}

export default function CarritoPage() {
  const router = useRouter();
  const { items, totalPrecio, cambiarCantidad, vaciar } = useCarrito();

  const [modalidad, setModalidad] = useState<Modalidad>("DELIVERY");
  const [formaPago, setFormaPago] = useState<FormaPagoLocal>("ONLINE");
  const [tipoTarjeta, setTipoTarjeta] = useState<TipoTarjeta>("DEBITO");
  const [montoCon, setMontoCon] = useState("");
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState<FormData>({
    nombreCliente: "", telefono: "", email: "", direccionEntrega: "", notas: "",
  });

  const set = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function confirmarPedido() {
    if (!form.nombreCliente.trim() || !form.telefono.trim() || !form.email.trim()) {
      toast.error("Completá tus datos de contacto");
      return;
    }
    if (modalidad === "DELIVERY" && !form.direccionEntrega.trim()) {
      toast.error("Ingresá tu dirección de entrega");
      return;
    }

    const formaPagoApi =
      formaPago === "TARJETA_LOCAL"
        ? tipoTarjeta === "DEBITO" ? "TARJETA_DEBITO" : "TARJETA_CREDITO"
        : formaPago;

    setCargando(true);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: modalidad,
          nombreCliente: form.nombreCliente,
          telefono: form.telefono,
          email: form.email,
          direccionEntrega: modalidad === "DELIVERY" ? form.direccionEntrega : undefined,
          formaPago: formaPagoApi,
          montoCon: formaPago === "EFECTIVO" && montoCon ? Number(montoCon) : undefined,
          notas: form.notas || undefined,
        }),
      });

      const data = await res.json();
      if (!data.ok) { toast.error(data.error ?? "Error al crear el pedido"); return; }

      vaciar();
      router.push(formaPago === "ONLINE" ? `/checkout/${data.data.id}` : `/confirmacion/${data.data.id}`);
    } catch {
      toast.error("Error de conexión. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 bg-cream-50 dark:bg-[#0D0C0A]">
        <div
          className="w-24 h-24 bg-white dark:bg-neutral-900 rounded-3xl flex items-center justify-center"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)" }}
        >
          <ShoppingBag size={36} className="text-neutral-300 dark:text-neutral-600" />
        </div>
        <div className="text-center">
          <p className="font-display text-xl font-semibold text-neutral-800 dark:text-neutral-200">Tu carrito está vacío</p>
          <p className="text-neutral-400 text-sm mt-2">Agregá productos desde el menú</p>
        </div>
        <Link href="/" className="btn-primary px-8">Ver el menú</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-[#0D0C0A] pb-10">

      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 sticky top-0 z-40 border-b border-neutral-100 dark:border-neutral-800/80"
        style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}
      >
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/" className="btn-ghost -ml-2 p-2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display text-xl font-semibold text-neutral-900 dark:text-neutral-100 flex-1 tracking-[-0.02em]">
            Tu pedido
          </h1>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border tracking-wide bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900/40 text-orange-600 dark:text-orange-400" style={{ letterSpacing: "0.01em" }}>
            {items.length} {items.length === 1 ? "ítem" : "ítems"}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">

        {/* ── Productos ──────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800/60">
            <p className="label-caps">Productos seleccionados</p>
          </div>
          {items.map((item, i) => (
            <div
              key={item.producto.id}
              className={clsx(
                "flex items-center gap-4 px-5 py-4",
                i < items.length - 1 && "border-b border-neutral-50 dark:border-neutral-800/40"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-[14px] truncate tracking-[-0.01em]">
                  {item.producto.nombre}
                </p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="display-price text-[15px] text-orange-500">
                    ${(Number(item.producto.precio) * item.cantidad).toLocaleString("es-AR")}
                  </span>
                  <span className="text-neutral-400 text-[12px]">
                    · ${Number(item.producto.precio).toLocaleString("es-AR")} c/u
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => cambiarCantidad(item.producto.id, item.cantidad - 1)}
                  className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
                >
                  {item.cantidad === 1
                    ? <Trash2 size={12} className="text-red-400" />
                    : <Minus size={12} strokeWidth={3} className="text-neutral-500" />}
                </button>
                <span className="w-7 text-center font-display font-semibold text-[15px] text-neutral-900 dark:text-neutral-100">
                  {item.cantidad}
                </span>
                <button
                  onClick={() => cambiarCantidad(item.producto.id, item.cantidad + 1)}
                  className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-950/60 flex items-center justify-center transition-colors"
                >
                  <Plus size={12} strokeWidth={3} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Modalidad ──────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <p className="label-caps">¿Cómo lo recibís?</p>
          <div className="grid grid-cols-2 gap-2.5">
            {([
              { valor: "DELIVERY", icon: Truck,  label: "Delivery",        time: "~45 min" },
              { valor: "RETIRO",   icon: Store,  label: "Retiro en local",  time: "~20 min" },
            ] as { valor: Modalidad; icon: ElementType; label: string; time: string }[]).map((m) => {
              const Icon = m.icon;
              const activo = modalidad === m.valor;
              return (
                <button
                  key={m.valor}
                  onClick={() => setModalidad(m.valor)}
                  className={clsx(
                    "p-4 rounded-xl border-2 text-left transition-all duration-150 active:scale-[0.98]",
                    activo
                      ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
                      : "border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 hover:border-neutral-200 dark:hover:border-neutral-700"
                  )}
                >
                  <div className={clsx(
                    "w-9 h-9 rounded-xl flex items-center justify-center mb-3",
                    activo ? "bg-orange-500" : "bg-neutral-200 dark:bg-neutral-700"
                  )}>
                    <Icon size={17} className={activo ? "text-white" : "text-neutral-500 dark:text-neutral-400"} />
                  </div>
                  <p className={clsx(
                    "font-bold text-[13px] tracking-[-0.01em]",
                    activo ? "text-orange-600 dark:text-orange-400" : "text-neutral-700 dark:text-neutral-300"
                  )}>
                    {m.label}
                  </p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">{m.time}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Datos del cliente ──────────────────────────── */}
        <div className="card p-5 space-y-4">
          <p className="label-caps">Tus datos</p>
          <div className="space-y-2.5">
            <input className="input" placeholder="Nombre y apellido *" value={form.nombreCliente} onChange={(e) => set("nombreCliente", e.target.value)} />
            <div className="space-y-1.5">
              <input className="input" placeholder="Teléfono * — ej: 3416600928" type="tel" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
              <p className="text-[11px] text-neutral-400 ml-1">Código de área + número, sin el 0 ni el 15</p>
            </div>
            <input className="input" placeholder="Email *" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            {modalidad === "DELIVERY" && (
              <input className="input" placeholder="Dirección de entrega (calle, número, piso) *" value={form.direccionEntrega} onChange={(e) => set("direccionEntrega", e.target.value)} />
            )}
            <textarea
              className="input resize-none"
              placeholder="Notas del pedido (opcional)"
              rows={2}
              value={form.notas}
              onChange={(e) => set("notas", e.target.value)}
            />
          </div>
        </div>

        {/* ── Forma de pago ──────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <p className="label-caps">Forma de pago</p>
          <div className="space-y-2">
            {([
              { valor: "ONLINE",        icon: CreditCard, label: "Pago online",      sub: "Tarjeta, MercadoPago, transferencia" },
              { valor: "EFECTIVO",      icon: Banknote,   label: "Efectivo",          sub: "Pagás en efectivo al recibir" },
              { valor: "TARJETA_LOCAL", icon: Wallet,     label: "Tarjeta al llegar", sub: "Débito o crédito al recibir" },
            ] as { valor: FormaPagoLocal; icon: ElementType; label: string; sub: string }[]).map((fp) => {
              const Icon = fp.icon;
              const activo = formaPago === fp.valor;
              return (
                <div key={fp.valor} className="space-y-2">
                  <button
                    onClick={() => setFormaPago(fp.valor)}
                    className={clsx(
                      "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150 active:scale-[0.98]",
                      activo
                        ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
                        : "border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 hover:border-neutral-200 dark:hover:border-neutral-700"
                    )}
                  >
                    <div className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      activo ? "bg-orange-500" : "bg-neutral-200 dark:bg-neutral-700"
                    )}>
                      <Icon size={19} className={activo ? "text-white" : "text-neutral-500 dark:text-neutral-400"} />
                    </div>
                    <div className="flex-1">
                      <p className={clsx(
                        "font-bold text-[13px] tracking-[-0.01em]",
                        activo ? "text-orange-600 dark:text-orange-400" : "text-neutral-700 dark:text-neutral-300"
                      )}>
                        {fp.label}
                      </p>
                      <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mt-0.5">{fp.sub}</p>
                    </div>
                    <div className={clsx(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                      activo ? "border-orange-500 bg-orange-500" : "border-neutral-300 dark:border-neutral-600"
                    )}>
                      {activo && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </button>

                  {/* Sub-opción efectivo: ¿con cuánto pagás? */}
                  {activo && fp.valor === "EFECTIVO" && (
                    <div className="ml-4 pl-4 border-l-2 border-orange-200 dark:border-orange-800/40">
                      <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                        ¿Con cuánto vas a pagar? (opcional)
                      </label>
                      <input
                        className="input"
                        type="number"
                        placeholder="Ej: 5000"
                        min="0"
                        value={montoCon}
                        onChange={(e) => setMontoCon(e.target.value)}
                      />
                      <p className="text-[11px] text-neutral-400 mt-1 ml-1">Así preparamos el vuelto</p>
                    </div>
                  )}

                  {/* Sub-opción tarjeta: débito o crédito */}
                  {activo && fp.valor === "TARJETA_LOCAL" && (
                    <div className="ml-4 pl-4 border-l-2 border-orange-200 dark:border-orange-800/40">
                      <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                        Tipo de tarjeta
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["DEBITO", "CREDITO"] as TipoTarjeta[]).map((tipo) => (
                          <button
                            key={tipo}
                            onClick={() => setTipoTarjeta(tipo)}
                            className={clsx(
                              "py-2.5 px-3 rounded-xl border-2 text-[13px] font-semibold transition-all",
                              tipoTarjeta === tipo
                                ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400"
                                : "border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400"
                            )}
                          >
                            {tipo === "DEBITO" ? "Débito" : "Crédito"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Resumen ────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="p-5 space-y-3">
            <p className="label-caps">Resumen del pedido</p>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.producto.id} className="flex justify-between text-[13px]">
                  <span className="text-neutral-400 dark:text-neutral-500">{item.cantidad}× {item.producto.nombre}</span>
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    ${(Number(item.producto.precio) * item.cantidad).toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
              {modalidad === "DELIVERY" && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-neutral-400">Envío</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">A confirmar</span>
                </div>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="px-5 py-4 bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-100 dark:border-neutral-800/60 flex justify-between items-center">
            <span className="font-semibold text-neutral-600 dark:text-neutral-400 text-sm">Total</span>
            <span className="display-price text-2xl">
              ${totalPrecio.toLocaleString("es-AR")}
            </span>
          </div>

          {/* CTA */}
          <div className="px-5 pb-5 pt-4 space-y-3">
            <button
              onClick={confirmarPedido}
              disabled={cargando}
              className="btn-primary w-full py-4 text-[15px]"
            >
              {cargando ? (
                <><Spinner className="w-5 h-5" /> Procesando...</>
              ) : formaPago === "ONLINE" ? (
                <>Pagar online <ChevronRight size={17} /></>
              ) : (
                <>Confirmar pedido <ChevronRight size={17} /></>
              )}
            </button>
            <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-600">
              Al confirmar aceptás nuestros términos de servicio
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
