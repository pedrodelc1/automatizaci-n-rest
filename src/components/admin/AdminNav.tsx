"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, UtensilsCrossed, LogOut, Store } from "lucide-react";
import { clsx } from "clsx";

const links = [
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/menu", label: "Menú", icon: UtensilsCrossed },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function cerrarSesion() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150",
                pathname.startsWith(href)
                  ? "bg-orange-500 text-white"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          <Link
            href="/"
            className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 text-sm px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-150 font-medium"
          >
            <Store size={15} />
            Ver menú
          </Link>
          <button
            onClick={cerrarSesion}
            className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 text-sm px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150 font-medium"
          >
            <LogOut size={15} />
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
