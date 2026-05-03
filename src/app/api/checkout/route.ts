import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import Stripe from "stripe";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/pagos";

const schema = z.object({
  pedidoId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "ID de pedido inválido" }, { status: 400 });
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id: parsed.data.pedidoId },
      include: { items: { include: { producto: true } } },
    });

    if (!pedido) {
      return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
    }
    if (pedido.formaPago !== "ONLINE") {
      return NextResponse.json({ ok: false, error: "Este pedido no requiere pago online" }, { status: 400 });
    }
    if (pedido.estadoPago === "PAGADO") {
      return NextResponse.json({ ok: false, error: "Este pedido ya fue pagado" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
    const provider = getPaymentProvider();

    // ── MercadoPago ───────────────────────────────────────────────────────────
    if (provider === "mercadopago") {
      const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
      const preference = new Preference(client);

      const response = await preference.create({
        body: {
          external_reference: String(pedido.id),
          items: pedido.items.map((item) => ({
            id: String(item.productoId),
            title: item.producto.nombre,
            quantity: item.cantidad,
            unit_price: item.precioUnitario.toNumber(),
            currency_id: "ARS",
          })),
          payer: {
            name: pedido.nombreCliente,
            email: pedido.email,
            phone: { number: pedido.telefono },
          },
          back_urls: {
            success: `${baseUrl}/confirmacion/${pedido.id}?status=success`,
            failure: `${baseUrl}/checkout/${pedido.id}?status=failure`,
            pending: `${baseUrl}/confirmacion/${pedido.id}?status=pending`,
          },
          ...(baseUrl.startsWith("https://") && { auto_return: "approved" }),
          notification_url: `${baseUrl}/api/webhooks/mercadopago`,
          statement_descriptor: process.env.RESTAURANTE_NOMBRE ?? "RESTAURANTE",
          expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      });

      return NextResponse.json({
        ok: true,
        data: {
          preferenceId: response.id,
          checkoutUrl: response.init_point,
          sandboxUrl: response.sandbox_init_point,
        },
      });
    }

    // ── Stripe ────────────────────────────────────────────────────────────────
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      metadata: { pedidoId: String(pedido.id) },
      customer_email: pedido.email,
      line_items: pedido.items.map((item) => ({
        quantity: item.cantidad,
        price_data: {
          currency: process.env.STRIPE_CURRENCY ?? "ars",
          unit_amount: Math.round(item.precioUnitario.toNumber() * 100), // centavos
          product_data: { name: item.producto.nombre },
        },
      })),
      success_url: `${baseUrl}/confirmacion/${pedido.id}?status=success`,
      cancel_url: `${baseUrl}/checkout/${pedido.id}?status=failure`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
    });

    return NextResponse.json({
      ok: true,
      data: {
        sessionId: session.id,
        checkoutUrl: session.url,
        sandboxUrl: session.url,
      },
    });
  } catch (error) {
    console.error("[POST /api/checkout]", error);
    return NextResponse.json({ ok: false, error: "Error al crear la preferencia de pago" }, { status: 500 });
  }
}
