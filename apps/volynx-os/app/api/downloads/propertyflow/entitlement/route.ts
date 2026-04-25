import { NextResponse } from "next/server"
import {
  getPropertyFlowZipMeta,
  isPropertyFlowTierId,
  previewDownloadsEnabled,
  verifyPropertyFlowSession
} from "@/lib/propertyflow-commerce"
import { getPropertyFlowTier, propertyFlowVersion } from "@/content/propertyflow"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const sessionId = url.searchParams.get("session_id")
  const preview = url.searchParams.get("preview") === "1"

  if (preview) {
    if (!previewDownloadsEnabled()) {
      return NextResponse.json({ error: "Preview downloads are disabled." }, { status: 403 })
    }

    const tierId = url.searchParams.get("tier")

    if (!isPropertyFlowTierId(tierId)) {
      return NextResponse.json({ error: "Invalid preview tier." }, { status: 400 })
    }

    const tier = getPropertyFlowTier(tierId)
    const zip = getPropertyFlowZipMeta(tierId)

    return NextResponse.json({
      mode: "preview",
      tier: tier.id,
      tierName: tier.name,
      filename: zip.filename,
      bytes: zip.bytes,
      version: propertyFlowVersion,
      customerEmail: null
    })
  }

  if (!sessionId) {
    return NextResponse.json({ error: "Stripe checkout session is required." }, { status: 400 })
  }

  try {
    const purchase = await verifyPropertyFlowSession(sessionId)

    return NextResponse.json({
      mode: "stripe",
      tier: purchase.tierId,
      tierName: purchase.tierName,
      filename: purchase.filename,
      bytes: purchase.bytes,
      version: purchase.version,
      customerEmail: purchase.customerEmail
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delivery is not authorized."

    return NextResponse.json({ error: message }, { status: 403 })
  }
}
