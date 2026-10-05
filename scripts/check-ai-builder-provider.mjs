import assert from "node:assert/strict";
import { callAiProvider, assertAiProviderConfigured } from "../supabase/functions/_shared/ai-provider.ts";
import { isBuilderData } from "../supabase/functions/_shared/builder-data.ts";

const values = new Map([
  ["ANTHROPIC_API_KEY", "test-anthropic-key"],
  ["OPENAI_API_KEY", "test-openai-key"],
]);
globalThis.Deno = { env: { get: (key) => values.get(key) } };
const originalFetch = globalThis.fetch;
let calls = [];
let providerResponse;
let providerStatus = 200;
globalThis.fetch = async (url, init) => {
  calls.push({ url, init, body: JSON.parse(init.body) });
  return new Response(JSON.stringify(providerResponse), { status: providerStatus, headers: { "Content-Type": "application/json" } });
};

const request = { product: "volynx", capability: "builder", system: "Return JSON", user: "Build a site", maxTokens: 4096 };
const sample = {
  brand: { name: "Example", tagline: "A good site", colors: { primary: "#7dd3fc", bg: "#070a12", fg: "#e7eef7", accent: "#34d399" } },
  sections: [
    { type: "hero", content: { title: "Welcome", primaryCta: { label: "Start", href: "#contact" } } },
    { type: "cta", content: { title: "Get in touch", primaryCta: { label: "Contact", href: "mailto:hello@example.com" } } },
  ],
};

try {
  assert.equal(isBuilderData(sample), true);
  assert.equal(isBuilderData({ ...sample, sections: [{ type: "hero", content: { title: "Hi" } }] }), false);
  assert.equal(isBuilderData({ ...sample, brand: { ...sample.brand, colors: { ...sample.brand.colors, primary: "red;bad" } } }), false);
  assert.equal(isBuilderData({ ...sample, sections: [{ ...sample.sections[0], content: { title: "Hi", primaryCta: { label: "Click", href: "javascript:alert(1)" } } }, sample.sections[1]] }), false);

  providerResponse = { content: [{ type: "text", text: "anthropic result" }] };
  assert.equal(await callAiProvider(request), "anthropic result");
  assert.equal(calls.at(-1).url, "https://api.anthropic.com/v1/messages");

  values.set("AI_PROVIDER_BUILDER", "openai");
  providerResponse = { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(sample) }] }] };
  assert.equal(await callAiProvider(request), JSON.stringify(sample));
  assert.equal(calls.at(-1).url, "https://api.openai.com/v1/responses");
  assert.equal(calls.at(-1).body.model, "gpt-4o-mini");
  assert.equal(calls.at(-1).body.store, false);
  assert.equal(calls.at(-1).body.text.format.type, "json_object");

  providerResponse = { content: [{ type: "text", text: "pdu result" }] };
  assert.equal(await callAiProvider({ ...request, product: "pdu", capability: "lume" }), "pdu result");
  assert.equal(calls.at(-1).url, "https://api.anthropic.com/v1/messages");

  providerResponse = { status: "incomplete", output: [{ type: "message", content: [{ type: "output_text", text: "{}" }] }] };
  await assert.rejects(() => callAiProvider(request), /incomplete response/);

  providerStatus = 429;
  const callCount = calls.length;
  await assert.rejects(() => callAiProvider(request), /error 429/);
  assert.equal(calls.length, callCount + 1, "provider failure must not trigger a second billable generation");
  providerStatus = 200;

  values.delete("OPENAI_API_KEY");
  assert.throws(() => assertAiProviderConfigured(request), /not configured/);
  values.set("AI_PROVIDER_BUILDER", "unknown");
  assert.throws(() => assertAiProviderConfigured(request), /configuration is invalid/);
  console.log("AI Builder provider and renderability checks passed");
} finally {
  globalThis.fetch = originalFetch;
}
