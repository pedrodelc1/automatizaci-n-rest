import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esAdminAutorizado } from "@/lib/admin-auth";
import { restaurante } from "@/config/restaurante";
import { FormaPago } from "@prisma/client";

function formatPago(formaPago: FormaPago, montoCon: number | null): string {
  switch (formaPago) {
    case FormaPago.EFECTIVO:
      return montoCon
        ? `Efectivo — paga con $${Number(montoCon).toLocaleString("es-AR")}`
        : "Efectivo al recibir";
    case FormaPago.TARJETA_DEBITO:   return "Tarjeta débito al recibir";
    case FormaPago.TARJETA_CREDITO:  return "Tarjeta crédito al recibir";
    case FormaPago.CONTRA_ENTREGA:   return "Efectivo / posnet al recibir";
    case FormaPago.ONLINE:           return "Pago online";
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!esAdminAutorizado(req)) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const id = parseInt(params.id);
  if (isNaN(id)) {
    return new NextResponse("ID inválido", { status: 400 });
  }

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { items: { include: { producto: true } } },
  });

  if (!pedido) {
    return new NextResponse("Pedido no encontrado", { status: 404 });
  }

  const numPedido = String(pedido.numeroPedido).padStart(4, "0");
  const hora = new Date(pedido.creadoEn).toLocaleString("es-AR", {
    timeZone: restaurante.timezone,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

  const total = Number(pedido.total).toLocaleString("es-AR");
  const esDelivery = pedido.tipo === "DELIVERY";
  const pago = formatPago(pedido.formaPago, pedido.montoCon ? Number(pedido.montoCon) : null);

  const itemsHtml = pedido.items
    .map(
      (item) => `
      <tr>
        <td>${item.cantidad}×</td>
        <td>${item.producto.nombre}${item.notasItem ? `<br><small class="nota">${item.notasItem}</small>` : ""}</td>
        <td class="monto">$${Number(item.subtotal).toLocaleString("es-AR")}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ticket #${numPedido}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 20px;
    }
    .ticket {
      background: white;
      width: 300px;
      padding: 20px 16px;
      border-radius: 4px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.12);
    }
    .centro { text-align: center; }
    .titulo { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
    .subtitulo { font-size: 11px; color: #666; margin-bottom: 12px; }
    .num-pedido { font-size: 28px; font-weight: bold; letter-spacing: -1px; margin: 8px 0; }
    .linea { border: none; border-top: 1px dashed #aaa; margin: 10px 0; }
    .fila { display: flex; justify-content: space-between; margin: 3px 0; font-size: 12px; }
    .fila .etiqueta { color: #555; }
    .fila .valor { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    td { padding: 3px 2px; vertical-align: top; font-size: 12px; }
    td:last-child { text-align: right; white-space: nowrap; }
    .nota { color: #888; font-size: 10px; }
    .total-row { font-size: 15px; font-weight: bold; margin-top: 6px; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
      margin-top: 4px;
    }
    .badge-delivery { background: #e0f2fe; color: #0369a1; }
    .badge-retiro   { background: #f0fdf4; color: #15803d; }
    .notas-box {
      background: #fffbeb;
      border: 1px dashed #f59e0b;
      border-radius: 3px;
      padding: 6px 8px;
      font-size: 11px;
      color: #92400e;
      margin: 6px 0;
    }
    .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 12px; }

    @media print {
      body { background: white; padding: 0; }
      .ticket { box-shadow: none; width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="centro">
      <div class="titulo">${restaurante.nombre}</div>
      <div class="subtitulo">${restaurante.direccion}</div>
      <div class="num-pedido">#${numPedido}</div>
      <span class="badge ${esDelivery ? "badge-delivery" : "badge-retiro"}">
        ${esDelivery ? "🛵 DELIVERY" : "🏪 RETIRO"}
      </span>
    </div>

    <hr class="linea">

    <div class="fila"><span class="etiqueta">Hora</span><span class="valor">${hora} hs</span></div>
    <div class="fila"><span class="etiqueta">Cliente</span><span class="valor">${pedido.nombreCliente}</span></div>
    <div class="fila"><span class="etiqueta">Teléfono</span><span class="valor">${pedido.telefono}</span></div>
    ${esDelivery && pedido.direccionEntrega ? `<div class="fila"><span class="etiqueta">Dirección</span><span class="valor" style="max-width:160px;text-align:right">${pedido.direccionEntrega}</span></div>` : ""}

    <hr class="linea">

    <table>
      <tbody>${itemsHtml}</tbody>
    </table>

    <hr class="linea">

    <div class="fila total-row"><span>TOTAL</span><span>$${total}</span></div>
    <div class="fila"><span class="etiqueta">Pago</span><span class="valor">${pago}</span></div>

    ${pedido.notas ? `<div class="notas-box">📝 ${pedido.notas}</div>` : ""}

    <div class="footer">Imprimí con Ctrl+P</div>

    <div class="no-print" style="margin-top:20px;text-align:center">
      <button onclick="window.print()" style="padding:8px 20px;background:#f97316;color:white;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-family:inherit">
        🖨️ Imprimir
      </button>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
