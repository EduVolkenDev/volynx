"use client"

import { useEffect, useMemo, useState } from "react"
import { FileText, Loader2, Sparkles } from "lucide-react"
import type { DailyItem, DailySummary } from "@/types/daily"
import { createDailySummaryRecord } from "@/lib/daily/summary-engine"
import {
  DAILY_ITEMS_UPDATED_EVENT,
  DAILY_SUMMARIES_UPDATED_EVENT,
  readDailyItemsFromLocalStorage,
  readDailySummariesFromLocalStorage,
  upsertDailySummaryLocal
} from "@/lib/daily/storage"
import { cn } from "@/lib/utils"

type SummaryResponse = {
  summary?: DailySummary
  error?: string
}

export function SummaryPanel() {
  const [items, setItems] = useState<DailyItem[]>([])
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [selectedItemId, setSelectedItemId] = useState("")
  const [rawContent, setRawContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => {
      const nextItems = readDailyItemsFromLocalStorage()
      setItems(nextItems)
      setSummaries(readDailySummariesFromLocalStorage())
      setSelectedItemId((current) => current || nextItems[0]?.id || "")
    }

    sync()
    window.addEventListener(DAILY_ITEMS_UPDATED_EVENT, sync)
    window.addEventListener(DAILY_SUMMARIES_UPDATED_EVENT, sync)
    window.addEventListener("storage", sync)

    return () => {
      window.removeEventListener(DAILY_ITEMS_UPDATED_EVENT, sync)
      window.removeEventListener(DAILY_SUMMARIES_UPDATED_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  )
  const contentToSummarize = rawContent.trim() || selectedItem?.cleanContent || ""
  const canGenerate = contentToSummarize.trim().length > 0

  async function handleGenerate() {
    if (!canGenerate || isGenerating) return

    setIsGenerating(true)
    setError(null)

    const localSummary = await createDailySummaryRecord({
      sourceItemId: selectedItem?.id ?? "ad-hoc",
      rawContent: contentToSummarize
    })

    setSummaries(upsertDailySummaryLocal(localSummary))

    try {
      const response = await fetch("/api/daily/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: localSummary.id,
          sourceItemId: selectedItem?.id ?? "ad-hoc",
          rawContent: contentToSummarize,
          accessToken: window.localStorage.getItem("volynx_access_token")
        })
      })
      const data = (await response.json()) as SummaryResponse

      if (!response.ok || !data.summary) {
        throw new Error(data.error ?? "Summary could not be generated.")
      }

      setSummaries(upsertDailySummaryLocal(data.summary))
      setRawContent("")
    } catch (summaryError) {
      setError(summaryError instanceof Error ? summaryError.message : "Summary was saved locally, but processing failed.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-glow backdrop-blur md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Summary</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Turn any capture into a structured brief.</h2>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-black">
          <FileText className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <div className="grid content-start gap-3">
          <label className="grid gap-2 text-sm text-zinc-400">
            Source capture
            <select
              value={selectedItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-cyan-200/40"
            >
              <option value="">Ad-hoc text</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>

          <textarea
            value={rawContent}
            onChange={(event) => setRawContent(event.target.value)}
            placeholder={selectedItem ? "Optional: override selected capture text..." : "Paste text, link notes or source material..."}
            className="min-h-[170px] resize-none rounded-lg border border-white/10 bg-black/30 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-200/40"
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
              "inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-medium transition",
              canGenerate && !isGenerating ? "bg-white text-black hover:opacity-90" : "cursor-not-allowed bg-white/10 text-zinc-500"
            )}
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate summary
          </button>
        </div>

        <div className="grid max-h-[520px] gap-3 overflow-y-auto pr-1">
          {summaries.length ? (
            summaries.map((summary) => (
              <article key={summary.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">Structured Summary</p>
                  <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-500">
                    {summary.ai.fallbackUsed ? "Fallback" : "AI"}
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold leading-7 text-white">{summary.summaryText}</p>
                <div className="mt-4 grid gap-2">
                  {summary.bullets.map((bullet) => (
                    <div key={bullet} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm leading-6 text-zinc-400">
                      {bullet}
                    </div>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 p-6 text-sm leading-6 text-zinc-500">
              Summaries generated from captures will appear here.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
