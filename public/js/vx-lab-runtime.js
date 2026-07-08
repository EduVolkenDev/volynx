(function () {
  const MANIFEST_URL = "/lab-assets.json";
  let manifestPromise = null;

  function currentLang() {
    try {
      if (window.VxI18n && typeof window.VxI18n.getLang === "function") return window.VxI18n.getLang();
      return String(localStorage.getItem("volynx_lang") || "en").toLowerCase().startsWith("pt") ? "pt" : "en";
    } catch (_) {
      return "en";
    }
  }

  function text(key, fallback, replacements) {
    let value = fallback;
    if (window.VxI18n && typeof window.VxI18n.t === "function") {
      value = window.VxI18n.t(key, fallback, currentLang());
    } else if (window.VX_TRANS) {
      const dict = window.VX_TRANS[currentLang()] || window.VX_TRANS.en || {};
      value = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : fallback;
    }

    return String(value).replace(/\{(\w+)\}/g, (_, token) => {
      return replacements && Object.prototype.hasOwnProperty.call(replacements, token) ? replacements[token] : `{${token}}`;
    });
  }

  function collectAssets(value, out) {
    if (!value || typeof value !== "object") return out;
    if (typeof value.url === "string") out.push(value);
    Object.keys(value).forEach((key) => collectAssets(value[key], out));
    return out;
  }

  function loadManifest(options) {
    const shouldRefresh = options && options.refresh;
    if (!manifestPromise || shouldRefresh) {
      manifestPromise = fetch(MANIFEST_URL, { cache: "no-store" }).then((res) => {
        if (!res.ok) throw new Error(`Lab manifest ${res.status}`);
        return res.json();
      });
    }
    return manifestPromise;
  }

  function summarize(manifest) {
    const assets = collectAssets(manifest, []);
    const localAssets = assets.filter((asset) => String(asset.url || "").startsWith("/"));
    const allLocal = assets.length > 0 && localAssets.length === assets.length;
    const aiReady = Boolean(manifest.imageSuite?.aiUpscale?.local && manifest.imageSuite?.backgroundRemoval?.localRuntime);
    const exportReady = Boolean(manifest.converter?.zip?.local && manifest.converter?.heic?.local && manifest.qrGen?.renderer?.local);

    return {
      allLocal,
      assets,
      localAssets,
      assetCount: localAssets.length,
      aiReady,
      exportReady,
      manifest,
    };
  }

  function toolStatus(summary, tool) {
    const manifest = summary.manifest;
    const statuses = {
      converter: Boolean(manifest.converter?.zip?.local && manifest.converter?.heic?.local),
      imageScaler: Boolean(manifest.imageScaler?.zip?.local),
      imageSuite: Boolean(manifest.imageSuite?.zip?.local && summary.aiReady && manifest.imageSuite?.backgroundRemoval?.localModel),
      qrGen: Boolean(manifest.qrGen?.renderer?.local),
    };
    return Object.prototype.hasOwnProperty.call(statuses, tool) ? statuses[tool] : summary.allLocal;
  }

  function setText(root, selector, value) {
    const node = root.querySelector(selector);
    if (node) node.textContent = value;
  }

  function setBadge(root, state, label) {
    const badge = root.querySelector("[data-lab-runtime-badge]");
    if (!badge) return;
    badge.dataset.state = state;
    badge.removeAttribute("data-i18n");
    badge.textContent = label;
  }

  function renderPanel(root, summary) {
    setBadge(
      root,
      summary.allLocal ? "ready" : "partial",
      summary.allLocal ? text("lab2.runtime_ready", "Local") : text("lab2.runtime_partial", "Mostly local")
    );
    setText(root, "[data-lab-runtime-count]", text("lab2.runtime_count", "{count} assets", { count: summary.assetCount }));
    setText(root, "[data-lab-runtime-ai]", summary.aiReady ? text("lab2.runtime_ai_ready", "Ready") : text("lab2.runtime_partial", "Mostly local"));
    setText(root, "[data-lab-runtime-export]", summary.exportReady ? text("lab2.runtime_export_ready", "Ready") : text("lab2.runtime_partial", "Mostly local"));
    root.dataset.labRuntimeReady = "1";
  }

  function renderUnavailable(root) {
    setBadge(root, "warning", text("lab2.runtime_unavailable", "Check needed"));
    setText(root, "[data-lab-runtime-count]", "--");
    setText(root, "[data-lab-runtime-ai]", text("lab2.runtime_unavailable", "Check needed"));
    setText(root, "[data-lab-runtime-export]", text("lab2.runtime_unavailable", "Check needed"));
    root.dataset.labRuntimeReady = "0";
  }

  function miniLabel(tool) {
    const labels = {
      converter: text("lab2.runtime_mini_converter", "Local converter"),
      imageScaler: text("lab2.runtime_mini_scaler", "Local scaler"),
      imageSuite: text("lab2.runtime_mini_suite", "Local AI stack"),
      qrGen: text("lab2.runtime_mini_qr", "Local QR renderer"),
    };
    return labels[tool] || text("lab2.runtime_mini_default", "Local runtime");
  }

  function renderMini(root, summary) {
    const tool = root.dataset.labRuntimeTool || "";
    const ready = toolStatus(summary, tool);
    root.dataset.state = ready ? "ready" : "partial";
    root.dataset.labRuntimeReady = ready ? "1" : "0";
    setText(root, "[data-lab-runtime-mini-label]", miniLabel(tool));
    setText(
      root,
      "[data-lab-runtime-mini-state]",
      ready ? text("lab2.runtime_mini_ready", "Ready") : text("lab2.runtime_partial", "Mostly local")
    );
  }

  function renderMiniUnavailable(root) {
    root.dataset.state = "warning";
    root.dataset.labRuntimeReady = "0";
    setText(root, "[data-lab-runtime-mini-state]", text("lab2.runtime_unavailable", "Check needed"));
  }

  function mountPanel(root) {
    if (!root) return Promise.resolve(null);
    return loadManifest()
      .then((manifest) => {
        const summary = summarize(manifest);
        root.__vxLabRuntimeSummary = summary;
        renderPanel(root, summary);
        return summary;
      })
      .catch((error) => {
        root.__vxLabRuntimeError = error;
        renderUnavailable(root);
        return null;
      });
  }

  function mountMini(root) {
    if (!root) return Promise.resolve(null);
    return loadManifest()
      .then((manifest) => {
        const summary = summarize(manifest);
        root.__vxLabRuntimeSummary = summary;
        renderMini(root, summary);
        return summary;
      })
      .catch((error) => {
        root.__vxLabRuntimeError = error;
        renderMiniUnavailable(root);
        return null;
      });
  }

  function mountAll() {
    return Promise.all([
      ...Array.from(document.querySelectorAll("[data-lab-runtime]")).map((root) => mountPanel(root)),
      ...Array.from(document.querySelectorAll("[data-lab-runtime-mini]")).map((root) => mountMini(root)),
    ]);
  }

  window.VxLabRuntime = {
    collectAssets: (value) => collectAssets(value, []),
    loadManifest,
    mountAll,
    mountMini,
    mountPanel,
    summarize,
    toolStatus,
  };

  window.addEventListener("vx:lang-changed", () => {
    document.querySelectorAll("[data-lab-runtime]").forEach((root) => {
      if (root.__vxLabRuntimeSummary) renderPanel(root, root.__vxLabRuntimeSummary);
      else if (root.__vxLabRuntimeError) renderUnavailable(root);
    });
    document.querySelectorAll("[data-lab-runtime-mini]").forEach((root) => {
      if (root.__vxLabRuntimeSummary) renderMini(root, root.__vxLabRuntimeSummary);
      else if (root.__vxLabRuntimeError) renderMiniUnavailable(root);
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll, { once: true });
  } else {
    mountAll();
  }
})();
