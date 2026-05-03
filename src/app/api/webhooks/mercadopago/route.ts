import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { imprimirTicket } from "@/lib/printer";
import { notificar } from "@/lib/notificaciones";

// MercadoPago envía la firma en el header x-signature con formato:
// "ts=<timestamp>,v1=<hash>"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validarFirma(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  // Si no hay secret configurado, salteamos la validación (solo en dev)
  if (!secret) {
    console.warn("[Webhook MP] MP_WEBHOOK_SECRET no configurado — omitiendo validación");
    return true;
  }

  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";
  const dataId = new URL(req.url).searchParams.get("data.id") ?? "";

  // Extraer ts y v1 del header x-signature
  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => p.split("=") as [string, string])
  );
  const ts = parts["ts"] ?? "";
  const v1 = parts["v1"] ?? "";

  if (!ts || !v1) return false;

  // El manifest es: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(v1, "hex"),
    Buffer.from(expectedHash, "hex")
  );
}

export async function POST(req: NextRequest) {
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Validar firma antes de procesar
  if (!validarFirma(req, rawBody)) {
    console.warn("[Webhook MP] Firma inválida — request rechazado");
    return NextResponse.json({ ok: false, error: "Firma inválida" }, { status: 401 });
  }

  let body: { type?: string; data?: { id?: string } };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Solo nos interesan las notificaciones de pago
  if (body.type !== "payment") {
    return NextResponse.json({ ok: true });
  }

  const paymentId = body.data?.id;
  if (!paymentId) {
    return NextResponse.json({ ok: false, error: "payment id faltante" }, { status: 400 });
  }

  try {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
    });

    // Consultar el pago a la API de MP para obtener los datos reales
    const payment = new Payment(client);
    const pagoData = await payment.get({ id: paymentId });

    const externalRef = pagoData.external_reference;
    if (!externalRef) {
      console.warn("[Webhook MP] Pago sin external_reference:", paymentId);
      return NextResponse.json({ ok: true });
    }

    const pedidoId = parseInt(externalRef);
    const status = pagoData.status; // approved | rejected | pending

    if (status === "approved") {
      const pedido = await prisma.pedido.update({
        where: { id: pedidoId },
        data: {
          estadoPago: "PAGADO",
          estado: "CONFIRMADO",
          mpPaymentId: String(paymentId),
        },
        include: { items: { include: { producto: true } } },
      });

      console.log(`[Webhook MP] Pago aprobado — Pedido #${pedido.numeroPedido}`);

      imprimirTicket(pedido).catch((e) =>
        console.error("[Webhook MP] Error de impresión:", e)
      );
      notificar("pedido.pago_confirmado", pedido).catch(() => {});
    } else if (status === "rejected") {
      const pedido = await prisma.pedido.update({
        where: { id: pedidoId },
        data: { estadoPago: "FALLIDO", mpPaymentId: String(paymentId) },
        include: { items: { include: { producto: true } } },
      });
      console.log(`[Webhook MP] Pago rechazado — Pedido ID ${pedidoId}`);
      notificar("pedido.pago_fallido", pedido).catch(() => {});
    }
    // "pending" no requiere acción, MP notificará de nuevo cuando cambie

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Webhook MP]", error);
    // Devolver 200 de todas formas para que MP no reintente indefinidamente
    return NextResponse.json({ ok: true });
  }
}
