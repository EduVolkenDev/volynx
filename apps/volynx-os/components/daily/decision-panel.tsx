"use client"

import { useEffect, useState } from "react"
import { GitCompareArrows, Loader2, Sparkles } from "lucide-react"
import type { DailyDecision } from "@/types/daily"
import { createDailyDecisionRecord } from "@/lib/daily/decision-engine"
import {
  DAILY_DECISIONS_UPDATED_EVENT,
  readDailyDecisionsFromLocalStorage,
  upsertDailyDecisionLocal
} from "@/lib/daily/storage"
import { cn } from "@/lib/utils"

type DecisionResponse = {
  decision?: DailyDecision
  error?: string
}

export function DecisionPanel() {
  const [optionA, setOptionA] = useState("")
  const [optionB, setOptionB] = useState("")
  const [criteria, setCriteria] = useState("")
  const [decisions, setDecisions] = useState<DailyDecision[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canGenerate = optionA.trim().length > 0 && optionB.trim().length > 0

  useEffect(() => {
    const sync = () => setDecisions(readDailyDecisionsFromLocalStorage())

    sync()
    window.addEventListener(DAILY_DECISIONS_UPDATED_EVENT, sync)
    window.addEventListener("storage", sync)

    return () => {
      window.removeEventListener(DAILY_DECISIONS_UPDATED_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  async function handleGenerate() {
    if (!canGenerate || isGenerating) return

    setIsGenerating(true)
    setError(null)

    const localDecision = await createDailyDecisionRecord({
      optionA,
      optionB,
      criteria
    })

    setDecisions(upsertDailyDecisionLocal(localDecision))

    try {
      const response = await fetch("/api/daily/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: localDecision.id,
          optionA,
          optionB,
          criteria,
          accessToken: window.localStorage.getItem("volynx_access_token")
        })
      })
      const data = (await response.json()) as DecisionResponse

      if (!response.ok || !data.decision) {
        throw new Error(data.error ?? "Decision could not be generated.")
      }

      setDecisions(upsertDailyDecisionLocal(data.decision))
      setOptionA("")
      setOptionB("")
      setCriteria("")
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Decision was saved locally, but analysis failed.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <section className="daily-panel">
      <div className="daily-panel-header">
        <div>
          <p className="daily-kicker">Decision</p>
          <h2 className="daily-panel-title">Compare options and keep the reasoning attached.</h2>
        </div>
        <span className="daily-icon-button">
          <GitCompareArrows className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          <input
            value={optionA}
            onChange={(event) => setOptionA(event.target.value)}
            placeholder="Option A"
            className="daily-field text-sm"
          />
          <input
            value={optionB}
            onChange={(event) => setOptionB(event.target.value)}
            placeholder="Option B"
            className="daily-field text-sm"
          />
          <textarea
            value={criteria}
            onChange={(event) => setCriteria(event.target.value)}
            placeholder="Criteria, constraints, risks or desired outcome..."
            className="daily-field min-h-[130px] resize-none text-sm leading-6"
          />
          {error ? (
            <p className="rounded-lg border border-amber-200/20 bg-amber-200/[0.06] px-4 py-3 text-sm leading-6 text-amber-100">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className={cn(
              "daily-primary-action",
              !canGenerate || isGenerating ? "cursor-not-allowed" : ""
            )}
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Compare
          </button>
        </div>

        <div className="daily-scroll-list grid gap-3">
          {decisions.length ? (
            decisions.map((decision) => (
              <article key={decision.id} className="daily-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">Recommendation</p>
                  <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-500">
                    {decision.ai.fallbackUsed ? "Fallback" : "VOLYNX AI"}
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold leading-7 text-white">{decision.recommendation}</p>
                <p className="mt-3 line-clamp-6 text-sm leading-6 text-zinc-400">{decision.reason}</p>
              </article>
            ))
          ) : (
            <div className="daily-empty">
              Decisions generated here will keep the recommendation and reasoning.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
