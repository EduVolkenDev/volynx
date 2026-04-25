import type { DailyAiMeta, DailyId, DailySummary, SummaryContract } from "@/types/daily"
import { runDailyAiTool } from "@/lib/daily/ai-tools"
import { createFallbackSummary } from "@/lib/daily/fallback"
import { createDailyId, DAILY_LOCAL_USER_ID } from "@/lib/daily/storage"

export type SummaryEngineInput = {
  id?: DailyId
  userId?: DailyId
  sourceItemId: DailyId
  rawContent: string
  accessToken?: string | null
}

function completedMeta(status: DailyAiMeta["status"], confidence: number, fallbackUsed: boolean, reason: string): DailyAiMeta {
  return {
    engine: "summary",
    status,
    confidence,
    fallbackUsed,
    reason,
    completedAt: new Date().toISOString()
  }
}

export async function generateSummaryContract(input: Pick<SummaryEngineInput, "rawContent" | "accessToken">): Promise<{
  contract: SummaryContract
  ai: DailyAiMeta
}> {
  try {
    const ai = await runDailyAiTool({
      tool: "summary",
      actionClass: "medium",
      accessToken: input.accessToken,
      input: { text: input.rawContent }
    })

    return {
      contract: normalizeAiSummary(ai.result),
      ai: completedMeta("completed", ai.lite ? 0.64 : 0.82, false, ai.lite ? "VOLYNX AI summary generated in lite mode." : "VOLYNX AI summary generated.")
    }
  } catch (error) {
    return {
      contract: createFallbackSummary(input.rawContent),
      ai: completedMeta("fallback", 0.45, true, error instanceof Error ? error.message : "Summary generated with local fallback.")
    }
  }
}

export async function createDailySummaryRecord(input: SummaryEngineInput): Promise<DailySummary> {
  const now = new Date().toISOString()
  const result = await generateSummaryContract({ rawContent: input.rawContent, accessToken: input.accessToken })

  return {
    id: input.id ?? createDailyId("summary"),
    userId: input.userId ?? DAILY_LOCAL_USER_ID,
    sourceItemId: input.sourceItemId,
    summaryText: result.contract.summary,
    detailedText: result.contract.detailed,
    bullets: result.contract.bullets,
    ai: result.ai,
    createdAt: now,
    updatedAt: now
  }
}

function normalizeAiSummary(result: string): SummaryContract {
  const summaryMatch = result.match(/SUMMARY:\s*([\s\S]*?)(?=\nACTIONS:|$)/i)
  const actionsMatch = result.match(/ACTIONS:\s*([\s\S]*?)$/i)
  const summary = (summaryMatch ? summaryMatch[1] : result).trim()
  const actions = (actionsMatch ? actionsMatch[1] : summary).trim()
  const bullets = actions
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 6)

  return {
    summary: summary || result.trim(),
    bullets: bullets.length ? bullets : [summary || result.trim()],
    detailed: result.trim()
  }
}
