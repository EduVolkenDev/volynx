import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../public/scripts/qrgen-editor.js", import.meta.url), "utf8");
function editor({ storageFails = false, responseFails = false, denied = false } = {}) {
  const values = new Map();
  const fields = new Map();
  const downloads = [];
  const renders = [];
  let requests = 0;
  for (const [id, value] of Object.entries({
    qgExportFormat: "svg", qgExportSize: "4096", qgDotsType: "dots",
    qgCornerStyle: "dot", qgMargin: "0", qgProjectName: "Test QR",
    qgContent: "https://volynx.world/", qgColorMode: "solid",
  })) fields.set(id, { value });
  fields.set("qgMessage", { textContent: "", dataset: {} });
  fields.set("qgExportBtn", {
    textContent: "Export", disabled: false,
    setAttribute() {}, removeAttribute() {},
  });
  values.set("volynx_session", JSON.stringify({ access_token: "test-token", user: { id: "test-user" } }));
  const document = {
    readyState: "loading", addEventListener() {},
    getElementById: (id) => fields.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ click() { downloads.push(this.download); }, remove() {} }),
    body: { appendChild() {} },
  };
  const context = {
    document, console, Blob, URL, AbortSignal, crypto: globalThis.crypto,
    setTimeout: () => 0, clearTimeout() {},
    localStorage: {
      getItem: (key) => values.get(key) || null,
      setItem(key, value) {
        if (storageFails && key === "volynx_qrgen_projects_v1") throw new Error("Quota exceeded");
        values.set(key, value);
      },
    },
    fetch: async (url) => {
      if (url === "/config.json") return { ok: true, json: async () => ({ functionsUrl: "https://example.test/functions/v1" }) };
      requests++;
      await Promise.resolve();
      if (responseFails) throw new Error("Offline");
      if (denied) return { ok: false, json: async () => ({ error: "plan_required", required_plan: "pro" }) };
      return { ok: true, json: async () => ({ ok: true, svg: "<svg/>" }) };
    },
    QRCodeStyling: class {
      constructor(options) { renders.push(options); }
      async getRawData() { return new Blob(["rendered-qr"]); }
    },
  };
  context.window = context;
  vm.runInNewContext(source.replace("window.VxQRGenProduct = {", `window.testEditor = {
    saveProject, applyState, getState, exportFinal, requestPremiumExport,
    setPlan(plan) { currentPlan = plan; },
    setActive(id) { activeProjectId = id; },
  };
  window.VxQRGenProduct = {`), context);
  return { api: context.testEditor, fields, values, downloads, renders, requestCount: () => requests };
}

test("SVG 4096 exports the authorized settings with the preview renderer", async () => {
  const e = editor();
  assert.equal(await e.api.requestPremiumExport(e.api.getState()), true);
  assert.equal(e.renders[0].width, 4096);
  assert.equal(e.renders[0].dotsOptions.type, "dots");
  assert.equal(e.renders[0].cornersSquareOptions.type, "dot");
  assert.equal(e.renders[0].margin, 0);
  assert.equal(e.downloads.length, 1);
});
test("concurrent export clicks make a single authorization request", async () => {
  const e = editor(); e.api.setPlan("pro");
  await Promise.all([e.api.exportFinal(), e.api.exportFinal()]);
  assert.equal(e.requestCount(), 1);
  assert.equal(e.fields.get("qgExportBtn").disabled, false);
  assert.equal(e.fields.get("qgExportBtn").textContent, "Export");
});
test("failed premium requests show feedback, unlock retry and create no download", async () => {
  const e = editor({ responseFails: true }); e.api.setPlan("pro");
  await e.api.exportFinal();
  assert.equal(e.downloads.length, 0);
  assert.match(e.fields.get("qgMessage").textContent, /unavailable/i);
  assert.equal(e.fields.get("qgExportBtn").disabled, false);
});
test("storage failure is reported and a retry does not claim a saved project", () => {
  const e = editor({ storageFails: true });
  e.api.saveProject(); e.api.saveProject();
  assert.match(e.fields.get("qgMessage").textContent, /Could not save/);
  assert.equal(e.values.has("volynx_qrgen_projects_v1"), false);
});
test("a stale active project is saved as a new draft", () => {
  const e = editor(); e.api.setActive("missing-project"); e.api.saveProject();
  const rows = JSON.parse(e.values.get("volynx_qrgen_projects_v1"));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].state.exportFormat, "svg");
  assert.equal(rows[0].state.exportSize, 4096);
});
test("legacy standard PNG states consistently use 1024 pixels", () => {
  const e = editor(); e.fields.get("qgExportFormat").value = "png";
  assert.equal(e.api.getState().exportSize, 1024);
});

test("server authorization denial never starts the premium renderer", async () => {
  const e = editor({ denied: true });
  await e.api.requestPremiumExport(e.api.getState());
  assert.equal(e.downloads.length, 0);
  assert.equal(e.renders.length, 0);
  assert.match(e.fields.get("qgMessage").textContent, /requires QRGen Pro/);
});
for (const size of [1024, 2048, 4096]) {
  test(`premium PNG preserves selected ${size}px resolution`, async () => {
    const e = editor();
    e.fields.get("qgExportFormat").value = "png-hd";
    e.fields.get("qgExportSize").value = String(size);
    await e.api.requestPremiumExport(e.api.getState());
    assert.equal(e.renders[0].width, size);
    assert.equal(e.renders[0].height, size);
    assert.equal(e.renders[0].type, "canvas");
    assert.equal(e.downloads.length, 1);
  });
}
