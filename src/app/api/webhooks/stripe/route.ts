import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { imprimirTicket } from "@/lib/printer";
import { notificar } from "@/lib/notificaciones";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("[Webhook Stripe] STRIPE_WEBHOOK_SECRET no configurado");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, secret);
  } catch (err) {
    console.warn("[Webhook Stripe] Firma inválida:", err);
    return NextResponse.json({ ok: false, error: "Firma inválida" }, { status: 401 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const pedidoId = parseInt(session.metadata?.pedidoId ?? "");

    if (!pedidoId || isNaN(pedidoId)) {
      console.warn("[Webhook Stripe] Session sin pedidoId en metadata");
      return NextResponse.json({ ok: true });
    }

    if (session.payment_status === "paid") {
      try {
        const pedido = await prisma.pedido.update({
          where: { id: pedidoId },
          data: {
            estadoPago: "PAGADO",
            estado: "CONFIRMADO",
            mpPaymentId: session.payment_intent as string,
          },
          include: { items: { include: { producto: true } } },
        });

        console.log(`[Webhook Stripe] Pago aprobado — Pedido #${pedido.numeroPedido}`);

        imprimirTicket(pedido).catch((e) =>
          console.error("[Webhook Stripe] Error de impresión:", e)
        );
        notificar("pedido.pago_confirmado", pedido).catch(() => {});
      } catch (error) {
        console.error("[Webhook Stripe]", error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
