import Image from "next/image"
import type { Metadata } from "next"
import { ArrowUpRight, CalendarDays, FileText, GitCompareArrows, ListTodo, PenLine, Sparkles, Zap } from "lucide-react"
import { SiteFooter } from "@/components/common/site-footer"
import { SiteHeader } from "@/components/common/site-header"
import { CommandInbox } from "@/components/daily/command-inbox"
import { CaptureBar } from "@/components/daily/capture-bar"
import { DailySyncBootstrap } from "@/components/daily/daily-sync-bootstrap"
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
  { href: "#command", label: "Command", detail: "route", icon: Zap },
  { href: "#my-day", label: "My Day", detail: "focus", icon: CalendarDays },
  { href: "#capture", label: "Capture", detail: "save", icon: Sparkles },
  { href: "#summary", label: "Summary", detail: "brief", icon: FileText },
  { href: "#writing", label: "Writing", detail: "draft", icon: PenLine },
  { href: "#tasks", label: "Tasks", detail: "track", icon: ListTodo },
  { href: "#decision", label: "Decision", detail: "compare", icon: GitCompareArrows }
] as const

const workspaceSignals = [
  { label: "Mode", value: "Live" },
  { label: "Vault", value: "Local" },
  { label: "Flow", value: "Fast" }
] as const

export default function DailyPage() {
  return (
    <>
      <DailySyncBootstrap />
      <SiteHeader />
      <main className="daily-stage min-h-screen border-t border-white/5">
        <section className="container-shell relative py-8 md:py-12">
          <div className="daily-hero mb-7 overflow-hidden rounded-lg border border-white/10 px-5 py-6 shadow-[0_36px_120px_rgba(0,0,0,.5)] backdrop-blur-2xl md:px-8 md:py-9 lg:px-10">
            <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
              <div>
                <div className="mb-7 inline-flex items-center gap-4">
                  <span className="daily-brand-mark">
                    <Image
                      src="/assets/brand/daily-icon.webp"
                      alt="Volynx Daily icon"
                      width={192}
                      height={192}
                      priority
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-semibold leading-none tracking-[0.24em] text-white md:text-lg">
                      VOLYNX DAILY
                    </span>
                    <span className="mt-2 block text-[10px] uppercase leading-none tracking-[0.24em] text-zinc-500">
                      Personal execution OS
                    </span>
                  </span>
                </div>
                <span className="daily-kicker">Daily workspace</span>
                <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-none text-white md:text-6xl lg:text-7xl">
                  Volynx Daily
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
                  Your command layer for capture, planning, writing, decisions and follow-through.
                </p>
              </div>
              <aside className="daily-hero-panel hidden md:block">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase text-zinc-500">Workspace</p>
                    <p className="mt-2 text-2xl font-semibold text-white">Today</p>
                  </div>
                  <span className="daily-icon-button">
                    <ArrowUpRight className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {workspaceSignals.map((signal) => (
                    <div key={signal.label} className="daily-signal-tile">
                      <p className="text-base font-semibold text-white">{signal.value}</p>
                      <p className="mt-1 text-[11px] uppercase text-zinc-500">{signal.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,#f4f4f1,#58d68d,#6ee7f0)]" />
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-400">
                  Local-first capture with server AI upgrades when access is present.
                </p>
              </aside>
            </div>
          </div>

          <nav className="daily-module-nav sticky top-[118px] z-20 mb-6 p-2 md:top-[76px]" aria-label="Daily modules">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
              {dailyModules.map((module) => {
                const Icon = module.icon

                return (
                  <a
                    key={module.href}
                    href={module.href}
                    className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-[background,color,transform,border-color] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-0.5 hover:bg-white/[0.07] hover:text-white"
                  >
                    <Icon className="h-4 w-4 text-zinc-500 transition-colors duration-300 group-hover:text-emerald-200" />
                    <span className="flex flex-col leading-tight">
                      <span>{module.label}</span>
                      <span className="mt-0.5 text-[11px] font-normal text-zinc-600 group-hover:text-zinc-400">{module.detail}</span>
                    </span>
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
      <SiteFooter brand="daily" />
    </>
  )
}
