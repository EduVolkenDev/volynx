import Stripe from "stripe"

let stripeClient: Stripe | null = null

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey || secretKey.includes("replace_me")) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-04-22.dahlia",
      appInfo: {
        name: "VolynxOS PropertyFlow",
        version: "1.0.0"
      }
    })
  }

  return stripeClient
}

export function getBaseUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "")
  }

  const origin = request.headers.get("origin")

  if (origin) {
    return origin
  }

  const host = request.headers.get("host")
  const protocol = host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https"

  return host ? `${protocol}://${host}` : "http://127.0.0.1:3000"
}

export function allowTestStripeDelivery() {
  return process.env.ALLOW_TEST_STRIPE_DELIVERY === "true"
}
