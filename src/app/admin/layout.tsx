import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // La página de login no pasa por aquí (está fuera del grupo protegido)
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <AdminNav />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
