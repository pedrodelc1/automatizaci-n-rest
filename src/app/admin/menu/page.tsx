import { verificarAdminServer } from "@/lib/admin-auth";
import { MenuAdmin } from "@/components/admin/MenuAdmin";

export default function AdminMenuPage() {
  verificarAdminServer();
  return <MenuAdmin />;
}
