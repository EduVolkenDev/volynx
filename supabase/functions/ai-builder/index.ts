/**
 * VOLYNX — AI Builder (Supabase Edge Function)
 *
 * Generates valid VxOS builder_data JSON from a natural language description.
 * Also supports "refine" mode to update an existing site's content.
 *
 * Request:
 *   POST /ai-builder
 *   Authorization: Bearer <jwt> (required)
 *   { description: string, refine?: boolean, current?: object, request_id: UUID }
 *
 * Response:
 *   200: { builderData: { brand: {...}, sections: [...] } }
 *   400/500: { error: string }
 *
 * Required secrets: ANTHROPIC_API_KEY
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  corsHeaders,
  isUuid,
  jsonResponse,
  parseJsonObject,
  rejectUnexpectedOrigin,
  requireAuthenticatedUser,
} from "../_shared/edge-security.ts";

// Configurable via Supabase secret AI_MODEL — defaults to Haiku
const MODEL = Deno.env.get("AI_MODEL") || "claude-haiku-4-5-20251001";
const AI_BUILDER_COST = 4;
const MAX_DESCRIPTION_LENGTH = 2_000;
const MAX_CURRENT_BYTES = 100_000;

const SCHEMA_REFERENCE = `
VxOS builder_data JSON schema — ALL output must match this exactly.

TOP LEVEL:
{
  "brand": {
    "name": "string",
    "tagline": "string",
    "colors": {
      "primary": "#hex",
      "bg": "#hex (dark background, e.g. #070A12)",
      "fg": "#hex (light foreground, e.g. #E7EEF7)",
      "accent": "#hex"
    }
  },
  "sections": [ ...section objects ]
}

SECTION TYPES (use the exact type strings):

hero — Main headline and CTA
{
  "type": "hero",
  "variant": "centered" | "split" | "minimal" | "product",
  "content": {
    "badge": "short label above title",
    "title": "main headline",
    "subtitle": "supporting paragraph",
    "primaryCta": { "label": "button text", "href": "#" },
    "secondaryCta": { "label": "button text", "href": "#" }  // optional
  }
}

logoCloud — Trusted-by logos
{
  "type": "logoCloud",
  "content": {
    "title": "Trusted by teams at",
    "items": ["Company A", "Company B", "Company C", "Company D", "Company E"]
  }
}

metrics — Key numbers / stats
{
  "type": "metrics",
  "content": {
    "title": "optional heading",
    "items": [
      { "label": "Uptime", "value": "99.9%" },
      { "label": "Users", "value": "10,000+" }
    ]
  }
}

valueGrid — Feature cards in a grid
{
  "type": "valueGrid",
  "content": {
    "title": "section heading",
    "subtitle": "optional subheading",
    "cards": [
      { "title": "card title", "description": "card body" }
    ]
  }
}

featureSplit — Feature list with optional CTA
{
  "type": "featureSplit",
  "content": {
    "title": "section heading",
    "subtitle": "optional subheading",
    "features": [
      { "text": "feature description" }
    ],
    "primaryCta": { "label": "button text", "href": "#" }  // optional
  }
}

pricing — Plan comparison cards
{
  "type": "pricing",
  "variant": "tiered" | "single" | "comparison",
  "content": {
    "title": "section heading",
    "subtitle": "optional subheading",
    "tiers": [
      {
        "name": "Starter",
        "price": "$0",
        "period": "/month",
        "description": "For individuals",
        "features": ["Feature 1", "Feature 2"],
        "highlight": false,
        "cta": { "label": "Get started", "href": "#" }
      }
    ]
  }
}

faq — Questions and answers
{
  "type": "faq",
  "content": {
    "title": "Frequently asked questions",
    "items": [
      { "question": "Q?", "answer": "A." }
    ]
  }
}

workflow — Step-by-step process
{
  "type": "workflow",
  "content": {
    "title": "How it works",
    "steps": [
      { "title": "Step 1 title", "description": "What happens in this step" }
    ]
  }
}

cta — Final call to action block
{
  "type": "cta",
  "content": {
    "title": "Ready to get started?",
    "subtitle": "Optional supporting line.",
    "primaryCta": { "label": "button text", "href": "#" },
    "secondaryCta": { "label": "button text", "href": "#" }  // optional
  }
}

contactForm — Inline contact form
{
  "type": "contactForm",
  "content": {
    "title": "Get in touch",
    "subtitle": "Optional subheading",
    "fields": [
      { "name": "name", "label": "Your name", "type": "text" },
      { "name": "email", "label": "Email address", "type": "email" },
      { "name": "message", "label": "Message", "type": "textarea" }
    ],
    "cta": { "label": "Send message" }
  }
}

problemStatement — Pain points section
{
  "type": "problemStatement",
  "content": {
    "title": "The problem",
    "subtitle": "Optional subheading",
    "items": [
      { "title": "Pain point title", "description": "Description" }
    ]
  }
}

scopeGrid — Deliverables / services grid
{
  "type": "scopeGrid",
  "content": {
    "title": "What you get",
    "items": [
      { "title": "Deliverable", "description": "Details", "icon": "optional emoji" }
    ]
  }
}

testimonial — Client quote
{
  "type": "testimonial",
  "content": {
    "quote": "The actual quote text.",
    "author": "Full Name",
    "role": "Job Title",
    "company": "Company Name"
  }
}

RULES:
- Output ONLY valid JSON. No markdown, no code fences, no commentary.
- Always include hero and cta sections.
- Use realistic, specific copy — not "Lorem ipsum" or placeholder text.
- Colors: use dark backgrounds (#070A12 or similar) with light text and one accent color.
- 3–8 sections is ideal. Match sections to what the user describes.
- If refining, preserve the overall structure; update content to match new description.
`;

Deno.serve(async (req: Request) => {
  const blockedOrigin = rejectUnexpectedOrigin(req);
  if (blockedOrigin) return blockedOrigin;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  let billing: ReturnType<typeof createClient> | null = null;
  let userId = "";
  let requestId = "";
  let reservationStarted = false;
  try {
    const auth = await requireAuthenticatedUser(req);
    if (!auth) return jsonResponse(req, { error: "Authentication required" }, 401);

    const body = await parseJsonObject(req, 140_000);
    const { description, refine, current } = body as {
      description: string;
      refine?: boolean;
      current?: Record<string, unknown>;
    };

    if (!description?.trim() || description.trim().length > MAX_DESCRIPTION_LENGTH) {
      return jsonResponse(req, { error: "Description must be between 1 and 2,000 characters" }, 400);
    }
    if (!isUuid(body.request_id)) {
      return jsonResponse(req, { error: "A valid request_id is required" }, 400);
    }
    if (current && new TextEncoder().encode(JSON.stringify(current)).byteLength > MAX_CURRENT_BYTES) {
      return jsonResponse(req, { error: "Current project data is too large" }, 413);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!apiKey || !supabaseUrl || !serviceRoleKey) {
      console.error("[ai-builder] required server configuration is missing");
      return jsonResponse(req, { error: "AI Builder is temporarily unavailable" }, 503);
    }

    userId = auth.user.id;
    requestId = body.request_id;
    billing = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: reservation, error: reservationError } = await billing.rpc("reserve_ai_usage", {
      p_user_id: userId,
      p_request_id: requestId,
      p_tool_name: "builder",
      p_action_class: "pro",
      p_token_cost: AI_BUILDER_COST,
      p_free_limit: 0,
      p_allow_free_fallback: false,
      p_description: "AI Builder site generation",
      p_metadata: { mode: refine ? "refine" : "generate" },
    });
    if (reservationError || !reservation?.ok) {
      const reason = reservation?.error || "billing_unavailable";
      const status = reason === "insufficient_balance" ? 402 : reason === "rate_limited" ? 429 : 409;
      return jsonResponse(req, { error: reason, balance: reservation?.balance, required: reservation?.required }, status);
    }
    reservationStarted = true;

    const systemPrompt = `You are VxOS Site Generator — an expert at producing valid builder_data JSON for the VOLYNX site builder.

${SCHEMA_REFERENCE}

Your only job is to output a single valid JSON object that matches the schema above. Nothing else.`;

    let userMessage: string;
    if (refine && current) {
      userMessage = `Refine this existing site based on the new description. Keep the section structure where possible, but update content to match.

Current site JSON:
${JSON.stringify(current, null, 2)}

New description:
${description}

Output the updated builder_data JSON only.`;
    } else {
      userMessage = `Generate a builder_data JSON for the following site:

${description}

Output the builder_data JSON only.`;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = (err as { error?: { message?: string } })?.error?.message || `Claude API error ${res.status}`;
      throw new Error(message);
    }

    const data = await res.json();
    const rawText: string = (data as { content?: Array<{ text?: string }> }).content?.[0]?.text || "";

    // Strip any accidental markdown code fences
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let builderData: unknown;
    try {
      builderData = JSON.parse(cleaned);
    } catch {
      console.error("[ai-builder] provider returned invalid JSON");
      throw new Error("invalid_provider_response");
    }

    const { error: completeError } = await billing.rpc("complete_ai_usage", {
      p_user_id: userId,
      p_request_id: requestId,
      p_success: true,
    });
    if (completeError) {
      console.error("[ai-builder] could not finalize usage", completeError.message);
      throw new Error("billing_finalize_failed");
    }

    return jsonResponse(req, { builderData, balance: reservation.balance, spent: reservation.spent });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "server_error";
    console.error("[ai-builder] error", message);
    if (reservationStarted && billing && userId && requestId) {
      const { error: refundError } = await billing.rpc("complete_ai_usage", {
        p_user_id: userId,
        p_request_id: requestId,
        p_success: false,
        p_failure_reason: message,
      });
      if (refundError) console.error("[ai-builder] automatic refund failed", refundError.message);
    }
    const status = message === "request_too_large" ? 413 : message === "invalid_request" ? 400 : 503;
    return jsonResponse(req, { error: "AI Builder could not complete this request. No VX was kept for a failed request." }, status);
  }
});
