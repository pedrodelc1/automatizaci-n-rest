import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, MapPin, Store, Receipt, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";

interface Props { params: { pedidoId: string } }

async function getPedido(id: number) {
  return prisma.pedido.findUnique({
    where: { id },
    include: { items: { include: { producto: true } } },
  });
}

export default async function ConfirmacionPage({ params }: Props) {
  const id = parseInt(params.pedidoId);
  if (isNaN(id)) notFound();

  const pedido = await getPedido(id);
  if (!pedido) notFound();

  const esDelivery = pedido.tipo === "DELIVERY";
  const tiempoEstimado = esDelivery
    ? (process.env.TIEMPO_ESTIMADO_DELIVERY ?? "45")
    : (process.env.TIEMPO_ESTIMADO_RETIRO ?? "20");
  const numeroPedido = String(pedido.numeroPedido).padStart(4, "0");
  const pagado = pedido.estadoPago === "PAGADO";

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-[#0D0C0A]">

      {/* Hero */}
      <div
        className="relative overflow-hidden pt-16 pb-32 px-4 text-center"
        style={{ background: "linear-gradient(155deg, #064e3b 0%, #059669 50%, #34d399 100%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/[0.06] rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/[0.04] rounded-full pointer-events-none" />

        <div className="relative">
          <div
            className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
          >
            <CheckCircle2 size={42} strokeWidth={1.6} className="text-white" />
          </div>
          <p className="text-emerald-100/80 font-semibold text-[11px] uppercase tracking-[0.12em] mb-3">
            {pagado ? "Pago confirmado" : "Pedido recibido"}
          </p>
          <p className="font-display text-[4rem] font-bold text-white leading-none" style={{ letterSpacing: "-0.03em" }}>
            #{numeroPedido}
          </p>
          <p className="text-emerald-100/70 text-[14px] mt-3 max-w-xs mx-auto leading-relaxed">
            {pagado
              ? "Tu pago fue acreditado. Estamos preparando tu pedido."
              : "Recibimos tu pedido y ya lo estamos preparando."}
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-md w-full mx-auto px-4 -mt-18 pb-10 space-y-3 relative z-10" style={{ marginTop: "-4.5rem" }}>

        {/* Tiempo estimado */}
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/30 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Clock size={20} className="text-orange-500" />
          </div>
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-[14px] tracking-[-0.01em]">
              Tiempo estimado
            </p>
            <p className="text-neutral-500 dark:text-neutral-400 text-[13px] mt-0.5">
              Aproximadamente{" "}
              <span className="font-display font-semibold text-neutral-800 dark:text-neutral-200">
                {tiempoEstimado} min
              </span>
            </p>
          </div>
        </div>

        {/* Modalidad */}
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 rounded-2xl flex items-center justify-center flex-shrink-0">
            {esDelivery
              ? <MapPin size={20} className="text-blue-500" />
              : <Store size={20} className="text-blue-500" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-[14px] tracking-[-0.01em]">
              {esDelivery ? "Delivery a domicilio" : "Retiro en local"}
            </p>
            <p className="text-neutral-500 dark:text-neutral-400 text-[13px] mt-0.5 truncate">
              {esDelivery && pedido.direccionEntrega
                ? pedido.direccionEntrega
                : "Presentate con el número de pedido"}
            </p>
          </div>
        </div>

        {/* Resumen */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800/60 flex items-center gap-2">
            <Receipt size={13} className="text-neutral-400" />
            <p className="label-caps">Detalle del pedido</p>
          </div>
          <div className="p-5 space-y-2.5">
            {pedido.items.map((item) => (
              <div key={item.id} className="flex justify-between text-[13px]">
                <span className="text-neutral-500 dark:text-neutral-400">{item.cantidad}× {item.producto.nombre}</span>
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  ${Number(item.subtotal).toLocaleString("es-AR")}
                </span>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-100 dark:border-neutral-800/60 space-y-2.5">
            <div className="flex justify-between items-baseline">
              <span className="font-semibold text-neutral-600 dark:text-neutral-400 text-sm">Total</span>
              <span className="display-price text-2xl">${Number(pedido.total).toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-neutral-400">Forma de pago</span>
              <span className={pagado ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-neutral-500 dark:text-neutral-400"}>
                {pedido.formaPago === "ONLINE"
                  ? pagado ? "Online — Pagado ✓" : "Online — Pendiente"
                  : "Efectivo / posnet al recibir"}
              </span>
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div
          className="card p-4 flex items-center gap-3"
          style={{ background: "rgba(5,150,105,0.06)", borderColor: "rgba(5,150,105,0.15)" }}
        >
          <span className="text-2xl flex-shrink-0">💬</span>
          <p className="text-[13px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
            Te avisamos por <strong>WhatsApp</strong> cuando tu pedido esté listo.
          </p>
        </div>

        <Link href="/" className="btn-primary w-full py-4 text-[15px]">
          Volver al menú <ChevronRight size={17} />
        </Link>
      </div>
    </div>
  );
}
