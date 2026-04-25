import { NextResponse } from "next/server"
import {
  getIconPack,
  getIconPackMeta,
  previewIconDownloadsEnabled,
  verifyIconPackSession
} from "@/lib/icons-commerce"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const sessionId = url.searchParams.get("session_id")
  const requestedPack = url.searchParams.get("pack")
  const preview = url.searchParams.get("preview") === "1"

  if (preview) {
    if (!previewIconDownloadsEnabled()) {
      return NextResponse.json({ error: "Preview downloads are disabled." }, { status: 403 })
    }

    if (!requestedPack) {
      return NextResponse.json({ error: "Icon pack is required." }, { status: 400 })
    }

    try {
      const pack = getIconPack(requestedPack)
      const meta = getIconPackMeta(pack)

      return NextResponse.json({
        mode: "preview",
        pack: pack.slug,
        packName: pack.name,
        filename: meta.filename,
        bytes: meta.bytes,
        files: meta.files,
        customerEmail: null
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid icon pack."

      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  if (!sessionId) {
    return NextResponse.json({ error: "Stripe checkout session is required." }, { status: 400 })
  }

  try {
    const purchase = await verifyIconPackSession(sessionId, requestedPack)
    const meta = getIconPackMeta(purchase.pack)

    return NextResponse.json({
      mode: "stripe",
      pack: purchase.pack.slug,
      packName: purchase.pack.name,
      filename: meta.filename,
      bytes: meta.bytes,
      files: meta.files,
      customerEmail: purchase.customerEmail
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delivery is not authorized."

    return NextResponse.json({ error: message }, { status: 403 })
  }
}
