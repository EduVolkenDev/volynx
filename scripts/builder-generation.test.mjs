import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { transformSync } from "esbuild";
import { finalizeGeneratedProject } from "../src/lib/builder/generated-project.ts";

const presets = JSON.parse(readFileSync("public/builder/presets.json", "utf8")).presets;
const preview = { window: {} };
runInNewContext(readFileSync("public/builder/vx-renderer.js", "utf8"), preview);
const clone = value => JSON.parse(JSON.stringify(value));

test("all presets and filtered layouts have unique anchors and reachable internal CTAs", () => {
  for (const preset of presets) {
    for (const filtered of [false, true]) {
      const data = clone(preset.data);
      if (filtered) data.sections = data.sections.filter(s => ["hero", "valueGrid", "workflow", "cta"].includes(s.type));
      finalizeGeneratedProject(data, preset.id);
      const html = preview.window.VxRenderer.renderPage(data);
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
      assert.equal(ids.length, new Set(ids).size, preset.id);
      assert.equal(ids.length, data.sections.length, preset.id);
      for (const match of html.matchAll(/href="#([^"]+)"/g)) {
        assert.ok(ids.includes(match[1]), `${preset.id}: missing ${match[1]}`);
      }
      assert.doesNotMatch(html, /href="\/(?:products|pricing)\//);
    }
  }
});

test("explicit primary destinations and unrelated custom links remain unchanged", () => {
  for (const href of ["/book/", "mailto:owner@example.invalid", "#custom-contact", "https://example.invalid/book"]) {
    const data = clone(presets.find(p => p.id === "agency").data);
    data.sections[0].content.secondaryCta.href = "/custom-route/";
    finalizeGeneratedProject(data, "agency", href);
    assert.equal(data.sections[0].content.primaryCta.href, href);
    assert.equal(data.sections[0].content.secondaryCta.href, "/custom-route/");
  }
});

test("duplicate section identifiers are made unique without dropping blocks", () => {
  const data = { sections: [
    { type: "hero", id: "intro", content: {} },
    { type: "valueGrid", id: "intro", content: {} },
    { type: "workflow", id: "intro-2", content: {} },
  ] };
  finalizeGeneratedProject(data, "agency");
  assert.equal(new Set(data.sections.map(s => s.id)).size, 3);
});

test("the real wizard generation keeps the supplied description in every preset hero", () => {
  const page = readFileSync("src/pages/builder/index.astro", "utf8");
  const start = page.indexOf("  function buildProjectData()");
  const end = page.indexOf("  function showAuth(", start);
  assert.ok(start > 0 && end > start);
  const code = transformSync(page.slice(start, end), { loader: "ts" }).code;
  for (const id of ["blank", ...presets.map(p => p.id)]) {
    const ctx = {
      selectedPresetId: id, selectedVariants: {}, presets: clone(presets), finalizeGeneratedProject,
      getWizardInputs: () => ({ name: "QA", brand: "QA", tagline: "My own description", tone: "premium", cta: "Contact", ctaHref: "mailto:qa@example.invalid" }),
      getCopySeed: () => ({ title: () => "Generated title", subtitle: "Supporting copy", tagline: () => "Generated tagline", ctaClose: "Contact", ctaLabel: "Contact" }),
      buildMeta: () => ({}), getEnabledSections: () => new Set(["logoCloud", "metrics", "valueGrid", "featureSplit", "pricing", "faq", "workflow", "cta"]),
    };
    runInNewContext(code + "; result = buildProjectData();", ctx);
    const hero = ctx.result.sections.find(s => s.type === "hero");
    assert.equal(hero.content.title, "My own description", id);
    assert.equal(hero.content.primaryCta.href, "mailto:qa@example.invalid", id);
  }
});

test("recovered publisher renders the same anchors and keeps unauthenticated writes blocked", {
  skip: !process.env.VOLYNX_PUBLISHER_SOURCE && "Set VOLYNX_PUBLISHER_SOURCE to the recovered active Worker",
}, async () => {
  const source = readFileSync(process.env.VOLYNX_PUBLISHER_SOURCE, "utf8")
    .replace(/export\s*\{\s*worker_default as default\s*\};/, "");
  const context = { URL, Request, Response, Headers, crypto: globalThis.crypto, fetch };
  runInNewContext(source + "; this.render = renderSite; this.worker = worker_default;", context);
  for (const preset of presets) {
    const data = clone(preset.data);
    data.sections = data.sections.filter(s => ["hero", "valueGrid", "workflow", "cta"].includes(s.type));
    finalizeGeneratedProject(data, preset.id);
    const html = context.render(data, "qa-only");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    for (const match of html.matchAll(/href="#([^"]+)"/g)) {
      assert.ok(ids.includes(match[1]), `${preset.id}: publisher missing ${match[1]}`);
    }
    assert.doesNotMatch(html, /href="\/(?:products|pricing)\//);
  }
  for (const path of ["/publish", "/unpublish"]) {
    const response = await context.worker.fetch(new Request(`https://api.volynx.world${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    }), {});
    assert.equal(response.status, 401, path);
    assert.equal((await response.json()).error, "missing_token", path);
  }
});
