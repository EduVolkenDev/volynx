import { NextResponse } from "next/server"
import { createDailyItemRecord } from "@/lib/daily/storage"
import type { DailyCaptureSource } from "@/types/daily"

export const runtime = "nodejs"

type CaptureRequestBody = {
  id?: string
  rawContent?: string
  source?: DailyCaptureSource
}

export async function POST(request: Request) {
  let body: CaptureRequestBody

  try {
    body = (await request.json()) as CaptureRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid capture payload." }, { status: 400 })
  }

  const rawContent = typeof body.rawContent === "string" ? body.rawContent : ""
  const hasFileMetadata = Boolean(body.source?.filename)

  if (!rawContent.trim() && !hasFileMetadata) {
    return NextResponse.json({ error: "Capture content or file metadata is required." }, { status: 400 })
  }

  const item = await createDailyItemRecord({
    id: body.id,
    rawContent,
    source: body.source
  })

  return NextResponse.json({
    item,
    saved: true,
    storage: "client",
    fallbackUsed: item.intent.ai.fallbackUsed
  })
}
