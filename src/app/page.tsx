import { prisma } from "@/lib/prisma";
import { TarjetaProducto } from "@/components/menu/TarjetaProducto";
import { BotonCarrito } from "@/components/ui/BotonCarrito";
import { MapPin, Clock, Star } from "lucide-react";
import { restaurante, getEstadoHorario } from "@/config/restaurante";

export const revalidate = 60;

async function getMenu() {
  return prisma.categoria.findMany({
    where: { activo: true },
    orderBy: { orden: "asc" },
    include: {
      productos: {
        where: { disponible: true },
        orderBy: [{ destacado: "desc" }, { nombre: "asc" }],
      },
    },
  });
}

export default async function MenuPage() {
  const categorias = await getMenu();
  const cats = categorias.filter((c) => c.productos.length > 0);
  const { nombre, emoji, direccion, tiempoDelivery, tiempoRetiro } = restaurante;
  const horario = getEstadoHorario();

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-[#0D0C0A] pb-36">

      {/* ── Hero ────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{
        background: "linear-gradient(155deg, #92320c 0%, #c2470f 30%, #f97316 65%, #fbbf24 100%)",
      }}>
        {/* Textura grain */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Overlay superior oscuro */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />

        {/* Forma decorativa */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/[0.06] rounded-full pointer-events-none" />
        <div className="absolute top-8 -right-8 w-40 h-40 bg-white/[0.06] rounded-full pointer-events-none" />

        <div className="relative max-w-2xl mx-auto px-5 pt-12 pb-28">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Logo */}
              <div
                className="w-[72px] h-[72px] bg-white rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 select-none"
                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15)" }}
              >
                {emoji}
              </div>
              <div className="pt-1">
                <h1 className="font-display text-[2.1rem] font-bold text-white leading-none tracking-[-0.02em]">
                  {nombre}
                </h1>
                <p className="text-orange-100/80 text-[13px] font-medium mt-1.5 tracking-wide">
                  Delivery & retiro en local
                </p>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <Star size={11} className="fill-amber-300 text-amber-300" />
                  <span className="text-white text-xs font-bold">4.8</span>
                  <span className="text-orange-200/70 text-xs ml-0.5">· +200 pedidos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chips */}
          <div className="flex items-center gap-2 mt-6 flex-wrap">
            {[
              { icon: "🛵", text: `Delivery ~${tiempoDelivery} min` },
              { icon: "🏪", text: `Retiro ~${tiempoRetiro} min` },
            ].map((c) => (
              <span
                key={c.text}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-white/20 text-white"
                style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
              >
                {c.icon} {c.text}
              </span>
            ))}
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border text-white ${horario.abierto ? "border-white/20" : "border-red-300/40 bg-red-900/30"}`}
              style={horario.abierto ? { background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" } : {}}
            >
              <Clock size={10} /> {horario.abierto ? horario.etiqueta : `Cerrado · ${horario.etiqueta}`}
            </span>
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-white/20 text-white"
              style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
            >
              <MapPin size={10} /> {direccion}
            </span>
          </div>
        </div>
      </div>

      {/* ── Card principal ───────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-3 -mt-16 relative z-10">
        <div
          className="bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.10)" }}
        >
          {/* Category tabs */}
          {cats.length > 1 && (
            <nav className="px-2 pt-2 flex gap-0 overflow-x-auto scrollbar-hide border-b border-neutral-100 dark:border-neutral-800/80">
              {cats.map((cat) => (
                <a
                  key={cat.id}
                  href={`#cat-${cat.id}`}
                  className="category-tab"
                >
                  {cat.nombre}
                </a>
              ))}
            </nav>
          )}

          {/* Productos */}
          <div>
            {cats.length === 0 ? (
              <div className="text-center py-24 px-4">
                <div className="text-5xl mb-5">🍽️</div>
                <p className="font-display text-xl font-semibold text-neutral-700 dark:text-neutral-300">
                  El menú está siendo preparado
                </p>
                <p className="text-neutral-400 text-sm mt-2">Volvé en unos minutos</p>
              </div>
            ) : (
              cats.map((categoria, catIdx) => (
                <section
                  key={categoria.id}
                  id={`cat-${categoria.id}`}
                  className="scroll-mt-4"
                >
                  <div className={`px-5 flex items-baseline gap-3 ${catIdx === 0 ? "pt-5 pb-2" : "pt-7 pb-2"}`}>
                    <h2 className="section-title">{categoria.nombre}</h2>
                    {categoria.descripcion && (
                      <span className="text-[13px] text-neutral-400 dark:text-neutral-500 hidden sm:inline font-medium">
                        {categoria.descripcion}
                      </span>
                    )}
                  </div>
                  <div className="px-2 pb-2">
                    {categoria.productos.map((producto) => (
                      <TarjetaProducto key={producto.id} producto={producto} />
                    ))}
                  </div>
                  {catIdx < cats.length - 1 && (
                    <div className="mx-5 h-px bg-neutral-100 dark:bg-neutral-800/60" />
                  )}
                </section>
              ))
            )}
          </div>

          {/* Footer */}
          {cats.length > 0 && (
            <div className="px-5 py-4 mt-2 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between">
              <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
                Precios en pesos · IVA incluido
              </p>
              <span className="font-display text-[11px] text-neutral-300 dark:text-neutral-700 font-semibold italic">
                MenuYa
              </span>
            </div>
          )}
        </div>
      </div>

      <BotonCarrito />
    </div>
  );
}
