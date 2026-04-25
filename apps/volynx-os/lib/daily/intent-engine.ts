import type { DailyCaptureSource, DailyIntentResult } from "@/types/daily"
import { createFallbackIntent } from "@/lib/daily/fallback"

export type IntentEngineInput = {
  rawContent: string
  source?: DailyCaptureSource
}

export async function classifyDailyIntent(input: IntentEngineInput): Promise<DailyIntentResult> {
  return createFallbackIntent(input.rawContent, input.source)
}

