import { NextResponse } from "next/server"
import {
  getIconPack,
  getIconPackMeta,
  getIconPackZipEntries,
  previewIconDownloadsEnabled,
  verifyIconPackSession
} from "@/lib/icons-commerce"
import { createZipReadableStream } from "@/lib/zip-stream"

export const runtime = "nodejs"

type DownloadRequestBody = {
  sessionId?: string
  pack?: string
  preview?: boolean
}

function downloadUrl(request: Request, sessionId: string, pack: string) {
  const url = new URL(request.url)
  url.search = ""
  url.searchParams.set("session_id", sessionId)
  url.searchParams.set("pack", pack)

  return `${url.pathname}${url.search}`
}

function previewDownloadUrl(request: Request, pack: string) {
  const url = new URL(request.url)
  url.search = ""
  url.searchParams.set("preview", "1")
  url.searchParams.set("pack", pack)

  return `${url.pathname}${url.search}`
}

export async function POST(request: Request) {
  let body: DownloadRequestBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid download payload." }, { status: 400 })
  }

  if (body.preview) {
    if (!previewIconDownloadsEnabled()) {
      return NextResponse.json({ error: "Preview downloads are disabled." }, { status: 403 })
    }

    if (!body.pack) {
      return NextResponse.json({ error: "Icon pack is required." }, { status: 400 })
    }

    const pack = getIconPack(body.pack)

    return NextResponse.json({ url: previewDownloadUrl(request, pack.slug), pack: pack.slug })
  }

  if (!body.sessionId) {
    return NextResponse.json({ error: "Stripe checkout session is required." }, { status: 400 })
  }

  try {
    const purchase = await verifyIconPackSession(body.sessionId, body.pack)
    const meta = getIconPackMeta(purchase.pack)

    return NextResponse.json({
      url: downloadUrl(request, purchase.sessionId, purchase.pack.slug),
      pack: purchase.pack.slug,
      filename: meta.filename,
      bytes: meta.bytes,
      files: meta.files
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download is not authorized."

    return NextResponse.json({ error: message }, { status: 403 })
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const preview = url.searchParams.get("preview") === "1"
  const sessionId = url.searchParams.get("session_id")
  const requestedPack = url.searchParams.get("pack")

  try {
    const pack = preview
      ? getPreviewPack(requestedPack)
      : (await verifyIconPackSession(requiredSessionId(sessionId), requestedPack)).pack
    const meta = getIconPackMeta(pack)
    const stream = createZipReadableStream(getIconPackZipEntries(pack))

    return new Response(stream, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${meta.filename}"`,
        "cache-control": "private, no-store, max-age=0"
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download is not authorized."

    return NextResponse.json({ error: message }, { status: 403 })
  }
}

function getPreviewPack(packSlug: string | null) {
  if (!previewIconDownloadsEnabled()) {
    throw new Error("Preview downloads are disabled.")
  }

  if (!packSlug) {
    throw new Error("Icon pack is required.")
  }

  return getIconPack(packSlug)
}

function requiredSessionId(sessionId: string | null) {
  if (!sessionId) {
    throw new Error("Stripe checkout session is required.")
  }

  return sessionId
}
