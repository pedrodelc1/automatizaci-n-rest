/**
 * Detección automática del proveedor de pagos según las variables de entorno.
 *
 * Para MercadoPago (Argentina): setear MP_ACCESS_TOKEN y MP_PUBLIC_KEY
 * Para Stripe (internacional):  setear STRIPE_SECRET_KEY y STRIPE_PUBLISHABLE_KEY
 *
 * Si están ambas configuradas, MercadoPago tiene prioridad.
 */

export type PaymentProvider = "mercadopago" | "stripe";

export function getPaymentProvider(): PaymentProvider {
  const mpToken = process.env.MP_ACCESS_TOKEN ?? "";
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";

  if (mpToken && !mpToken.includes("xxxx")) return "mercadopago";
  if (stripeKey) return "stripe";

  // Default — MP aunque no esté configurado (evita romper la app)
  return "mercadopago";
}

export function getProviderLabel(): string {
  return getPaymentProvider() === "stripe" ? "Stripe" : "MercadoPago";
}
