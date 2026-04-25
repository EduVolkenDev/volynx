import { NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret || webhookSecret.includes("replace_me")) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 })
  }

  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 })
  }

  const payload = await request.text()
  const stripe = getStripe()

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)

    if (event.type === "checkout.session.completed") {
      const session = event.data.object
      console.info("Volynx checkout completed", {
        id: session.id,
        product: session.metadata?.product,
        tier: session.metadata?.tier,
        pack: session.metadata?.pack,
        amount: session.amount_total,
        subtotal: session.amount_subtotal,
        currency: session.currency,
        livemode: session.livemode
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook signature."

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
