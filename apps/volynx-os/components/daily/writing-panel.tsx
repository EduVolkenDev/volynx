"use client"

import { useEffect, useMemo, useState } from "react"
import { Edit3, Loader2, PenLine, Save, Sparkles } from "lucide-react"
import type { DailyItem, DailyWriting } from "@/types/daily"
import { createDailyWritingRecord } from "@/lib/daily/writing-engine"
import {
  DAILY_ITEMS_UPDATED_EVENT,
  DAILY_WRITINGS_UPDATED_EVENT,
  readDailyItemsFromLocalStorage,
  readDailyWritingsFromLocalStorage,
  upsertDailyWritingLocal
} from "@/lib/daily/storage"
import { cn } from "@/lib/utils"

type WritingResponse = {
  writing?: DailyWriting
  error?: string
}

export function WritingPanel() {
  const [items, setItems] = useState<DailyItem[]>([])
  const [writings, setWritings] = useState<DailyWriting[]>([])
  const [activeWritingId, setActiveWritingId] = useState("")
  const [selectedItemId, setSelectedItemId] = useState("")
  const [rawContent, setRawContent] = useState("")
  const [mode, setMode] = useState<"professional" | "shorter" | "friendlier" | "clearer">("professional")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => {
      const nextItems = readDailyItemsFromLocalStorage()
      const nextWritings = readDailyWritingsFromLocalStorage()

      setItems(nextItems)
      setWritings(nextWritings)
      setSelectedItemId((current) => current || nextItems[0]?.id || "")
      setActiveWritingId((current) => current || nextWritings[0]?.id || "")
    }

    sync()
    window.addEventListener(DAILY_ITEMS_UPDATED_EVENT, sync)
    window.addEventListener(DAILY_WRITINGS_UPDATED_EVENT, sync)
    window.addEventListener("storage", sync)

    return () => {
      window.removeEventListener(DAILY_ITEMS_UPDATED_EVENT, sync)
      window.removeEventListener(DAILY_WRITINGS_UPDATED_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  )
  const activeWriting = useMemo(
    () => writings.find((writing) => writing.id === activeWritingId) ?? null,
    [activeWritingId, writings]
  )
  const contentToDraft = rawContent.trim() || selectedItem?.cleanContent || ""
  const canGenerate = contentToDraft.trim().length > 0

  async function handleGenerate() {
    if (!canGenerate || isGenerating) return

    setIsGenerating(true)
    setError(null)

    const localWriting = await createDailyWritingRecord({
      sourceItemId: selectedItem?.id ?? null,
      rawContent: contentToDraft,
      mode
    })

    setWritings(upsertDailyWritingLocal(localWriting))
    setActiveWritingId(localWriting.id)

    try {
      const response = await fetch("/api/daily/writing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: localWriting.id,
          sourceItemId: selectedItem?.id ?? null,
          rawContent: contentToDraft,
          mode,
          accessToken: window.localStorage.getItem("volynx_access_token")
        })
      })
      const data = (await response.json()) as WritingResponse

      if (!response.ok || !data.writing) {
        throw new Error(data.error ?? "Draft could not be generated.")
      }

      setWritings(upsertDailyWritingLocal(data.writing))
      setActiveWritingId(data.writing.id)
      setRawContent("")
    } catch (writingError) {
      setError(writingError instanceof Error ? writingError.message : "Draft was saved locally, but generation failed.")
    } finally {
      setIsGenerating(false)
    }
  }

  function updateActiveWriting(patch: Partial<Pick<DailyWriting, "title" | "body">>) {
    if (!activeWriting) return

    const updated: DailyWriting = {
      ...activeWriting,
      ...patch,
      version: activeWriting.version + 1,
      autosavedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setWritings(upsertDailyWritingLocal(updated))
    setActiveWritingId(updated.id)
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-glow backdrop-blur md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Writing</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Turn ideas into editable drafts.</h2>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-black">
          <PenLine className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          <label className="grid gap-2 text-sm text-zinc-400">
            Source capture
            <select
              value={selectedItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-violet-200/40"
            >
              <option value="">Ad-hoc idea</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-zinc-400">
            Mode
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as typeof mode)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-violet-200/40"
            >
              <option value="professional">Professional</option>
              <option value="shorter">Shorter</option>
              <option value="friendlier">Friendlier</option>
              <option value="clearer">Clearer</option>
            </select>
          </label>

          <textarea
            value={rawContent}
            onChange={(event) => setRawContent(event.target.value)}
            placeholder={selectedItem ? "Optional: override selected idea..." : "Paste the idea, angle, email brief or rough notes..."}
            className="min-h-[150px] resize-none rounded-lg border border-white/10 bg-black/30 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-200/40"
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
            Generate draft
          </button>

          <div className="grid gap-2 pt-2">
            {writings.slice(0, 4).map((writing) => (
              <button
                key={writing.id}
                type="button"
                onClick={() => setActiveWritingId(writing.id)}
                className={cn(
                  "rounded-lg border border-white/10 bg-black/25 p-3 text-left transition hover:border-white/20",
                  activeWritingId === writing.id && "border-violet-200/30 bg-violet-200/[0.06]"
                )}
              >
                <p className="truncate text-sm font-medium text-white">{writing.title}</p>
                <p className="mt-1 text-xs text-zinc-600">v{writing.version}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/25 p-4">
          {activeWriting ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-500">
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Autosaved {activeWriting.autosavedAt ? new Date(activeWriting.autosavedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "locally"}
                </span>
                <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-500">v{activeWriting.version}</span>
              </div>
              <input
                value={activeWriting.title}
                onChange={(event) => updateActiveWriting({ title: event.target.value })}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-xl font-semibold tracking-[-0.03em] text-white outline-none focus:border-violet-200/40"
              />
              <textarea
                value={activeWriting.body}
                onChange={(event) => updateActiveWriting({ body: event.target.value })}
                className="min-h-[360px] resize-none rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-zinc-200 outline-none focus:border-violet-200/40"
              />
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 p-6 text-center text-sm leading-6 text-zinc-500">
              <Edit3 className="mb-4 h-6 w-6 text-zinc-600" />
              Generate a draft to start editing with autosave.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
