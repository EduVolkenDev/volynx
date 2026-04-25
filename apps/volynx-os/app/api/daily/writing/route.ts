import { NextResponse } from "next/server"
import { createDailyWritingRecord } from "@/lib/daily/writing-engine"

export const runtime = "nodejs"

type WritingRequestBody = {
  id?: string
  sourceItemId?: string | null
  rawContent?: string
  mode?: "professional" | "shorter" | "friendlier" | "clearer"
  accessToken?: string | null
}

export async function POST(request: Request) {
  let body: WritingRequestBody

  try {
    body = (await request.json()) as WritingRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid writing payload." }, { status: 400 })
  }

  const rawContent = typeof body.rawContent === "string" ? body.rawContent : ""

  if (!rawContent.trim()) {
    return NextResponse.json({ error: "Writing input is required." }, { status: 400 })
  }

  const writing = await createDailyWritingRecord({
    id: body.id,
    sourceItemId: body.sourceItemId ?? null,
    rawContent,
    mode: body.mode,
    accessToken: body.accessToken
  })

  return NextResponse.json({
    writing,
    fallbackUsed: writing.ai.fallbackUsed
  })
}
