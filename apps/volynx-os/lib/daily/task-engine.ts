import type { DailyId, DailyTask, TaskExtractionContract } from "@/types/daily"
import { runDailyAiTool } from "@/lib/daily/ai-tools"
import { parseTaskExtractionContract } from "@/lib/daily/contracts"
import { createFallbackTasks } from "@/lib/daily/fallback"
import { createDailyId, DAILY_LOCAL_USER_ID } from "@/lib/daily/storage"

export type TaskEngineInput = {
  userId?: DailyId
  sourceItemId: DailyId
  rawContent: string
  referenceDate?: Date
  accessToken?: string | null
}

export async function extractTaskContract(input: Pick<TaskEngineInput, "rawContent" | "referenceDate" | "accessToken">): Promise<{
  contract: TaskExtractionContract
  fallbackUsed: boolean
}> {
  try {
    const ai = await runDailyAiTool({
      tool: "task",
      actionClass: "medium",
      accessToken: input.accessToken,
      input: {
        text: input.rawContent,
        referenceDate: (input.referenceDate ?? new Date()).toISOString().slice(0, 10)
      }
    })
    const parsed = parseTaskExtractionContract(ai.result)

    if (!parsed.ok) {
      throw new Error(parsed.error)
    }

    if (!parsed.data.tasks.length) {
      throw new Error("AI task extraction returned no actionable tasks.")
    }

    return {
      contract: parsed.data,
      fallbackUsed: false
    }
  } catch {
    return {
      contract: createFallbackTasks(input.rawContent, input.referenceDate),
      fallbackUsed: true
    }
  }
}

export async function createDailyTaskResult(input: TaskEngineInput): Promise<{
  tasks: DailyTask[]
  fallbackUsed: boolean
}> {
  const now = new Date().toISOString()
  const result = await extractTaskContract({
    rawContent: input.rawContent,
    referenceDate: input.referenceDate,
    accessToken: input.accessToken
  })

  return {
    tasks: result.contract.tasks.map((task) => ({
      id: createDailyId("task"),
      userId: input.userId ?? DAILY_LOCAL_USER_ID,
      title: task.title,
      status: "todo",
      dueDate: task.dueDate,
      sourceItemId: input.sourceItemId,
      createdAt: now,
      updatedAt: now
    })),
    fallbackUsed: result.fallbackUsed
  }
}

export async function createDailyTaskRecords(input: TaskEngineInput): Promise<DailyTask[]> {
  const result = await createDailyTaskResult(input)
  return result.tasks
}
