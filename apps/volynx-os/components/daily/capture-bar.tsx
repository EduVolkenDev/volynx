"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Archive, FileUp, Loader2, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react"
import type { DailyCaptureSource, DailyItem } from "@/types/daily"
import { createDailyTaskRecords } from "@/lib/daily/task-engine"
import {
  createDailyItemRecord,
  readDailyItemsFromLocalStorage,
  removeDailyItemLocal,
  upsertDailyTasksLocal,
  upsertDailyItemLocal
} from "@/lib/daily/storage"
import { cn } from "@/lib/utils"

type CaptureResponse = {
  item?: DailyItem
  error?: string
}

export function CaptureBar() {
  const [rawContent, setRawContent] = useState("")
  const [items, setItems] = useState<DailyItem[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canSubmit = rawContent.trim().length > 0 || selectedFile !== null

  useEffect(() => {
    setItems(readDailyItemsFromLocalStorage())
  }, [])

  const intentCounts = useMemo(() => {
    return items.reduce<Record<string, number>>((counts, item) => {
      counts[item.intent.intent] = (counts[item.intent.intent] ?? 0) + 1

      return counts
    }, {})
  }, [items])

  async function handleSubmit() {
    if (!canSubmit || isSaving) return

    setIsSaving(true)
    setError(null)

    const source = createCaptureSource(rawContent, selectedFile)
    const content = rawContent.trim() || (selectedFile ? `Uploaded file: ${selectedFile.name}` : "")
    const localItem = await createDailyItemRecord({ rawContent: content, source })
    const pendingItem: DailyItem = {
      ...localItem,
      status: "processing",
      updatedAt: new Date().toISOString()
    }

    setItems(upsertDailyItemLocal(pendingItem))
    setRawContent("")
    setSelectedFile(null)

    try {
      const response = await fetch("/api/daily/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: localItem.id,
          rawContent: content,
          source
        })
      })
      const data = (await response.json()) as CaptureResponse

      if (!response.ok || !data.item) {
        throw new Error(data.error ?? "Capture could not be processed.")
      }

      setItems(upsertDailyItemLocal(data.item))
      await autoCreateTasks(data.item)
    } catch (captureError) {
      const failedItem: DailyItem = {
        ...localItem,
        status: "needs_review",
        updatedAt: new Date().toISOString()
      }

      setItems(upsertDailyItemLocal(failedItem))
      await autoCreateTasks(failedItem)
      setError(captureError instanceof Error ? captureError.message : "Capture was saved locally, but processing failed.")
    } finally {
      setIsSaving(false)
    }
  }

  function handleRemove(itemId: string) {
    setItems(removeDailyItemLocal(itemId))
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-glow backdrop-blur md:p-5">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Universal Capture</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">Drop any thought here.</h1>
          </div>
          <span className="hidden h-11 w-11 items-center justify-center rounded-lg bg-white text-black sm:flex">
            <Sparkles className="h-5 w-5" />
          </span>
        </div>

        <textarea
          value={rawContent}
          onChange={(event) => setRawContent(event.target.value)}
          placeholder="Task, link, note, idea, decision, draft prompt..."
          className="mt-5 min-h-[190px] w-full resize-none rounded-lg border border-white/10 bg-black/30 p-4 text-base leading-7 text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-200/40"
        />

        {selectedFile ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm">
            <span className="min-w-0 truncate text-zinc-300">{selectedFile.name}</span>
            <button type="button" onClick={() => setSelectedFile(null)} className="text-zinc-500 transition hover:text-white">
              Remove
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg border border-amber-200/20 bg-amber-200/[0.06] px-4 py-3 text-sm leading-6 text-amber-100">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.07]"
          >
            <FileUp className="mr-2 h-4 w-4" />
            Add file
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isSaving}
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-medium transition",
              canSubmit && !isSaving ? "bg-white text-black hover:opacity-90" : "cursor-not-allowed bg-white/10 text-zinc-500"
            )}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Capture
          </button>
        </div>
      </section>

      <aside className="rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-glow backdrop-blur md:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Local Vault</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">{items.length} captures</h2>
          </div>
          <Archive className="h-5 w-5 text-zinc-500" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {["task", "summary", "writing", "decision"].map((intent) => (
            <div key={intent} className="rounded-lg border border-white/10 bg-black/25 p-3">
              <p className="text-lg font-semibold text-white">{intentCounts[intent] ?? 0}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-600">{intent}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid max-h-[520px] gap-3 overflow-y-auto pr-1">
          {items.length ? (
            items.map((item) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.intent.intent} / {item.status}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="shrink-0 rounded-md p-1 text-zinc-600 transition hover:bg-white/10 hover:text-white"
                    aria-label={`Remove ${item.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">{item.cleanContent}</p>
                {item.intent.ai.fallbackUsed ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Fallback classification
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 p-6 text-sm leading-6 text-zinc-500">
              Captures saved in this browser will appear here first.
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

async function autoCreateTasks(item: DailyItem) {
  const shouldCreateTask = item.intent.suggestedActions.some((action) => action.type === "create_task") || item.intent.intent === "task"

  if (!shouldCreateTask) return

  const tasks = await createDailyTaskRecords({
    sourceItemId: item.id,
    rawContent: item.rawContent
  })

  upsertDailyTasksLocal(tasks)
}

function createCaptureSource(rawContent: string, file: File | null): DailyCaptureSource | undefined {
  if (file) {
    return {
      kind: "file",
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size
    }
  }

  const trimmed = rawContent.trim()

  if (/^https?:\/\/\S+$/i.test(trimmed)) {
    return {
      kind: "link",
      url: trimmed
    }
  }

  return undefined
}
