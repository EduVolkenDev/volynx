import type { DailyAiMeta, DailyId, DailyWriting, WritingContract } from "@/types/daily"
import { runDailyAiTool } from "@/lib/daily/ai-tools"
import { createFallbackWriting } from "@/lib/daily/fallback"
import { createDailyId, DAILY_LOCAL_USER_ID } from "@/lib/daily/storage"

export type WritingEngineInput = {
  id?: DailyId
  userId?: DailyId
  sourceItemId?: DailyId | null
  rawContent: string
  mode?: "professional" | "shorter" | "friendlier" | "clearer"
  accessToken?: string | null
}

function completedMeta(status: DailyAiMeta["status"], confidence: number, fallbackUsed: boolean, reason: string): DailyAiMeta {
  return {
    engine: "writing",
    status,
    confidence,
    fallbackUsed,
    reason,
    completedAt: new Date().toISOString()
  }
}

export async function generateWritingContract(input: Pick<WritingEngineInput, "rawContent" | "mode" | "accessToken">): Promise<{
  contract: WritingContract
  ai: DailyAiMeta
}> {
  try {
    const ai = await runDailyAiTool({
      tool: "writing",
      actionClass: "light",
      accessToken: input.accessToken,
      input: {
        text: input.rawContent,
        mode: input.mode ?? "professional"
      }
    })

    return {
      contract: {
        title: titleFromDraft(ai.result, input.rawContent),
        body: ai.result.trim(),
        version: 1
      },
      ai: completedMeta("completed", ai.lite ? 0.64 : 0.82, false, ai.lite ? "VOLYNX AI draft generated in lite mode." : "VOLYNX AI draft generated.")
    }
  } catch (error) {
    return {
      contract: createFallbackWriting(input.rawContent),
      ai: completedMeta("fallback", 0.45, true, error instanceof Error ? error.message : "Draft generated with local fallback.")
    }
  }
}

export async function createDailyWritingRecord(input: WritingEngineInput): Promise<DailyWriting> {
  const now = new Date().toISOString()
  const result = await generateWritingContract({
    rawContent: input.rawContent,
    mode: input.mode,
    accessToken: input.accessToken
  })

  return {
    id: input.id ?? createDailyId("writing"),
    userId: input.userId ?? DAILY_LOCAL_USER_ID,
    sourceItemId: input.sourceItemId ?? null,
    title: result.contract.title,
    body: result.contract.body,
    version: result.contract.version,
    autosavedAt: now,
    ai: result.ai,
    createdAt: now,
    updatedAt: now
  }
}

function titleFromDraft(result: string, rawContent: string) {
  const firstLine = result.split(/\r?\n/).map((line) => line.replace(/^#+\s*/, "").trim()).find(Boolean)
  const source = firstLine || rawContent.trim() || "Untitled draft"

  return source.length > 72 ? `${source.slice(0, 69).trim()}...` : source
}
