"use client"

import { useEffect, useRef, useState } from "react"
import { FileUp, Loader2, Mic, Send, Sparkles, Zap } from "lucide-react"
import type { DailyCaptureSource, DailyDecision, DailyItem, DailySummary, DailyTask, DailyWriting } from "@/types/daily"
import { createDailyDecisionRecord } from "@/lib/daily/decision-engine"
import { incrementDailyMetrics, readDailyMetrics, type DailyLocalMetrics } from "@/lib/daily/metrics"
import { parseDecisionInput, routeDailyItem, type DailyRoute } from "@/lib/daily/routing-engine"
import {
  createDailyItemRecord,
  upsertDailyDecisionLocal,
  upsertDailyItemLocal,
  upsertDailySummaryLocal,
  upsertDailyTasksLocal,
  upsertDailyWritingLocal
} from "@/lib/daily/storage"
import { createDailySummaryRecord } from "@/lib/daily/summary-engine"
import { createDailyTaskRecords } from "@/lib/daily/task-engine"
import { createDailyWritingRecord } from "@/lib/daily/writing-engine"
import { cn } from "@/lib/utils"

type CaptureResponse = {
  item?: DailyItem
  error?: string
}

type OutputResponse = {
  summary?: DailySummary
  writing?: DailyWriting
  decision?: DailyDecision
  tasks?: DailyTask[]
  error?: string
}

type VoiceRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

const fileTextLimit = 240_000

export function CommandInbox() {
  const [input, setInput] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [status, setStatus] = useState("Ready")
  const [route, setRoute] = useState<DailyRoute | null>(null)
  const [metrics, setMetrics] = useState<DailyLocalMetrics>(() => readDailyMetrics())
  const [aiStatus, setAiStatus] = useState({ label: "Checking AI", tone: "text-zinc-400" })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<VoiceRecognition | null>(null)
  const canSubmit = input.trim().length > 0 || selectedFile !== null

  useEffect(() => {
    setMetrics(readDailyMetrics())
    setAiStatus(getInlineAiStatus())
  }, [])

  async function handleRun() {
    if (!canSubmit || isRunning) return

    const startedAt = performance.now()
    setIsRunning(true)
    setStatus("Saving input first...")
    setRoute(null)

    if (selectedFile) {
      setStatus("Reading file locally...")
    }

    const fileRead = selectedFile ? await readFileCapture(selectedFile) : null
    const source = createCaptureSource(input, selectedFile, fileRead)
    const content = createCaptureContent(input, selectedFile, fileRead)
    const localItem = await createDailyItemRecord({ rawContent: content, source })
    upsertDailyItemLocal({ ...localItem, status: "processing", updatedAt: new Date().toISOString() })

    try {
      const captureResponse = await fetch("/api/daily/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: localItem.id,
          rawContent: content,
          source
        })
      })
      const captureData = (await captureResponse.json()) as CaptureResponse
      const item = captureData.item ?? localItem
      const nextRoute = routeDailyItem(item)

      upsertDailyItemLocal(item)
      setRoute(nextRoute)
      setStatus(`${nextRoute.label}...`)

      const outputCount = await executeRoute(item, nextRoute)
      const latency = Math.round(performance.now() - startedAt)
      const nextMetrics = incrementDailyMetrics({
        captures: 1,
        routed: nextRoute.kind === "vault" ? 0 : 1,
        outputs: outputCount,
        lastLatencyMs: latency
      })

      setMetrics(nextMetrics)
      setStatus(outputCount ? `${nextRoute.label} complete in ${latency}ms` : `Saved to Vault in ${latency}ms`)
      setInput("")
      setSelectedFile(null)
    } catch (error) {
      const latency = Math.round(performance.now() - startedAt)
      upsertDailyItemLocal({ ...localItem, status: "needs_review", updatedAt: new Date().toISOString() })
      setMetrics(incrementDailyMetrics({ captures: 1, lastLatencyMs: latency }))
      setStatus(error instanceof Error ? error.message : "Saved locally, but routing needs review.")
    } finally {
      setIsRunning(false)
    }
  }

  async function executeRoute(item: DailyItem, nextRoute: DailyRoute) {
    if (nextRoute.kind === "task") {
      const tasks = await createDailyTaskRecords({ sourceItemId: item.id, rawContent: item.rawContent })
      upsertDailyTasksLocal(tasks)
      syncOutput("/api/daily/tasks", { sourceItemId: item.id, rawContent: item.rawContent }, (data) => {
        if (data.tasks) upsertDailyTasksLocal(data.tasks)
      })

      return tasks.length
    }

    if (nextRoute.kind === "summary") {
      const summary = await createDailySummaryRecord({ sourceItemId: item.id, rawContent: item.rawContent })
      upsertDailySummaryLocal(summary)
      syncOutput("/api/daily/summary", withAccessToken({ id: summary.id, sourceItemId: item.id, rawContent: item.rawContent }), (data) => {
        if (data.summary) upsertDailySummaryLocal(data.summary)
      })

      return 1
    }

    if (nextRoute.kind === "writing") {
      const writing = await createDailyWritingRecord({ sourceItemId: item.id, rawContent: item.rawContent })
      upsertDailyWritingLocal(writing)
      syncOutput("/api/daily/writing", withAccessToken({ id: writing.id, sourceItemId: item.id, rawContent: item.rawContent }), (data) => {
        if (data.writing) upsertDailyWritingLocal(data.writing)
      })

      return 1
    }

    if (nextRoute.kind === "decision") {
      const parsed = parseDecisionInput(item.cleanContent)
      if (!parsed) return 0

      const decision = await createDailyDecisionRecord({ sourceItemId: item.id, ...parsed })
      upsertDailyDecisionLocal(decision)
      syncOutput("/api/daily/decision", withAccessToken({ id: decision.id, sourceItemId: item.id, ...parsed }), (data) => {
        if (data.decision) upsertDailyDecisionLocal(data.decision)
      })

      return 1
    }

    return 0
  }

  function syncOutput(url: string, payload: Record<string, unknown>, onData: (data: OutputResponse) => void) {
    void postOutput(url, payload)
      .then(onData)
      .catch(() => {
        setStatus("Local output saved. Server upgrade unavailable.")
      })
  }

  function toggleVoice() {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) {
      setStatus("Voice input is not available in this browser.")
      return
    }

    const recognition = new SpeechRecognition() as VoiceRecognition
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-GB"
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim()

      if (transcript) setInput((current) => [current, transcript].filter(Boolean).join(" "))
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => {
      setIsListening(false)
      setStatus("Voice capture stopped.")
    }
    recognitionRef.current = recognition
    setIsListening(true)
    recognition.start()
  }

  return (
    <section className="rounded-lg border border-emerald-200/20 bg-white/[0.055] p-4 shadow-glow backdrop-blur-xl md:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/70">Command Inbox</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Capture once. Let Daily route it.</h2>
            </div>
            <span className={cn("inline-flex items-center rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm", aiStatus.tone)}>
              <Zap className="mr-2 h-4 w-4" />
              {aiStatus.label}
            </span>
          </div>

          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type anything: todo, link, rough idea, A vs B decision, meeting note..."
            className="min-h-[140px] w-full resize-none rounded-lg border border-white/10 bg-black/35 p-4 text-base leading-7 text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-200/40"
          />

          {selectedFile ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300">
              <span className="min-w-0 truncate">{selectedFile.name}</span>
              <button type="button" onClick={() => setSelectedFile(null)} className="text-zinc-500 transition hover:text-white">Remove</button>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.txt,.md,.csv,.html,.pdf"
              className="hidden"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.07] sm:flex-none"
            >
              <FileUp className="mr-2 h-4 w-4" />
              File / screenshot
            </button>
            <button
              type="button"
              onClick={toggleVoice}
              className={cn(
                "inline-flex flex-1 items-center justify-center rounded-lg border border-white/10 px-4 py-3 text-sm font-medium transition sm:flex-none",
                isListening ? "bg-emerald-200 text-black" : "bg-white/[0.04] text-white hover:bg-white/[0.07]"
              )}
            >
              <Mic className="mr-2 h-4 w-4" />
              {isListening ? "Listening" : "Voice"}
            </button>
            <button
              type="button"
              onClick={handleRun}
              disabled={!canSubmit || isRunning}
              className={cn(
                "inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-medium transition sm:w-auto",
                canSubmit && !isRunning ? "bg-white text-black hover:opacity-90" : "cursor-not-allowed bg-white/10 text-zinc-500"
              )}
            >
              {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send
            </button>
          </div>
        </div>

        <aside className="rounded-lg border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-black">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white" aria-live="polite">{status}</p>
              <p className="mt-1 text-xs text-zinc-600">{route ? `${route.label} / ${Math.round(route.confidence * 100)}%` : "Routing appears here"}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Metric label="Captures" value={metrics.captures} />
            <Metric label="Outputs" value={metrics.outputs} />
            <Metric label="Latency" value={metrics.lastLatencyMs ? `${metrics.lastLatencyMs}ms` : "-"} />
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Launch target: input to first local output under 2s. Remote VOLYNX AI upgrades the result when a valid token is present.
          </p>
        </aside>
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-600">{label}</p>
    </div>
  )
}

type FileReadResult = {
  text: string
  textExtracted: boolean
  truncated: boolean
}

async function readFileCapture(file: File): Promise<FileReadResult> {
  if (!isReadableTextFile(file)) {
    return { text: "", textExtracted: false, truncated: false }
  }

  try {
    const text = await file.text()
    const truncated = text.length > fileTextLimit

    return {
      text: truncated ? text.slice(0, fileTextLimit) : text,
      textExtracted: true,
      truncated
    }
  } catch {
    return { text: "", textExtracted: false, truncated: false }
  }
}

function createCaptureContent(rawContent: string, file: File | null, fileRead: FileReadResult | null) {
  const trimmed = rawContent.trim()

  if (!file) {
    return trimmed
  }

  const fileMeta = `[File: ${file.name} · ${file.type || "unknown type"} · ${formatFileSize(file.size)}]`

  if (fileRead?.textExtracted) {
    const truncationNote = fileRead.truncated ? `\n\n[File text truncated after ${formatFileSize(fileTextLimit)} for local capture safety.]` : ""

    return [trimmed, fileMeta, fileRead.text.trim(), truncationNote.trim()].filter(Boolean).join("\n\n")
  }

  return [
    trimmed,
    `${fileMeta}\nBinary or image content is preserved as file metadata for the Scanner phase. Add notes above when the content needs immediate routing.`
  ].filter(Boolean).join("\n\n")
}

function createCaptureSource(rawContent: string, file: File | null, fileRead: FileReadResult | null): DailyCaptureSource | undefined {
  if (file) {
    return {
      kind: "file",
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      textExtracted: fileRead?.textExtracted ?? false,
      truncated: fileRead?.truncated ?? false
    }
  }

  const trimmed = rawContent.trim()

  if (/^https?:\/\/\S+$/i.test(trimmed)) {
    return { kind: "link", url: trimmed }
  }

  return undefined
}

function isReadableTextFile(file: File) {
  const name = file.name.toLowerCase()
  const mime = file.type.toLowerCase()

  if (file.size > fileTextLimit * 2) {
    return false
  }

  return (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/x-ndjson" ||
    [".txt", ".md", ".csv", ".json", ".html", ".xml", ".yml", ".yaml", ".log"].some((extension) => name.endsWith(extension))
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`

  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`

  return `${(kb / 1024).toFixed(1)} MB`
}

function withAccessToken(payload: Record<string, unknown>) {
  return {
    ...payload,
    accessToken: window.localStorage.getItem("volynx_access_token")
  }
}

async function postOutput(url: string, payload: Record<string, unknown>): Promise<OutputResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  })
  const data = (await response.json()) as OutputResponse

  if (!response.ok || data.error) {
    throw new Error(data.error ?? "Output request failed.")
  }

  return data
}

function getSpeechRecognition() {
  if (typeof window === "undefined") return null

  return (
    (window as unknown as { SpeechRecognition?: new () => VoiceRecognition }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => VoiceRecognition }).webkitSpeechRecognition ??
    null
  )
}

function getInlineAiStatus() {
  if (typeof window === "undefined") return { label: "Checking AI", tone: "text-zinc-400" }

  const token = window.localStorage.getItem("volynx_access_token")

  return token
    ? { label: "VOLYNX AI ready", tone: "text-emerald-100" }
    : { label: "Local fallback", tone: "text-amber-100" }
}
