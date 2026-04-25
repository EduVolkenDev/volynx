import type { DailyId, DailyTask, TaskExtractionContract } from "@/types/daily"
import { createFallbackTasks } from "@/lib/daily/fallback"
import { createDailyId, DAILY_LOCAL_USER_ID } from "@/lib/daily/storage"

export type TaskEngineInput = {
  userId?: DailyId
  sourceItemId: DailyId
  rawContent: string
}

export async function extractTaskContract(input: Pick<TaskEngineInput, "rawContent">): Promise<TaskExtractionContract> {
  return createFallbackTasks(input.rawContent)
}

export async function createDailyTaskRecords(input: TaskEngineInput): Promise<DailyTask[]> {
  const now = new Date().toISOString()
  const contract = await extractTaskContract({ rawContent: input.rawContent })

  return contract.tasks.map((task) => ({
    id: createDailyId("task"),
    userId: input.userId ?? DAILY_LOCAL_USER_ID,
    title: task.title,
    status: "todo",
    dueDate: task.dueDate,
    sourceItemId: input.sourceItemId,
    createdAt: now,
    updatedAt: now
  }))
}

