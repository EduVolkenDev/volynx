import { NextResponse } from "next/server"
import { createDailyDecisionRecord } from "@/lib/daily/decision-engine"

export const runtime = "nodejs"

type DecisionRequestBody = {
  id?: string
  sourceItemId?: string
  optionA?: string
  optionB?: string
  criteria?: string
  accessToken?: string | null
}

export async function POST(request: Request) {
  let body: DecisionRequestBody

  try {
    body = (await request.json()) as DecisionRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid decision payload." }, { status: 400 })
  }

  const optionA = typeof body.optionA === "string" ? body.optionA.trim() : ""
  const optionB = typeof body.optionB === "string" ? body.optionB.trim() : ""

  if (!optionA || !optionB) {
    return NextResponse.json({ error: "Two decision options are required." }, { status: 400 })
  }

  const decision = await createDailyDecisionRecord({
    id: body.id,
    sourceItemId: body.sourceItemId ?? "ad-hoc",
    optionA,
    optionB,
    criteria: body.criteria,
    accessToken: body.accessToken
  })

  return NextResponse.json({
    decision,
    fallbackUsed: decision.ai.fallbackUsed
  })
}

