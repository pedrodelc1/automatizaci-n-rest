import { type Pedido, type ItemPedido, type Producto } from "@prisma/client";

type PedidoConItems = Pedido & {
  items: (ItemPedido & { producto: Producto })[];
};

// Todos los eventos que puede emitir el sistema
export type EventoTipo =
  | "pedido.nuevo"           // Pedido creado (contra entrega)
  | "pedido.pago_confirmado" // MercadoPago aprobó el pago
  | "pedido.pago_fallido"    // MercadoPago rechazó el pago
  | "pedido.en_preparacion"  // Cocina empezó a preparar
  | "pedido.listo"           // Pedido listo para entregar/retirar
  | "pedido.entregado"       // Pedido entregado
  | "pedido.cancelado"       // Pedido cancelado
  | "impresora.error";       // No se pudo imprimir el ticket

export interface EventoPayload {
  evento: EventoTipo;
  timestamp: string;
  restaurante: string;
  pedido: {
    id: number;
    numero: string;           // "#0042"
    tipo: string;             // "DELIVERY" | "RETIRO"
    cliente: {
      nombre: string;
      telefono: string;
      email: string;
    };
    direccionEntrega: string | null;
    formaPago: string;
    estadoPago: string;
    total: number;
    items: {
      nombre: string;
      cantidad: number;
      subtotal: number;
      notas: string | null;
    }[];
    notas: string | null;
  };
}

async function enviarWebhook(url: string, payload: EventoPayload): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[N8N] Webhook ${url} respondió ${res.status} para evento "${payload.evento}"`);
    } else {
      console.log(`[N8N] Evento "${payload.evento}" enviado a ${url}`);
    }
  } catch (error) {
    console.error(`[N8N] Error enviando a ${url}:`, error);
  }
}

export async function notificar(
  tipo: EventoTipo,
  pedido: PedidoConItems
): Promise<void> {
  const webhookCliente = process.env.N8N_WEBHOOK_URL;
  const webhookDueno = process.env.N8N_WEBHOOK_DUENO_URL;

  if (!webhookCliente && !webhookDueno) return;

  const payload: EventoPayload = {
    evento: tipo,
    timestamp: new Date().toISOString(),
    restaurante: process.env.RESTAURANTE_NOMBRE ?? "El Restaurante",
    pedido: {
      id: pedido.id,
      numero: `#${String(pedido.numeroPedido).padStart(4, "0")}`,
      tipo: pedido.tipo,
      cliente: {
        nombre: pedido.nombreCliente,
        telefono: pedido.telefono,
        email: pedido.email,
      },
      direccionEntrega: pedido.direccionEntrega,
      formaPago: pedido.formaPago,
      estadoPago: pedido.estadoPago,
      total: Number(pedido.total),
      items: pedido.items.map((i) => ({
        nombre: i.producto.nombre,
        cantidad: i.cantidad,
        subtotal: Number(i.subtotal),
        notas: i.notasItem ?? null,
      })),
      notas: pedido.notas ?? null,
    },
  };

  const envios: Promise<void>[] = [];
  if (webhookCliente) envios.push(enviarWebhook(webhookCliente, payload));
  if (webhookDueno)   envios.push(enviarWebhook(webhookDueno, payload));
  await Promise.all(envios);
}
