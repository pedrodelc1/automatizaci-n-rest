import {
  type Categoria,
  type Producto,
  type Pedido,
  type ItemPedido,
} from "@prisma/client";

// ─── Menú ────────────────────────────────────────────────────────────────────

export type ProductoConCategoria = Producto & {
  categoria: Categoria;
};

export type CategoriaConProductos = Categoria & {
  productos: Producto[];
};

// ─── Carrito (estado del cliente, solo en frontend) ───────────────────────────

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  notasItem?: string;
}

// ─── Pedido ───────────────────────────────────────────────────────────────────

export type PedidoConItems = Pedido & {
  items: (ItemPedido & { producto: Producto })[];
};

// ─── Payload para crear un pedido ─────────────────────────────────────────────

export type FormaPagoCliente =
  | "ONLINE"
  | "EFECTIVO"
  | "TARJETA_DEBITO"
  | "TARJETA_CREDITO"
  | "CONTRA_ENTREGA";

export interface CrearPedidoPayload {
  tipo: "DELIVERY" | "RETIRO";
  nombreCliente: string;
  telefono: string;
  email: string;
  direccionEntrega?: string;
  formaPago: FormaPagoCliente;
  montoCon?: number;
  notas?: string;
  items: {
    productoId: number;
    cantidad: number;
    notasItem?: string;
  }[];
}

// ─── Respuestas de API ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
