import { ThermalPrinter, PrinterTypes, CharacterSet } from "node-thermal-printer";
import { type Pedido, type ItemPedido, type Producto, TipoPedido, FormaPago, EstadoPago } from "@prisma/client";

type PedidoConItems = Pedido & {
  items: (ItemPedido & { producto: Producto })[];
};

// Cola en memoria para reintentos cuando la impresora no está disponible
const printQueue: PedidoConItems[] = [];
let isProcessingQueue = false;

function getPrinter(): ThermalPrinter {
  return new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `tcp://${process.env.PRINTER_IP}:${process.env.PRINTER_PORT ?? "9100"}`,
    characterSet: CharacterSet.PC858_EURO,
    removeSpecialCharacters: false,
    lineCharacter: "-",
    options: {
      timeout: 5000,
    },
  });
}

function formatPrecio(valor: number | { toNumber: () => number }): string {
  const num = typeof valor === "number" ? valor : valor.toNumber();
  return `$${num.toLocaleString("es-AR")}`;
}

function padLine(left: string, right: string, width = 32): string {
  const spaces = width - left.length - right.length;
  return left + " ".repeat(Math.max(1, spaces)) + right;
}

export async function imprimirTicket(pedido: PedidoConItems): Promise<void> {
  const printer = getPrinter();

  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    console.warn(
      `[Printer] Impresora no disponible. Pedido #${pedido.numeroPedido} encolado para reintento.`
    );
    printQueue.push(pedido);
    scheduleRetry();
    return;
  }

  try {
    await buildTicket(printer, pedido);
    await printer.execute();
    console.log(`[Printer] Ticket impreso OK — Pedido #${String(pedido.numeroPedido).padStart(4, "0")}`);
  } catch (error) {
    console.error(
      `[Printer] Error al imprimir pedido #${pedido.numeroPedido}:`,
      error
    );
    printQueue.push(pedido);
    scheduleRetry();
  }
}

async function buildTicket(
  printer: ThermalPrinter,
  pedido: PedidoConItems
): Promise<void> {
  const hora = new Date(pedido.creadoEn).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const numPedido = String(pedido.numeroPedido).padStart(4, "0");
  const modalidad = pedido.tipo === TipoPedido.DELIVERY ? "DELIVERY" : "RETIRO";

  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println(`PEDIDO #${numPedido} — ${modalidad}`);
  printer.setTextNormal();
  printer.bold(false);
  printer.drawLine();

  printer.alignLeft();
  printer.println(`Hora: ${hora} hs`);
  printer.println(`Cliente: ${pedido.nombreCliente}`);
  printer.println(`Tel: ${pedido.telefono}`);

  if (pedido.tipo === TipoPedido.DELIVERY && pedido.direccionEntrega) {
    printer.println(`Direccion: ${pedido.direccionEntrega}`);
  }

  printer.drawLine();
  printer.bold(true);
  printer.println("ITEMS:");
  printer.bold(false);

  for (const item of pedido.items) {
    const linea = padLine(
      `${item.cantidad}x ${item.producto.nombre}`,
      formatPrecio(item.subtotal)
    );
    printer.println(linea);
    if (item.notasItem) {
      printer.println(`   -> ${item.notasItem}`);
    }
  }

  printer.drawLine();
  printer.bold(true);
  printer.println(padLine("TOTAL:", formatPrecio(pedido.total)));
  printer.bold(false);
  printer.drawLine();

  // Estado de pago
  if (pedido.formaPago === FormaPago.ONLINE) {
    const pagado = pedido.estadoPago === EstadoPago.PAGADO;
    printer.println(`PAGO: Online (${pagado ? "Pagado OK" : "Pendiente"})`);
  } else if (pedido.formaPago === FormaPago.EFECTIVO) {
    const montoStr = pedido.montoCon ? ` - paga con $${Number(pedido.montoCon).toLocaleString("es-AR")}` : "";
    printer.println(`PAGO: Efectivo${montoStr}`);
  } else if (pedido.formaPago === FormaPago.TARJETA_DEBITO) {
    printer.println("PAGO: Tarjeta debito al recibir");
  } else if (pedido.formaPago === FormaPago.TARJETA_CREDITO) {
    printer.println("PAGO: Tarjeta credito al recibir");
  } else {
    printer.println("PAGO: Efectivo/Posnet contra entrega");
  }

  if (pedido.notas) {
    printer.drawLine();
    printer.println(`Notas: ${pedido.notas}`);
  }

  printer.drawLine();
  // Avanzar papel y cortar
  printer.cut();
}

// Reintenta la cola cada 60 segundos si hay pedidos pendientes
function scheduleRetry(): void {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  setTimeout(async () => {
    isProcessingQueue = false;
    if (printQueue.length === 0) return;

    console.log(
      `[Printer] Reintentando cola: ${printQueue.length} pedido(s) pendiente(s).`
    );
    const pending = [...printQueue];
    printQueue.length = 0;

    for (const pedido of pending) {
      await imprimirTicket(pedido);
    }
  }, 60_000);
}
