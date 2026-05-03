"use client";

import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";

// Ícono discreto en el header para que el dueño acceda al admin.
// Si ya tiene la cookie de sesión va directo a pedidos, sino al login.
export function AccesoAdmin() {
  const router = useRouter();

  function handleClick() {
    const estaLogueado = document.cookie.includes("admin_session=");
    router.push(estaLogueado ? "/admin/pedidos" : "/admin/login");
  }

  return (
    <button
      onClick={handleClick}
      title="Administración"
      className="p-2 rounded-xl text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
    >
      <Settings size={18} />
    </button>
  );
}
