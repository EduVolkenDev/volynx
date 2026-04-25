import type { DailyAiMeta, DailyDecision, DailyDecisionOption, DailyId, DecisionContract } from "@/types/daily"
import { runDailyAiTool } from "@/lib/daily/ai-tools"
import { createFallbackDecision } from "@/lib/daily/fallback"
import { createDailyId, DAILY_LOCAL_USER_ID } from "@/lib/daily/storage"

export type DecisionEngineInput = {
  id?: DailyId
  userId?: DailyId
  sourceItemId?: DailyId
  optionA: string
  optionB: string
  criteria?: string
  accessToken?: string | null
}

function completedMeta(status: DailyAiMeta["status"], confidence: number, fallbackUsed: boolean, reason: string): DailyAiMeta {
  return {
    engine: "decision",
    status,
    confidence,
    fallbackUsed,
    reason,
    completedAt: new Date().toISOString()
  }
}

export async function generateDecisionContract(input: Omit<DecisionEngineInput, "id" | "userId" | "sourceItemId">): Promise<{
  contract: DecisionContract
  ai: DailyAiMeta
}> {
  const rawContext = `Option A: ${input.optionA}\nOption B: ${input.optionB}\nCriteria: ${input.criteria ?? ""}`.trim()

  try {
    const ai = await runDailyAiTool({
      tool: "decision",
      actionClass: "pro",
      accessToken: input.accessToken,
      input: {
        optionA: input.optionA,
        optionB: input.optionB,
        criteria: input.criteria ?? ""
      }
    })

    return {
      contract: normalizeAiDecision(ai.result, input.optionA, input.optionB),
      ai: completedMeta("completed", ai.lite ? 0.62 : 0.78, false, ai.lite ? "VOLYNX AI decision generated in lite mode." : "VOLYNX AI decision generated.")
    }
  } catch (error) {
    return {
      contract: {
        ...createFallbackDecision(rawContext),
        options: [
          { label: input.optionA, pros: [], cons: [] },
          { label: input.optionB, pros: [], cons: [] }
        ]
      },
      ai: completedMeta("fallback", 0.35, true, error instanceof Error ? error.message : "Decision generated with local fallback.")
    }
  }
}

export async function createDailyDecisionRecord(input: DecisionEngineInput): Promise<DailyDecision> {
  const now = new Date().toISOString()
  const result = await generateDecisionContract(input)

  return {
    id: input.id ?? createDailyId("decision"),
    userId: input.userId ?? DAILY_LOCAL_USER_ID,
    sourceItemId: input.sourceItemId ?? "ad-hoc",
    recommendation: result.contract.recommendation,
    reason: result.contract.reason,
    confidence: result.contract.confidence,
    options: result.contract.options,
    ai: result.ai,
    createdAt: now,
    updatedAt: now
  }
}

function normalizeAiDecision(result: string, optionA: string, optionB: string): DecisionContract {
  const recommendationMatch = result.match(/\*\*Recommendation:\*\*\s*([^\n]+)/i) ?? result.match(/Recommendation:\s*([^\n]+)/i)
  const recommendation = recommendationMatch?.[1]?.trim() || "Review the options with the available criteria."

  return {
    recommendation,
    reason: result.trim(),
    confidence: 0.74,
    options: parseDecisionOptions(result, optionA, optionB)
  }
}

function parseDecisionOptions(result: string, optionA: string, optionB: string): DailyDecisionOption[] {
  return [
    {
      label: optionA,
      pros: extractBlock(result, "Option A", "Pros"),
      cons: extractBlock(result, "Option A", "Cons")
    },
    {
      label: optionB,
      pros: extractBlock(result, "Option B", "Pros"),
      cons: extractBlock(result, "Option B", "Cons")
    }
  ]
}

function extractBlock(result: string, optionLabel: string, blockLabel: string) {
  const pattern = new RegExp(`${optionLabel}\\s+[^\\n]*${blockLabel}:?\\*?\\*?\\s*([\\s\\S]*?)(?=\\n\\*\\*Option|\\n\\*\\*Recommendation|\\n\\*\\*Key risk|$)`, "i")
  const match = result.match(pattern)

  if (!match?.[1]) return []

  return match[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 4)
}

