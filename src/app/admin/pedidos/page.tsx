import { verificarAdminServer } from "@/lib/admin-auth";
import { PedidosCliente } from "@/components/admin/PedidosCliente";

export default function AdminPedidosPage() {
  verificarAdminServer();
  return <PedidosCliente />;
}
