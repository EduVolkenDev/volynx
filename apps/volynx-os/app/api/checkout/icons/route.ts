import { NextResponse } from "next/server"
import { getIconPack } from "@/lib/icons-commerce"
import { getBaseUrl, getStripe } from "@/lib/stripe"

export const runtime = "nodejs"

type CheckoutRequestBody = {
  pack?: string
}

export async function POST(request: Request) {
  let body: CheckoutRequestBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid checkout payload." }, { status: 400 })
  }

  if (!body.pack) {
    return NextResponse.json({ error: "Icon pack is required." }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    const baseUrl = getBaseUrl(request)
    const pack = getIconPack(body.pack)

    if (pack.plan !== "premium" || pack.priceAmount <= 0) {
      return NextResponse.json({ error: "This icon pack does not require checkout." }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${baseUrl}/dashboard/purchases/icons?session_id={CHECKOUT_SESSION_ID}&pack=${pack.slug}`,
      cancel_url: `${baseUrl}/icons-store?checkout=cancelled&pack=${pack.slug}`,
      client_reference_id: `icons-store:${pack.slug}`,
      customer_creation: "if_required",
      allow_promotion_codes: true,
      invoice_creation: {
        enabled: true
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: pack.priceCurrency,
            unit_amount: pack.priceAmount,
            product_data: {
              name: pack.name,
              description: `${pack.priceDetail}. Instant ZIP delivery after checkout.`,
              metadata: {
                product: "icons-store",
                pack: pack.slug
              }
            }
          }
        }
      ],
      metadata: {
        product: "icons-store",
        pack: pack.slug,
        packName: pack.name,
        filename: `${pack.slug}.zip`
      },
      payment_intent_data: {
        metadata: {
          product: "icons-store",
          pack: pack.slug,
          packName: pack.name,
          filename: `${pack.slug}.zip`
        }
      }
    })

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 })
    }

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout session."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
