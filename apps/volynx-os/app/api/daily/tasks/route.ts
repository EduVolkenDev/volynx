import { NextResponse } from "next/server"
import { createDailyTaskRecords } from "@/lib/daily/task-engine"

export const runtime = "nodejs"

type TasksRequestBody = {
  sourceItemId?: string
  rawContent?: string
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

  const tasks = await createDailyTaskRecords({
    sourceItemId: body.sourceItemId ?? "ad-hoc",
    rawContent
  })

  return NextResponse.json({
    tasks,
    fallbackUsed: true
  })
}

