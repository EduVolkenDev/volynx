import { NextResponse } from "next/server"
import { createDailyTaskResult } from "@/lib/daily/task-engine"

export const runtime = "nodejs"

type TasksRequestBody = {
  sourceItemId?: string
  rawContent?: string
  accessToken?: string | null
}

export async function POST(request: Request) {
  let body: TasksRequestBody

  try {
    body = (await request.json()) as TasksRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid tasks payload." }, { status: 400 })
  }

  const rawContent = typeof body.rawContent === "string" ? body.rawContent : ""

  if (!rawContent.trim()) {
    return NextResponse.json({ error: "Task source content is required." }, { status: 400 })
  }

  const result = await createDailyTaskResult({
    sourceItemId: body.sourceItemId ?? "ad-hoc",
    rawContent,
    accessToken: body.accessToken
  })

  return NextResponse.json({
    tasks: result.tasks,
    fallbackUsed: result.fallbackUsed
  })
}
