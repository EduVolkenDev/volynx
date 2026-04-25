import { statSync } from "node:fs"
import path from "node:path"
import type Stripe from "stripe"
import {
  getPropertyFlowTier,
  propertyFlowPriceMatrix,
  propertyFlowTiers,
  propertyFlowVersion,
  type PropertyFlowCurrencyCode,
  type PropertyFlowTierId
} from "@/content/propertyflow"
import { getStripe } from "@/lib/stripe"

export type VerifiedPropertyFlowPurchase = {
  sessionId: string
  tierId: PropertyFlowTierId
  tierName: string
  currency: PropertyFlowCurrencyCode
  amountTotal: number
  customerEmail: string | null
  filename: string
  bytes: number
  version: string
}

function getSessionCatalogAmount(session: Stripe.Checkout.Session) {
  return session.amount_subtotal ?? session.amount_total
}

export const propertyFlowStorageDir = path.join(process.cwd(), "storage", "propertyflow")

export function isPropertyFlowTierId(value: unknown): value is PropertyFlowTierId {
  return propertyFlowTiers.some((tier) => tier.id === value)
}

export function isPropertyFlowCurrencyCode(value: unknown): value is PropertyFlowCurrencyCode {
  return typeof value === "string" && value in propertyFlowPriceMatrix
}

export function getPropertyFlowPrice(tierId: PropertyFlowTierId, currency: PropertyFlowCurrencyCode) {
  return propertyFlowPriceMatrix[currency][tierId]
}

export function getPropertyFlowZipPath(filename: string) {
  if (!filename.startsWith("propertyflow-") || !filename.endsWith(".zip") || filename.includes("..")) {
    throw new Error("Invalid PropertyFlow filename")
  }

  return path.join(propertyFlowStorageDir, filename)
}

export function getPropertyFlowZipMeta(tierId: PropertyFlowTierId) {
  const tier = getPropertyFlowTier(tierId)
  const filePath = getPropertyFlowZipPath(tier.downloadFile)

  return {
    filename: tier.downloadFile,
    filePath,
    bytes: statSync(filePath).size
  }
}

function getSessionTier(session: Stripe.Checkout.Session): PropertyFlowTierId {
  const tier = session.metadata?.tier

  if (!isPropertyFlowTierId(tier)) {
    throw new Error("Stripe session does not contain a valid PropertyFlow tier")
  }

  return tier
}

function getSessionCurrency(session: Stripe.Checkout.Session): PropertyFlowCurrencyCode {
  const currency = session.metadata?.currency?.toUpperCase()

  if (isPropertyFlowCurrencyCode(currency)) {
    return currency
  }

  const stripeCurrency = session.currency?.toUpperCase()

  if (isPropertyFlowCurrencyCode(stripeCurrency)) {
    return stripeCurrency
  }

  throw new Error("Stripe session does not contain a valid PropertyFlow currency")
}

export async function verifyPropertyFlowSession(sessionId: string): Promise<VerifiedPropertyFlowPurchase> {
  if (!sessionId.startsWith("cs_")) {
    throw new Error("Invalid Stripe Checkout session ID")
  }

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.metadata?.product !== "propertyflow") {
    throw new Error("Stripe session is not for PropertyFlow")
  }

  if (session.mode !== "payment" || session.payment_status !== "paid" || session.status !== "complete") {
    throw new Error("Stripe session is not paid and complete")
  }

  if (process.env.NODE_ENV === "production" && !session.livemode) {
    throw new Error("Test Stripe sessions cannot unlock production delivery")
  }

  const tierId = getSessionTier(session)
  const currency = getSessionCurrency(session)
  const expected = getPropertyFlowPrice(tierId, currency)

  if (
    getSessionCatalogAmount(session) !== expected.amount ||
    session.currency !== propertyFlowPriceMatrix[currency].stripeCurrency
  ) {
    throw new Error("Stripe session amount does not match the PropertyFlow tier price")
  }

  const tier = getPropertyFlowTier(tierId)
  const zip = getPropertyFlowZipMeta(tierId)

  return {
    sessionId: session.id,
    tierId,
    tierName: tier.name,
    currency,
    amountTotal: session.amount_total ?? 0,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    filename: zip.filename,
    bytes: zip.bytes,
    version: session.metadata?.version ?? propertyFlowVersion
  }
}

export function previewDownloadsEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.PROPERTYFLOW_ENABLE_PREVIEW_DOWNLOADS === "true"
}
