import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  getPropertyFlowPrice,
  getPropertyFlowZipMeta,
  isPropertyFlowCurrencyCode,
  isPropertyFlowTierId
} from "@/lib/propertyflow-commerce"
import { getBaseUrl, getStripe } from "@/lib/stripe"
import { getPropertyFlowTier, propertyFlowPriceMatrix, propertyFlowVersion } from "@/content/propertyflow"
import { getPropertyFlowPublicUrl } from "@/lib/volynx-public"

export const runtime = "nodejs"

type CheckoutRequestBody = {
  tier?: string
  currency?: string
}

async function getCheckoutUser(request: Request) {
  const authorization = request.headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase authentication is not configured for checkout.")
  }

  const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } }
  })
  const { data, error } = await authenticatedClient.auth.getUser()

  if (error || !data.user) {
    return null
  }

  return data.user
}

export async function POST(request: Request) {
  let body: CheckoutRequestBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid checkout payload." }, { status: 400 })
  }

  if (!isPropertyFlowTierId(body.tier)) {
    return NextResponse.json({ error: "Invalid PropertyFlow tier." }, { status: 400 })
  }

  if (!isPropertyFlowCurrencyCode(body.currency)) {
    return NextResponse.json({ error: "Invalid checkout currency." }, { status: 400 })
  }

  try {
    const user = await getCheckoutUser(request)

    if (!user) {
      return NextResponse.json({
        error: "Sign in before starting PropertyFlow checkout.",
        code: "AUTH_REQUIRED"
      }, { status: 401 })
    }

    const stripe = getStripe()
    const baseUrl = getBaseUrl(request)
    const tier = getPropertyFlowTier(body.tier)
    const price = getPropertyFlowPrice(body.tier, body.currency)
    const zip = getPropertyFlowZipMeta(body.tier)

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${baseUrl}/dashboard/purchases/propertyflow?session_id={CHECKOUT_SESSION_ID}&tier=${tier.id}`,
      cancel_url: getPropertyFlowPublicUrl({ checkout: "cancelled", tier: tier.id }),
      client_reference_id: `propertyflow:${tier.id}`,
      customer_email: user.email || undefined,
      customer_creation: "if_required",
      allow_promotion_codes: true,
      invoice_creation: {
        enabled: true
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: propertyFlowPriceMatrix[body.currency].stripeCurrency,
            unit_amount: price.amount,
            product_data: {
              name: `PropertyFlow ${tier.name}`,
              description: `${tier.note}. Includes the hosted workspace and an optional technical package (${zip.filename}).`,
              metadata: {
                product: "propertyflow",
                tier: tier.id,
                version: propertyFlowVersion
              }
            }
          }
        }
      ],
      metadata: {
        product: "propertyflow",
        user_id: user.id,
        customer_email: user.email || "",
        tier: tier.id,
        tierName: tier.name,
        currency: body.currency,
        version: propertyFlowVersion,
        filename: zip.filename,
        fulfillment: "workspace-v1"
      },
      payment_intent_data: {
        metadata: {
          product: "propertyflow",
          user_id: user.id,
          tier: tier.id,
          currency: body.currency,
          version: propertyFlowVersion,
          filename: zip.filename,
          fulfillment: "workspace-v1"
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
