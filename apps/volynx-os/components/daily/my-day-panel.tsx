"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, CalendarDays, CheckCircle2, CircleDashed, FileText, Lightbulb, ListTodo } from "lucide-react"
import type { DailyActionType, DailyItem, DailyTask } from "@/types/daily"
import {
  DAILY_ITEMS_UPDATED_EVENT,
  DAILY_TASKS_UPDATED_EVENT,
  readDailyItemsFromLocalStorage,
  readDailyTasksFromLocalStorage
} from "@/lib/daily/storage"
import { cn } from "@/lib/utils"

type MyDayAction = {
  id: string
  item: DailyItem
  type: DailyActionType
  label: string
  reason: string
  confidence: number
}

const actionCopy: Record<DailyActionType, { label: string; tone: string }> = {
  create_task: { label: "Task", tone: "text-emerald-100 bg-emerald-300/10 border-emerald-200/20" },
  summarize: { label: "Summary", tone: "text-cyan-100 bg-cyan-300/10 border-cyan-200/20" },
  draft_text: { label: "Writing", tone: "text-violet-100 bg-violet-300/10 border-violet-200/20" },
  save_to_vault: { label: "Vault", tone: "text-zinc-200 bg-white/[0.05] border-white/10" },
  make_decision: { label: "Decision", tone: "text-amber-100 bg-amber-300/10 border-amber-200/20" },
  scan_file: { label: "Scan", tone: "text-blue-100 bg-blue-300/10 border-blue-200/20" },
  search_context: { label: "Context", tone: "text-rose-100 bg-rose-300/10 border-rose-200/20" }
}

export function MyDayPanel() {
  const [items, setItems] = useState<DailyItem[]>([])
  const [tasks, setTasks] = useState<DailyTask[]>([])

  useEffect(() => {
    setItems(readDailyItemsFromLocalStorage())
    setTasks(readDailyTasksFromLocalStorage())

    const onItemsUpdated = () => {
      setItems(readDailyItemsFromLocalStorage())
      setTasks(readDailyTasksFromLocalStorage())
    }

    window.addEventListener(DAILY_ITEMS_UPDATED_EVENT, onItemsUpdated)
    window.addEventListener(DAILY_TASKS_UPDATED_EVENT, onItemsUpdated)
    window.addEventListener("storage", onItemsUpdated)

    return () => {
      window.removeEventListener(DAILY_ITEMS_UPDATED_EVENT, onItemsUpdated)
      window.removeEventListener(DAILY_TASKS_UPDATED_EVENT, onItemsUpdated)
      window.removeEventListener("storage", onItemsUpdated)
    }
  }, [])

  const actions = useMemo(() => createMyDayActions(items), [items])
  const taskItems = items.filter((item) => item.intent.intent === "task")
  const openTasks = tasks.filter((task) => task.status !== "done" && task.status !== "archived")
  const reviewItems = items.filter((item) => item.status === "needs_review" || item.intent.intent === "decision")
  const recentItems = items.slice(0, 5)

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-glow backdrop-blur md:p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">My Day</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Action queue from today&apos;s captures.</h2>
            </div>
            <span className="inline-flex items-center rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-400">
              <CalendarDays className="mr-2 h-4 w-4" />
              {new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short" }).format(new Date())}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MetricCard icon={ListTodo} label="Actions" value={actions.length} />
            <MetricCard icon={CheckCircle2} label="Open tasks" value={openTasks.length || taskItems.length} />
            <MetricCard icon={CircleDashed} label="Review" value={reviewItems.length} />
          </div>

          <div className="mt-5 grid gap-3">
            {actions.length ? (
              actions.slice(0, 6).map((action) => (
                <article key={action.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={cn("inline-flex rounded-md border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em]", actionCopy[action.type].tone)}>
                        {actionCopy[action.type].label}
                      </span>
                      <h3 className="mt-3 text-base font-semibold text-white">{action.label}</h3>
                    </div>
                    <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-500">
                      {Math.round(action.confidence * 100)}%
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{action.item.title}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-600">{action.reason}</p>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-white/10 p-6 text-sm leading-6 text-zinc-500">
                Capture something and My Day will turn it into an action queue.
              </div>
            )}
          </div>
        </div>

        <aside className="grid content-start gap-3">
          <SidePanel title="Needs Attention" icon={Lightbulb}>
            {reviewItems.length ? (
              reviewItems.slice(0, 3).map((item) => <MiniItem key={item.id} item={item} />)
            ) : (
              <p className="text-sm leading-6 text-zinc-500">No review items right now.</p>
            )}
          </SidePanel>

          <SidePanel title="Open Tasks" icon={ListTodo}>
            {openTasks.length ? (
              openTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm font-medium leading-5 text-zinc-200">{task.title}</p>
                  <p className="mt-1 text-xs text-zinc-600">{task.status}</p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-zinc-500">No open tasks yet.</p>
            )}
          </SidePanel>

          <SidePanel title="Recent Input" icon={FileText}>
            {recentItems.length ? (
              recentItems.map((item) => <MiniItem key={item.id} item={item} />)
            ) : (
              <p className="text-sm leading-6 text-zinc-500">Your latest captures will appear here.</p>
            )}
          </SidePanel>
        </aside>
      </div>
    </section>
  )
}

function createMyDayActions(items: DailyItem[]): MyDayAction[] {
  return items.flatMap((item) => {
    const suggested = item.intent.suggestedActions.length
      ? item.intent.suggestedActions
      : [{ type: "save_to_vault" as const, label: "Save to Vault", reason: "Keep the input searchable.", confidence: 0.4 }]

    return suggested.map((action, index) => ({
      id: `${item.id}-${action.type}-${index}`,
      item,
      type: action.type,
      label: action.label,
      reason: action.reason,
      confidence: action.confidence
    }))
  })
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof ListTodo; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-4">
      <Icon className="h-5 w-5 text-zinc-500" />
      <p className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
    </div>
  )
}

function SidePanel({ title, icon: Icon, children }: { title: string; icon: typeof Lightbulb; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  )
}

function MiniItem({ item }: { item: DailyItem }) {
  return (
    <div className="group rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-200">{item.title}</p>
          <p className="mt-1 text-xs text-zinc-600">{item.intent.intent} / {item.status}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-zinc-700 transition group-hover:text-zinc-300" />
      </div>
    </div>
  )
}
