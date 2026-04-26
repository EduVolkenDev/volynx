import type { DailyCaptureSource, DailyIntent } from "@/types/daily"
import type { DailyRouteKind } from "@/lib/daily/routing-engine"

export type DailyValidationCase = {
  id: string
  description: string
  rawContent: string
  source?: DailyCaptureSource
  expectedIntent: DailyIntent
  expectedRoute: DailyRouteKind
  expectedTasks?: Array<{
    titleIncludes: string
    dueDate: string | null
  }>
}

export const dailyValidationReferenceDate = new Date("2026-04-27T09:00:00.000Z")

export const dailyValidationCases: DailyValidationCase[] = [
  {
    id: "meeting-action-items",
    description: "Meeting notes should become concrete tasks with simple due dates.",
    rawContent: [
      "Meeting with Ana about the launch.",
      "Action items:",
      "- Send revised proposal tomorrow",
      "- Book onboarding call on Friday",
      "- Check API quota with DevOps"
    ].join("\n"),
    expectedIntent: "task",
    expectedRoute: "task",
    expectedTasks: [
      { titleIncludes: "Send revised proposal", dueDate: "2026-04-28" },
      { titleIncludes: "Book onboarding call", dueDate: "2026-05-01" },
      { titleIncludes: "Check API quota with DevOps", dueDate: null }
    ]
  },
  {
    id: "link-summary",
    description: "A raw link should route to summary instead of polluting the task list.",
    rawContent: "https://example.com/articles/launch-postmortem",
    source: { kind: "link", url: "https://example.com/articles/launch-postmortem" },
    expectedIntent: "summary",
    expectedRoute: "summary"
  },
  {
    id: "draft-request",
    description: "Draft requests should route to writing, not task extraction.",
    rawContent: "Draft a follow-up email to Ana explaining the revised timeline and next steps.",
    expectedIntent: "writing",
    expectedRoute: "writing"
  },
  {
    id: "decision-vs",
    description: "A vs B comparisons should route into decision support.",
    rawContent: "Keep the current onboarding flow vs rebuild it from scratch considering launch speed and maintenance cost.",
    expectedIntent: "decision",
    expectedRoute: "decision"
  },
  {
    id: "scanner-file",
    description: "File captures should preserve scanner intent instead of falling back to vault.",
    rawContent: "Uploaded file: invoice-april.pdf",
    source: { kind: "file", filename: "invoice-april.pdf", mimeType: "application/pdf", sizeBytes: 48231 },
    expectedIntent: "scanner",
    expectedRoute: "scanner"
  },
  {
    id: "search-context",
    description: "Retrieval requests should route to context search.",
    rawContent: "Find the note about Stripe webhook retries from last week.",
    expectedIntent: "search",
    expectedRoute: "search"
  },
  {
    id: "vault-calm-idea",
    description: "Loose ideas without explicit action should stay in vault.",
    rawContent: "Interesting angle for the homepage hero: make delivery feel calmer, not louder.",
    expectedIntent: "vault",
    expectedRoute: "vault"
  }
]
