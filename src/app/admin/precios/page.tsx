import { verificarAdminServer } from "@/lib/admin-auth";
import { Precios } from "@/components/admin/Precios";

export default function AdminPreciosPage() {
  verificarAdminServer();
  return <Precios />;
}
