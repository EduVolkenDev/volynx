import { createReadStream } from "node:fs"
import { Readable } from "node:stream"
import { NextResponse } from "next/server"
import {
  getPropertyFlowZipMeta,
  isPropertyFlowTierId,
  previewDownloadsEnabled,
  verifyPropertyFlowSession
} from "@/lib/propertyflow-commerce"

export const runtime = "nodejs"

type DownloadRequestBody = {
  sessionId?: string
  tier?: string
  preview?: boolean
}

function downloadUrl(request: Request, sessionId: string) {
  const url = new URL(request.url)
  url.search = ""
  url.searchParams.set("session_id", sessionId)

  return `${url.pathname}${url.search}`
}

function previewDownloadUrl(request: Request, tier: string) {
  const url = new URL(request.url)
  url.search = ""
  url.searchParams.set("preview", "1")
  url.searchParams.set("tier", tier)

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
    if (!previewDownloadsEnabled()) {
      return NextResponse.json({ error: "Preview downloads are disabled." }, { status: 403 })
    }

    if (!isPropertyFlowTierId(body.tier)) {
      return NextResponse.json({ error: "Invalid preview tier." }, { status: 400 })
    }

    return NextResponse.json({ url: previewDownloadUrl(request, body.tier) })
  }

  if (!body.sessionId) {
    return NextResponse.json({ error: "Stripe checkout session is required." }, { status: 400 })
  }

  try {
    const purchase = await verifyPropertyFlowSession(body.sessionId)

    return NextResponse.json({
      url: downloadUrl(request, purchase.sessionId),
      tier: purchase.tierId,
      filename: purchase.filename,
      bytes: purchase.bytes,
      version: purchase.version
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

  try {
    const zip = preview
      ? getPreviewZip(url.searchParams.get("tier"))
      : await getVerifiedZip(sessionId)

    const stream = Readable.toWeb(createReadStream(zip.filePath)) as ReadableStream

    return new Response(stream, {
      headers: {
        "content-type": "application/zip",
        "content-length": String(zip.bytes),
        "content-disposition": `attachment; filename="${zip.filename}"`,
        "cache-control": "private, no-store, max-age=0"
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download is not authorized."

    return NextResponse.json({ error: message }, { status: 403 })
  }
}

function getPreviewZip(tier: string | null) {
  if (!previewDownloadsEnabled()) {
    throw new Error("Preview downloads are disabled.")
  }

  if (!isPropertyFlowTierId(tier)) {
    throw new Error("Invalid preview tier.")
  }

  return getPropertyFlowZipMeta(tier)
}

async function getVerifiedZip(sessionId: string | null) {
  if (!sessionId) {
    throw new Error("Stripe checkout session is required.")
  }

  const purchase = await verifyPropertyFlowSession(sessionId)

  return {
    filePath: getPropertyFlowZipMeta(purchase.tierId).filePath,
    filename: purchase.filename,
    bytes: purchase.bytes
  }
}
