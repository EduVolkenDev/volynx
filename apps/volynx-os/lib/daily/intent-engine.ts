import type { DailyAiMeta, DailyCaptureSource, DailyIntentResult } from "@/types/daily"
import { runDailyAiTool } from "@/lib/daily/ai-tools"
import { parseIntentContract } from "@/lib/daily/contracts"
import { createFallbackIntent } from "@/lib/daily/fallback"

export type IntentEngineInput = {
  rawContent: string
  source?: DailyCaptureSource
  accessToken?: string | null
}

function completedMeta(status: DailyAiMeta["status"], confidence: number, fallbackUsed: boolean, reason: string): DailyAiMeta {
  return {
    engine: "intent",
    status,
    confidence,
    fallbackUsed,
    reason,
    completedAt: new Date().toISOString()
  }
}

export async function classifyDailyIntent(input: IntentEngineInput): Promise<DailyIntentResult> {
  try {
    const ai = await runDailyAiTool({
      tool: "intent",
      actionClass: "light",
      accessToken: input.accessToken,
      input: {
        text: input.rawContent,
        sourceKind: input.source?.kind ?? "text",
        sourceUrl: input.source?.url ?? "",
        filename: input.source?.filename ?? ""
      }
    })
    const parsed = parseIntentContract(ai.result)

    if (!parsed.ok) {
      throw new Error(parsed.error)
    }

    return {
      ...parsed.data,
      ai: completedMeta(
        "completed",
        ai.lite ? Math.max(0.56, parsed.data.confidence || 0) : Math.max(0.72, parsed.data.confidence || 0),
        false,
        ai.lite ? "VOLYNX AI intent classified in lite mode." : "VOLYNX AI intent classified."
      )
    }
  } catch (error) {
    const fallback = createFallbackIntent(input.rawContent, input.source)

    return {
      ...fallback,
      ai: completedMeta(
        "fallback",
        fallback.confidence,
        true,
        error instanceof Error ? error.message : "Intent classified with local fallback."
      )
    }
  }
}
