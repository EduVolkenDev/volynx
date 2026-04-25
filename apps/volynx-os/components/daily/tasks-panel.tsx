"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Circle, CircleDashed, Clock3, Loader2, Plus, ShieldAlert } from "lucide-react"
import type { DailyItem, DailyTask, DailyTaskStatus } from "@/types/daily"
import { createDailyTaskRecords } from "@/lib/daily/task-engine"
import {
  DAILY_ITEMS_UPDATED_EVENT,
  DAILY_TASKS_UPDATED_EVENT,
  readDailyItemsFromLocalStorage,
  readDailyTasksFromLocalStorage,
  upsertDailyTaskLocal,
  upsertDailyTasksLocal
} from "@/lib/daily/storage"
import { cn } from "@/lib/utils"

type TasksResponse = {
  tasks?: DailyTask[]
  error?: string
}

const statusOptions: Array<{ value: DailyTaskStatus; label: string; icon: typeof Circle }> = [
  { value: "todo", label: "Todo", icon: Circle },
  { value: "doing", label: "Doing", icon: Clock3 },
  { value: "done", label: "Done", icon: Check },
  { value: "blocked", label: "Blocked", icon: ShieldAlert }
]

export function TasksPanel() {
  const [items, setItems] = useState<DailyItem[]>([])
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [selectedItemId, setSelectedItemId] = useState("")
  const [manualTask, setManualTask] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => {
      const nextItems = readDailyItemsFromLocalStorage()
      setItems(nextItems)
      setTasks(readDailyTasksFromLocalStorage())
      setSelectedItemId((current) => current || nextItems.find((item) => item.intent.intent === "task")?.id || nextItems[0]?.id || "")
    }

    sync()
    window.addEventListener(DAILY_ITEMS_UPDATED_EVENT, sync)
    window.addEventListener(DAILY_TASKS_UPDATED_EVENT, sync)
    window.addEventListener("storage", sync)

    return () => {
      window.removeEventListener(DAILY_ITEMS_UPDATED_EVENT, sync)
      window.removeEventListener(DAILY_TASKS_UPDATED_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  )
  const taskSourceText = manualTask.trim() || selectedItem?.cleanContent || ""
  const canGenerate = taskSourceText.length > 0
  const groupedTasks = useMemo(() => ({
    open: tasks.filter((task) => task.status === "todo" || task.status === "doing" || task.status === "blocked"),
    done: tasks.filter((task) => task.status === "done")
  }), [tasks])

  async function handleGenerateTasks() {
    if (!canGenerate || isGenerating) return

    setIsGenerating(true)
    setError(null)

    const localTasks = await createDailyTaskRecords({
      sourceItemId: selectedItem?.id ?? "ad-hoc",
      rawContent: taskSourceText
    })

    setTasks(upsertDailyTasksLocal(localTasks))

    try {
      const response = await fetch("/api/daily/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceItemId: selectedItem?.id ?? "ad-hoc",
          rawContent: taskSourceText
        })
      })
      const data = (await response.json()) as TasksResponse

      if (!response.ok || !data.tasks) {
        throw new Error(data.error ?? "Tasks could not be generated.")
      }

      setTasks(upsertDailyTasksLocal(data.tasks))
      setManualTask("")
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "Tasks were saved locally, but processing failed.")
    } finally {
      setIsGenerating(false)
    }
  }

  function updateTaskStatus(task: DailyTask, status: DailyTaskStatus) {
    const updated: DailyTask = {
      ...task,
      status,
      updatedAt: new Date().toISOString()
    }

    setTasks(upsertDailyTaskLocal(updated))
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-glow backdrop-blur md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Tasks</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Convert loose intent into trackable work.</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-white/10 bg-black/25 px-4 py-2">
            <p className="text-xl font-semibold text-white">{groupedTasks.open.length}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Open</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 px-4 py-2">
            <p className="text-xl font-semibold text-white">{groupedTasks.done.length}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Done</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          <label className="grid gap-2 text-sm text-zinc-400">
            Source capture
            <select
              value={selectedItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-emerald-200/40"
            >
              <option value="">Manual task</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>

          <textarea
            value={manualTask}
            onChange={(event) => setManualTask(event.target.value)}
            placeholder={selectedItem ? "Optional: override selected capture..." : "Add task notes, bullets or a quick todo..."}
            className="min-h-[140px] resize-none rounded-lg border border-white/10 bg-black/30 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-200/40"
          />

          {error ? (
            <p className="rounded-lg border border-amber-200/20 bg-amber-200/[0.06] px-4 py-3 text-sm leading-6 text-amber-100">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleGenerateTasks}
            disabled={!canGenerate || isGenerating}
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-medium transition",
              canGenerate && !isGenerating ? "bg-white text-black hover:opacity-90" : "cursor-not-allowed bg-white/10 text-zinc-500"
            )}
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create tasks
          </button>
        </div>

        <div className="grid gap-3">
          {tasks.length ? (
            tasks.map((task) => (
              <article key={task.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={cn("text-base font-semibold leading-6 text-white", task.status === "done" && "text-zinc-500 line-through")}>
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">Source: {task.sourceItemId === "ad-hoc" ? "Manual" : "Capture"}</p>
                  </div>
                  <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-500">{task.status}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {statusOptions.map((option) => {
                    const Icon = option.icon

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateTaskStatus(task, option.value)}
                        className={cn(
                          "inline-flex items-center rounded-md border px-3 py-2 text-xs font-medium transition",
                          task.status === option.value
                            ? "border-emerald-200/30 bg-emerald-200/[0.08] text-emerald-100"
                            : "border-white/10 bg-white/[0.03] text-zinc-500 hover:text-white"
                        )}
                      >
                        <Icon className="mr-1.5 h-3.5 w-3.5" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 p-6 text-sm leading-6 text-zinc-500">
              Task captures will become trackable tasks here.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

