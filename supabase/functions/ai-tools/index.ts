/**
 * VOLYNX — AI Tools (Supabase Edge Function)
 *
 * Routes AI requests for intent, summary, writing, task, decision, Lumina, and CVitae tools.
 * Billing and free quotas are enforced here, never trusted to the browser.
 *
 * Request:
 *   POST /ai-tools
 *   { tool: "intent"|"summary"|"writing"|"task"|"decision"|"lumina"|"cvitae", input: {...}, request_id: UUID }
 *
 * Response:
 *   200: { result: string, lite: boolean }
 *   400/500: { error: string }
 *
 * Required secrets: ANTHROPIC_API_KEY
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { callAiProvider } from "../_shared/ai-provider.ts";
import {
  corsHeaders,
  isUuid,
  jsonResponse,
  parseJsonObject,
  rejectUnexpectedOrigin,
  requireAuthenticatedUser,
} from "../_shared/edge-security.ts";

const MAX_INPUT_BYTES = 16_000;
const TOOL_POLICY: Record<string, { actionClass: "light" | "medium" | "pro"; cost: number; freeLimit: number }> = {
  intent: { actionClass: "light", cost: 1, freeLimit: 20 },
  summary: { actionClass: "medium", cost: 2, freeLimit: 5 },
  writing: { actionClass: "light", cost: 1, freeLimit: 5 },
  task: { actionClass: "medium", cost: 2, freeLimit: 8 },
  decision: { actionClass: "pro", cost: 4, freeLimit: 3 },
  lumina: { actionClass: "medium", cost: 2, freeLimit: 5 },
  cvitae: { actionClass: "medium", cost: 2, freeLimit: 3 },
};

function cvitaeLanguageLabel(language?: string): string {
  const raw = String(language || "").trim().toLowerCase();
  if (raw === "pt" || raw === "pt-br" || raw.includes("portuguese")) return "Brazilian Portuguese";
  return "English";
}

Deno.serve(async (req: Request) => {
  const blockedOrigin = rejectUnexpectedOrigin(req);
  if (blockedOrigin) return blockedOrigin;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  const respond = (data: Record<string, unknown>, status = 200) => jsonResponse(req, data, status);
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  let billing: ReturnType<typeof createClient> | null = null;
  let userId = "";
  let requestId = "";
  let reservationStarted = false;
  try {
    const auth = await requireAuthenticatedUser(req);
    if (!auth) return respond({ error: "Authentication required" }, 401);

    const body = await parseJsonObject(req, 20_000);
    const tool = String(body.tool || "").trim().toLowerCase();
    const input = body.input;

    if (!TOOL_POLICY[tool] || !input || typeof input !== "object" || Array.isArray(input)) {
      return respond({ error: "Missing or invalid tool/input" }, 400);
    }
    if (!isUuid(body.request_id)) return respond({ error: "A valid request_id is required" }, 400);
    if (new TextEncoder().encode(JSON.stringify(input)).byteLength > MAX_INPUT_BYTES) {
      return respond({ error: "Input is too large" }, 413);
    }
    const toolInput = input as Record<string, string>;

    let isLite = false;
    let maxTokens = 1024;

    let system = "";
    let user = "";

    // ── Intent ─────────────────────────────────────────────────
    if (tool === "intent") {
      const { text, sourceKind, sourceUrl, filename } = toolInput;
      if (!text?.trim() && !filename?.trim()) return respond({ error: "Missing text" }, 400);

      system = `You classify captures for a personal execution system.
Return valid JSON only. No markdown, no preamble, no code fences.

Schema:
{
  "intent": "task" | "summary" | "writing" | "vault" | "decision" | "scanner" | "search" | "unknown",
  "confidence": number,
  "suggestedActions": [
    {
      "type": "create_task" | "summarize" | "draft_text" | "save_to_vault" | "make_decision" | "scan_file" | "search_context",
      "label": string,
      "confidence": number,
      "reason": string
    }
  ],
  "entities": [
    {
      "type": "person" | "company" | "project" | "place" | "date" | "topic" | "url" | "file" | "unknown",
      "name": string,
      "normalizedName": string,
      "confidence": number
    }
  ]
}

Routing rules:
- "scanner" for files, screenshots, PDFs, invoices, or content that should be processed before action.
- "search" for requests to find, locate, retrieve, or pull up previous context.
- "task" for explicit action items, follow-ups, deadlines, or next steps.
- "summary" for source material, long notes, raw links, transcripts, or reading material.
- "writing" for explicit drafting/rewriting requests.
- "decision" for A vs B style comparison or choice.
- "vault" for ideas, references, or context worth storing without immediate action.

Choose the single best intent and include 1-2 suggestedActions. Keep entities short and high-confidence only.`;
      user = `Source kind: ${sourceKind || "text"}\nSource URL: ${sourceUrl || ""}\nFilename: ${filename || ""}\n\nCapture:\n${text || ""}`;

    // ── Summary ────────────────────────────────────────────────
    } else if (tool === "summary") {
      const { text } = toolInput;
      if (!text?.trim()) return respond({ error: "Missing text" }, 400);

      if (isLite) {
        system = "You are a concise summarizer. Respond with exactly 3 bullet points starting with •. No preamble.";
        user = text;
      } else {
        system = `You are a professional summarizer. Respond in this exact format:

SUMMARY:
[2–3 sentences capturing the key message]

ACTIONS:
[bullet list of concrete next steps, or "No actions identified." if none]`;
        user = text;
      }

    // ── Writing ────────────────────────────────────────────────
    } else if (tool === "writing") {
      const { text, mode } = toolInput;
      if (!text?.trim()) return respond({ error: "Missing text" }, 400);

      const instructions: Record<string, string> = {
        professional: "Rewrite the following text to be more professional and polished. Keep the same core meaning.",
        shorter: "Make the following text significantly shorter while preserving all key information. Cut filler words ruthlessly.",
        friendlier: "Rewrite the following text with a warmer, more approachable and friendly tone.",
        clearer: "Rewrite the following text to be clearer and easier to understand. Use simple language.",
      };
      const instruction = instructions[mode] || instructions.professional;
      const suffix = isLite ? " Be concise — output only the rewritten text, no commentary." : " Output only the rewritten text, no preamble or explanation.";
      system = instruction + suffix;
      user = text;

    // ── Task extraction ────────────────────────────────────────
    } else if (tool === "task") {
      const { text, referenceDate } = toolInput;
      if (!text?.trim()) return respond({ error: "Missing text" }, 400);

      system = `You extract actionable tasks from captures for a personal execution system.
Return valid JSON only. No markdown, no preamble, no code fences.

Schema:
{
  "tasks": [
    {
      "title": string,
      "dueDate": "YYYY-MM-DD" | null
    }
  ]
}

Rules:
- Only output concrete, actionable tasks.
- Titles must start with a verb when possible.
- Remove meeting headings, context-only sentences, and duplicates.
- If a due date is explicit or strongly implied, normalize it to YYYY-MM-DD using the provided reference date.
- If no due date is clear, use null.
- If there are no real tasks, return {"tasks":[]}.`;
      user = `Reference date: ${referenceDate || ""}\n\nCapture:\n${text}`;

    // ── Decision ───────────────────────────────────────────────
    } else if (tool === "decision") {
      const { optionA, optionB, criteria } = toolInput;
      if (!optionA?.trim() || !optionB?.trim()) return respond({ error: "Missing options" }, 400);

      const criteriaLine = criteria?.trim() ? `\nDecision criteria: ${criteria}` : "";

      if (isLite) {
        system = "Compare two options. List 2 pros and 2 cons for each. End with one sentence: 'Recommendation: [option] because [reason].' Be brief.";
        user = `Option A: ${optionA}\nOption B: ${optionB}${criteriaLine}`;
      } else {
        system = `You are a rational decision analyst. Structure your response as:

**Option A — Pros:** (3–4 points)
**Option A — Cons:** (2–3 points)

**Option B — Pros:** (3–4 points)
**Option B — Cons:** (2–3 points)

**Recommendation:** [clear choice with a sentence explaining why]

**Key risk:** [one caveat to watch for]`;
        user = `Option A: ${optionA}\nOption B: ${optionB}${criteriaLine}`;
      }

    // ── CVitae resume copilot ────────────────────────────────
    } else if (tool === "lumina") {
      const { text, mode, language } = toolInput;
      if (!text?.trim()) return respond({ error: "Missing text" }, 400);

      const languageLabel: Record<string, string> = {
        pt: "Portuguese",
        en: "English",
        es: "Spanish",
      };
      const modeLabel: Record<string, string> = {
        clear: "Modo Claro: explain in simple, direct, human language for beginners.",
        deep: "Modo Profundo: preserve complexity, but organize it with strong technical structure.",
        practical: "Modo Pratico: turn the knowledge into actions, use cases, project ideas, and decisions.",
        multilingual: "Modo Multilingue: explain the content in Portuguese, English, and Spanish.",
        creator: "Modo Criador: transform the knowledge into educational content ideas, post angles, lesson structure, or a site section.",
      };
      maxTokens = isLite ? 650 : 1400;
      system = `You are Volynx Lumina, an intelligence created to democratize knowledge.

Mission:
Transform complex scientific, technical, educational, and cultural content into explanations that are clear, human, accessible, multilingual when requested, and applicable.

Rules:
- Identify the main topic.
- Explain the content simply while preserving accuracy.
- Avoid unnecessary academic language.
- Explain difficult terms.
- Show why the content matters.
- Point to practical applications.
- Adapt the answer to the requested language.
- Never invent data, sources, authors, dates, or findings.
- State when the input is incomplete, uncertain, or requires verification.
- Do not claim to have opened links or PDFs unless the content was provided in the prompt.

Response format:
Title:
Essential summary:
Simple explanation:
Important concepts:
Why this matters:
Practical applications:
Limitations or cautions:
Questions to keep learning:`;
      user = `Requested language: ${languageLabel[language || "pt"] || "Portuguese"}
Requested mode: ${modeLabel[mode || "clear"] || modeLabel.clear}

Content to illuminate:
${text}`;

    } else if (tool === "cvitae") {
      const { mode, role, name, summary, skills, languages, location, experience, experiences, currentText, language } = toolInput;
      const outputLanguage = cvitaeLanguageLabel(language);

      if (!mode?.trim()) return respond({ error: "Missing mode" }, 400);

      if (mode === "summary_draft") {
        system = `You are CVitae AI, an expert resume copywriter.
Write a professional resume summary in ${outputLanguage}.

Rules:
- Output only the final summary text.
- Use 2 to 3 concise sentences.
- Sound credible, modern, and hiring-ready.
- Focus on value, strengths, and direction.
- Avoid generic filler like "hard-working", "go-getter", or "team player" unless strongly supported by the input.
- Do not use markdown, bullets, labels, quotation marks, or preamble.`;
        user = `Candidate name: ${name || ""}
Target role: ${role || ""}
Location: ${location || ""}
Existing skills: ${skills || ""}
Languages: ${languages || ""}
Experience notes:
${experiences || ""}

Use the available information only. If the background is junior, make it sound promising and specific without inventing seniority.`;
      } else if (mode === "summary_polish") {
        if (!summary?.trim()) return respond({ error: "Missing summary" }, 400);

        system = `You are CVitae AI, an expert resume copywriter.
Rewrite the candidate summary in ${outputLanguage}.

Rules:
- Output only the improved summary text.
- Keep it to 2 to 3 concise sentences.
- Make it clearer, more professional, and more compelling.
- Preserve the candidate's real background and tone.
- Remove fluff, repetition, and weak phrasing.
- Do not use markdown, bullets, labels, or quotation marks.`;
        user = `Target role: ${role || ""}
Relevant skills: ${skills || ""}
Relevant experience:
${experiences || ""}

Current summary:
${summary}`;
      } else if (mode === "skills_suggest") {
        system = `You are CVitae AI, an expert resume strategist.
Generate resume-ready skills in ${outputLanguage}.

Rules:
- Output only a comma-separated list.
- Return 10 to 14 skills.
- Tailor the list to the target role and evidence provided.
- Prefer concrete tools, competencies, and job-relevant strengths.
- Avoid duplicates and vague filler.
- Do not add bullets, numbering, labels, or commentary.`;
        user = `Candidate name: ${name || ""}
Target role: ${role || ""}
Summary: ${summary || ""}
Existing skills: ${skills || ""}
Experience notes:
${experiences || ""}`;
      } else if (mode === "experience_improve") {
        const rawText = currentText || experience || "";
        if (!rawText?.trim()) return respond({ error: "Missing experience text" }, 400);

        system = `You are CVitae AI, an expert resume copywriter.
Rewrite a work experience description in ${outputLanguage}.

Rules:
- Output only the improved experience description.
- Use 1 to 3 concise achievement-driven sentences.
- Emphasize impact, scope, ownership, and outcomes when supported by the input.
- Keep it honest: do not invent metrics, tools, or responsibilities.
- Avoid first-person language.
- Do not use markdown, bullets, labels, or quotation marks.`;
        user = `Candidate target role: ${role || ""}
Job entry details:
${experience || ""}

Current description:
${rawText}`;
      } else {
        return respond({ error: `Unknown CVitae mode: ${mode}` }, 400);
      }

    } else {
      return respond({ error: `Unknown tool: ${tool}` }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[ai-tools] required server configuration is missing");
      return respond({ error: "AI is temporarily unavailable" }, 503);
    }

    userId = auth.user.id;
    requestId = body.request_id;
    const policy = TOOL_POLICY[tool];
    billing = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: reservation, error: reservationError } = await billing.rpc("reserve_ai_usage", {
      p_user_id: userId,
      p_request_id: requestId,
      p_tool_name: tool,
      p_action_class: policy.actionClass,
      p_token_cost: policy.cost,
      p_free_limit: policy.freeLimit,
      p_allow_free_fallback: true,
      p_description: `AI ${tool}`,
      p_metadata: { input_bytes: new TextEncoder().encode(JSON.stringify(toolInput)).byteLength },
    });
    if (reservationError || !reservation?.ok) {
      const reason = reservation?.error || "billing_unavailable";
      const status = reason === "insufficient_balance" ? 402 : reason === "rate_limited" ? 429 : 409;
      return respond({ error: reason, balance: reservation?.balance, required: reservation?.required }, status);
    }
    reservationStarted = true;
    isLite = reservation.lite === true;
    maxTokens = isLite ? 400 : 1024;
    if (isLite) {
      system += "\n\nThis is a compact free response. Keep the answer focused, useful, and within the available space.";
    }

    const result = await callAiProvider({
      product: "volynx",
      capability: tool as Parameters<typeof callAiProvider>[0]["capability"],
      system,
      user,
      maxTokens,
      requestId,
    });
    const { error: completeError } = await billing.rpc("complete_ai_usage", {
      p_user_id: userId,
      p_request_id: requestId,
      p_success: true,
    });
    if (completeError) {
      console.error("[ai-tools] could not finalize usage", completeError.message);
      throw new Error("billing_finalize_failed");
    }
    return respond({ result, lite: isLite, balance: reservation.balance, spent: reservation.spent });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "server_error";
    console.error("[ai-tools] error", message);
    if (reservationStarted && billing && userId && requestId) {
      const { error: refundError } = await billing.rpc("complete_ai_usage", {
        p_user_id: userId,
        p_request_id: requestId,
        p_success: false,
        p_failure_reason: message,
      });
      if (refundError) console.error("[ai-tools] automatic refund failed", refundError.message);
    }
    const status = message === "request_too_large" ? 413 : message === "invalid_request" ? 400 : 503;
    return respond({ error: "AI could not complete this request. No VX was kept for a failed request." }, status);
  }
});
