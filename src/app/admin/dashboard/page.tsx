import { verificarAdminServer } from "@/lib/admin-auth";
import { Dashboard } from "@/components/admin/Dashboard";

export default function AdminDashboardPage() {
  verificarAdminServer();
  return <Dashboard />;
}
