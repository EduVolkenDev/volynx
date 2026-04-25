import type { Metadata } from "next"
import { Archive, CalendarDays, FileText, GitCompareArrows, ListTodo, PenLine, Sparkles, Zap } from "lucide-react"
import { BrandLockup } from "@/components/common/brand-lockup"
import { SiteFooter } from "@/components/common/site-footer"
import { SiteHeader } from "@/components/common/site-header"
import { CommandInbox } from "@/components/daily/command-inbox"
import { CaptureBar } from "@/components/daily/capture-bar"
import { DecisionPanel } from "@/components/daily/decision-panel"
import { MyDayPanel } from "@/components/daily/my-day-panel"
import { SummaryPanel } from "@/components/daily/summary-panel"
import { TasksPanel } from "@/components/daily/tasks-panel"
import { WritingPanel } from "@/components/daily/writing-panel"

export const metadata: Metadata = {
  title: "VOLYNX Daily - Personal Execution OS",
  description: "Capture anything and turn it into tasks, summaries, drafts and structured knowledge."
}

const dailyModules = [
  { href: "#command", label: "Command", icon: Zap },
  { href: "#my-day", label: "My Day", icon: CalendarDays },
  { href: "#capture", label: "Capture", icon: Sparkles },
  { href: "#summary", label: "Summary", icon: FileText },
  { href: "#writing", label: "Writing", icon: PenLine },
  { href: "#tasks", label: "Tasks", icon: ListTodo },
  { href: "#decision", label: "Decision", icon: GitCompareArrows }
] as const

export default function DailyPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen border-t border-white/5 bg-[radial-gradient(circle_at_28%_0%,rgba(45,212,191,.11),transparent_30rem),radial-gradient(circle_at_80%_10%,rgba(251,191,36,.08),transparent_26rem)]">
        <section className="container-shell py-8 md:py-10">
          <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <BrandLockup size="sm" caption="VX signature" className="mb-5" />
              <span className="eyebrow">VOLYNX Daily MVP</span>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                The place where thoughts become actions.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
                A focused daily workspace for capture, execution, writing and follow-through.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-glow backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Workspace</p>
                  <p className="mt-2 text-lg font-semibold text-white">Today</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-black">
                  <Archive className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                  <p className="text-sm font-semibold text-white">Live</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-600">Mode</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                  <p className="text-sm font-semibold text-white">Local</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-600">Vault</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                  <p className="text-sm font-semibold text-white">Fast</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-600">Flow</p>
                </div>
              </div>
            </div>
          </div>

          <nav className="sticky top-[118px] z-20 mb-5 rounded-lg border border-white/10 bg-[#070807]/85 p-2 backdrop-blur-xl md:top-[76px]" aria-label="Daily modules">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
              {dailyModules.map((module) => {
                const Icon = module.icon

                return (
                  <a
                    key={module.href}
                    href={module.href}
                    className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {module.label}
                  </a>
                )
              })}
            </div>
          </nav>

          <div className="grid gap-5">
            <div id="command" className="scroll-mt-24">
              <CommandInbox />
            </div>
            <div id="my-day" className="scroll-mt-24">
              <MyDayPanel />
            </div>
            <div id="capture" className="scroll-mt-24">
              <CaptureBar />
            </div>
            <div id="summary" className="scroll-mt-24">
              <SummaryPanel />
            </div>
            <div id="writing" className="scroll-mt-24">
              <WritingPanel />
            </div>
            <div id="tasks" className="scroll-mt-24">
              <TasksPanel />
            </div>
            <div id="decision" className="scroll-mt-24">
              <DecisionPanel />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
