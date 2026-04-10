/**
 * VOLYNX — AI Tools (Supabase Edge Function)
 *
 * Routes AI requests for summary, writing, and decision tools.
 * Called by daily.volynx.world after token deduction is handled client-side.
 *
 * Request:
 *   POST /ai-tools
 *   { tool: "summary"|"writing"|"decision", input: {...}, lite: boolean }
 *
 * Response:
 *   200: { result: string, lite: boolean }
 *   400/500: { error: string }
 *
 * Required secrets: ANTHROPIC_API_KEY
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "claude-haiku-4-5-20251001";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function callClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message || `Claude API error ${res.status}`);
  }

  const data = await res.json();
  return (data as { content?: Array<{ text?: string }> }).content?.[0]?.text || "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const { tool, input, lite } = body as { tool: string; input: Record<string, string>; lite?: boolean };

    if (!tool || !input) return json({ error: "Missing tool or input" }, 400);

    const isLite = Boolean(lite);
    const maxTokens = isLite ? 400 : 1024;

    let system = "";
    let user = "";

    // ── Summary ────────────────────────────────────────────────
    if (tool === "summary") {
      const { text } = input;
      if (!text?.trim()) return json({ error: "Missing text" }, 400);

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
      const { text, mode } = input;
      if (!text?.trim()) return json({ error: "Missing text" }, 400);

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

    // ── Decision ───────────────────────────────────────────────
    } else if (tool === "decision") {
      const { optionA, optionB, criteria } = input;
      if (!optionA?.trim() || !optionB?.trim()) return json({ error: "Missing options" }, 400);

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

    } else {
      return json({ error: `Unknown tool: ${tool}` }, 400);
    }

    const result = await callClaude(system, user, maxTokens);
    return json({ result, lite: isLite });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[ai-tools] Error:", message);
    return json({ error: message }, 500);
  }
});
