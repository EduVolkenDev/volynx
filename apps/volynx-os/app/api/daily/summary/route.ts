import { NextResponse } from "next/server"
import { createDailySummaryRecord } from "@/lib/daily/summary-engine"

export const runtime = "nodejs"

type SummaryRequestBody = {
  id?: string
  sourceItemId?: string
  rawContent?: string
  accessToken?: string | null
}

export async function POST(request: Request) {
  let body: SummaryRequestBody

  try {
    body = (await request.json()) as SummaryRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid summary payload." }, { status: 400 })
  }

  const rawContent = typeof body.rawContent === "string" ? body.rawContent : ""

  if (!rawContent.trim()) {
    return NextResponse.json({ error: "Summary content is required." }, { status: 400 })
  }

  const summary = await createDailySummaryRecord({
    id: body.id,
    sourceItemId: body.sourceItemId ?? "ad-hoc",
    rawContent,
    accessToken: body.accessToken
  })

  return NextResponse.json({
    summary,
    fallbackUsed: summary.ai.fallbackUsed
  })
}
