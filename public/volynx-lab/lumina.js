const input = document.querySelector("#luminaInput");
const output = document.querySelector("#luminaOutput");
const mode = document.querySelector("#luminaMode");
const language = document.querySelector("#luminaLanguage");
const status = document.querySelector("#luminaStatus");
const counter = document.querySelector("#luminaFreeCounter");
const actions = Array.from(document.querySelectorAll("[data-mode]"));
const examples = Array.from(document.querySelectorAll("[data-example]"));
const copyBtn = document.querySelector("#luminaCopyBtn");
const exportBtn = document.querySelector("#luminaExportBtn");
const historyList = document.querySelector("#luminaHistoryList");

const FREE_LIMIT = 5;
const storageKey = "vx_lumina_free_uses";
const historyKey = "vx_lumina_history_v1";
const maxHistoryItems = 8;
let lastSections = [];
let lastPlainText = "";

function tr(key, fallback) {
  return window.VxI18n?.t?.(key, fallback) ?? fallback;
}

const exampleInputs = {
  paper: {
    mode: "deep",
    text: "Um estudo recente compara modelos de linguagem em tarefas educacionais. A hipótese é que explicações adaptadas ao nível do aluno aumentam retenção, mas o artigo também alerta para riscos de alucinação e dependência excessiva. Explique a tese, os limites e como isso poderia ser usado em uma escola.",
  },
  tech: {
    mode: "clear",
    text: "Edge functions permitem executar lógica perto do usuário, reduzindo latência e centralizando integrações sensíveis. Porém, precisam de autenticação clara, observabilidade e mensagens de erro compreensíveis para não parecerem uma caixa-preta quando algo falha.",
  },
  strategy: {
    mode: "practical",
    text: "Quero transformar o Lab em um chamariz premium. As ferramentas gratuitas precisam entregar valor real, mas o Pro deve parecer uma evolução natural: histórico, presets, exports, mais capacidade e menos fricção para quem trabalha em produção.",
  },
};

function getUses() {
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem(storageKey) || "";
  if (/^\d+$/.test(raw)) return Number.parseInt(raw, 10) || 0;
  try {
    const data = JSON.parse(raw || "{}");
    return data.date === today ? Number(data.used || 0) : 0;
  } catch (_) {
    return 0;
  }
}

function setUses(value) {
  localStorage.setItem(storageKey, JSON.stringify({ date: new Date().toISOString().slice(0, 10), used: value }));
  updateCounter();
}

function updateCounter() {
  if (!counter) return;
  if (hasPaidPlan()) {
    counter.textContent = tr("lumina.runtime.pro_usage", "Pro: expanded usage");
    return;
  }
  const remaining = Math.max(0, FREE_LIMIT - getUses());
  counter.textContent = tr("lumina.runtime.free_usage", "Free: {remaining}/{limit} uses")
    .replace("{remaining}", remaining)
    .replace("{limit}", FREE_LIMIT);
}

function selectHasValue(select, value) {
  return Boolean(select && Array.from(select.options).some((option) => option.value === value));
}

function hasPaidPlan() {
  try {
    const cached = window.VxPlan?.getCachedRelaxed?.() || window.VxPlan?.getCached?.();
    return window.VxPlan?.isPaid?.(cached?.plan) === true;
  } catch (_) {
    return false;
  }
}

function setStatus(text, state = "ready") {
  if (status) {
    status.textContent = text;
    status.dataset.state = state;
  }
  window.VxLab?.setStatus?.("lumina", state, text);
}

function readHistory() {
  try {
    const rows = JSON.parse(localStorage.getItem(historyKey) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch (_) {
    return [];
  }
}

function writeHistory(rows) {
  try {
    localStorage.setItem(historyKey, JSON.stringify(rows.slice(0, maxHistoryItems)));
  } catch (_) {}
}

function applyLuminaPreset(values = {}) {
  if (values.mode && selectHasValue(mode, values.mode)) {
    mode.value = values.mode;
    mode.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (values.language && selectHasValue(language, values.language)) {
    language.value = values.language;
    language.dispatchEvent(new Event("change", { bubbles: true }));
  }
  setStatus(tr("lumina.runtime.preset_applied", "Preset applied"), "ok");
}

if (window.VxLab?.renderToolPresets) {
  VxLab.renderToolPresets("lumina", {
    anchor: ".lumina-controls",
    apply: applyLuminaPreset,
    emptyText: tr("lumina.runtime.preset_empty", "Use Lumina once and your mode preset will appear here."),
  });
}
window.VxLab?.restorePresetFromUrl?.("lumina", applyLuminaPreset, {
  onMissing: () => setStatus(tr("lumina.runtime.preset_missing", "Lumina preset not found in this browser."), "warn"),
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function localizeTitle(title) {
  const selectedLanguage = language.value || "pt";
  const titles = {
    pt: {
      "Title": "Título",
      "Essential summary": "Resumo essencial",
      "Simple explanation": "Explicação simples",
      "Important concepts": "Conceitos importantes",
      "Why this matters": "Por que isso importa",
      "Practical applications": "Aplicações práticas",
      "Limitations or cautions": "Limitações ou cuidados",
      "Questions to keep learning": "Perguntas para continuar aprendendo",
      "Lumina response": "Resposta do Lumina",
      "Resposta Lumina": "Resposta do Lumina",
    },
    es: {
      "Title": "Título",
      "Essential summary": "Resumen esencial",
      "Simple explanation": "Explicación simple",
      "Important concepts": "Conceptos importantes",
      "Why this matters": "Por qué importa",
      "Practical applications": "Aplicaciones prácticas",
      "Limitations or cautions": "Limitaciones o cuidados",
      "Questions to keep learning": "Preguntas para seguir aprendiendo",
      "Lumina response": "Respuesta de Lumina",
      "Resposta Lumina": "Respuesta de Lumina",
    },
    en: {},
  };
  return titles[selectedLanguage]?.[title] || title;
}

async function copyText(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  try {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "readonly");
    helper.style.position = "fixed";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();
    const ok = document.execCommand("copy");
    helper.remove();
    return ok;
  } catch (_) {
    return false;
  }
}

function renderCards(sections) {
  output.innerHTML = sections.map((section, index) => `
    <article class="lumina-output-card">
      <div class="lumina-output-card__head">
        <span>${escapeHtml(localizeTitle(section.title))}</span>
        <button type="button" data-copy-section="${index}">${escapeHtml(tr("lumina.runtime.copy_block", "Copy section"))}</button>
      </div>
      <p>${escapeHtml(section.body)}</p>
    </article>
  `).join("");
  lastSections = sections;
  lastPlainText = sections.map((section) => `${localizeTitle(section.title)}\n${section.body}`).join("\n\n");
  if (copyBtn) copyBtn.disabled = !lastPlainText;
  if (exportBtn) exportBtn.disabled = !lastPlainText;
}

function renderHistory() {
  if (!historyList) return;
  const rows = readHistory();
  if (!rows.length) {
    historyList.innerHTML = `<p class="lumina-history__empty">${escapeHtml(tr("lumina.runtime.history_empty", "No responses have been saved in this browser yet."))}</p>`;
    return;
  }
  historyList.innerHTML = rows.map((row) => {
    const date = row.ts ? new Date(row.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    return `
      <button type="button" class="lumina-history__item" data-history-id="${escapeHtml(row.id)}">
        <span>${escapeHtml(row.mode || "Lumina")} · ${escapeHtml(row.language || "pt")} · ${escapeHtml(row.source || "local")}</span>
        <strong>${escapeHtml(row.title || tr("lumina.runtime.response_title", "Lumina response"))}</strong>
        <em>${escapeHtml(date)}</em>
      </button>
    `;
  }).join("");
}

function saveLuminaHistory(source, sections, selectedMode, selectedLanguage, originalInput) {
  const rows = readHistory();
  const first = sections.find((section) => section.title === "Title") || sections[0];
  const title = first?.body || first?.title || tr("lumina.runtime.response_title", "Lumina response");
  const row = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    title: title.slice(0, 90),
    source,
    mode: selectedMode,
    language: selectedLanguage,
    input: originalInput || "",
    sections,
    ts: new Date().toISOString(),
  };
  rows.unshift(row);
  writeHistory(rows);
  window.VxLab?.syncArtifact?.("lumina-response", row);
  renderHistory();
  return row;
}

function applyLuminaHistory(row) {
  if (!row) return false;
  if (row.mode && selectHasValue(mode, row.mode)) mode.value = row.mode;
  if (row.language && selectHasValue(language, row.language)) language.value = row.language;
  if (row.input) input.value = row.input;
  renderCards(row.sections || []);
  setStatus(row.source === "ai"
    ? tr("lumina.runtime.ai_history_restored", "AI history restored")
    : tr("lumina.runtime.local_history_restored", "Local history restored"), "ok");
  return true;
}

function restoreLuminaHistoryFromUrl() {
  let historyId = "";
  try {
    historyId = new URLSearchParams(window.location.search).get("history") || "";
  } catch (_) {}
  if (!historyId) return false;

  const row = readHistory().find((item) => item?.id === historyId);
  window.VxLab?.clearQueryParam?.("history");
  if (!row) {
    setStatus(tr("lumina.runtime.history_missing", "Lumina response not found in this browser."), "warn");
    return false;
  }
  return applyLuminaHistory(row);
}

function parseSections(text) {
  const labels = [
    "Title",
    "Essential summary",
    "Simple explanation",
    "Important concepts",
    "Why this matters",
    "Practical applications",
    "Limitations or cautions",
    "Questions to keep learning",
  ];
  const sections = [];

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const nextLabel = labels[index + 1];
    const start = text.search(new RegExp(`(^|\\n)${label}:`, "i"));
    if (start === -1) continue;

    const contentStart = text.slice(start).indexOf(":") + start + 1;
    const next = nextLabel ? text.search(new RegExp(`\\n${nextLabel}:`, "i")) : -1;
    const body = text.slice(contentStart, next > start ? next : undefined).trim();
    if (body) sections.push({ title: label, body });
  }

  if (sections.length) return sections;
  return [{ title: "Lumina response", body: text.trim() }];
}

function localLumina(text, selectedMode, selectedLanguage) {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  const firstSentences = sentences.slice(0, 3).join(" ").trim() || clean.slice(0, 420);
  const words = clean.toLowerCase().match(/[a-zÀ-ÿ0-9]{5,}/g) || [];
  const concepts = Array.from(new Set(words.filter((word) => !["sobre", "porque", "quando", "their", "there", "would", "could", "para", "como", "with", "from"].includes(word)))).slice(0, 8);
  const locale = ["pt", "en", "es"].includes(selectedLanguage) ? selectedLanguage : "pt";
  const copy = {
    pt: {
      modeHints: {
        clear: "A ideia central foi simplificada para uma primeira leitura.",
        deep: "A análise preserva os detalhes técnicos e organiza premissas, evidências e consequências.",
        practical: "O próximo passo é transformar o conteúdo em uma decisão, projeto, estudo ou experimento.",
        multilingual: "Use esta base para adaptar o conteúdo em português, inglês e espanhol sem perder precisão.",
        creator: "Este conteúdo pode se transformar em aula, publicação educativa, roteiro, página explicativa ou material de apoio.",
      },
      draft: "Rascunho local do Lumina",
      explanation: "Em termos simples, o texto apresenta uma ideia que deve ser compreendida por seu tema principal, pelos conceitos utilizados e pelo impacto que pode gerar.",
      concepts: "Tema principal, contexto, aplicação e limitações.",
      matters: "O tema importa porque o conhecimento complexo só se torna útil quando pode ser entendido, compartilhado e aplicado com responsabilidade.",
      applications: "Crie um resumo de estudo, prepare uma aula, transforme o conteúdo em um guia prático, formule perguntas de pesquisa ou adapte-o para comunicação pública.",
      cautions: "Este modo local não verifica links, PDFs nem fontes externas. Para uma análise completa em português, use o modo de IA do Lumina.",
      questions: "Qual é a tese principal? Quais termos precisam de definição? Que evidências sustentam a ideia? Onde isso pode ser aplicado agora?",
    },
    en: {
      modeHints: {
        clear: "The central idea has been simplified for an initial reading.",
        deep: "The analysis preserves technical detail while organizing assumptions, evidence and consequences.",
        practical: "The next step is to turn the content into a decision, project, study or experiment.",
        multilingual: "Use this foundation to adapt the content into Portuguese, English and Spanish without losing precision.",
        creator: "This content can become a lesson, educational post, script, explanatory page or supporting material.",
      },
      draft: "Lumina local draft",
      explanation: "In simple terms, the text presents an idea that should be understood through its main theme, the concepts it uses and the impact it may create.",
      concepts: "Main theme, context, application and limitations.",
      matters: "This matters because complex knowledge becomes useful only when it can be understood, shared and applied responsibly.",
      applications: "Create a study summary, prepare a lesson, turn the content into a practical guide, formulate research questions or adapt it for public communication.",
      cautions: "This local mode does not verify links, PDFs or external sources. For a complete analysis in English, use Lumina's AI mode.",
      questions: "What is the main thesis? Which terms need a definition? What evidence supports the idea? Where can it be applied now?",
    },
    es: {
      modeHints: {
        clear: "La idea central se ha simplificado para una primera lectura.",
        deep: "El análisis conserva los detalles técnicos y organiza premisas, evidencias y consecuencias.",
        practical: "El siguiente paso es convertir el contenido en una decisión, proyecto, estudio o experimento.",
        multilingual: "Utiliza esta base para adaptar el contenido al portugués, inglés y español sin perder precisión.",
        creator: "Este contenido puede convertirse en una clase, publicación educativa, guion, página explicativa o material de apoyo.",
      },
      draft: "Borrador local de Lumina",
      explanation: "En términos sencillos, el texto presenta una idea que debe comprenderse a través de su tema principal, los conceptos utilizados y el impacto que puede generar.",
      concepts: "Tema principal, contexto, aplicación y limitaciones.",
      matters: "El tema importa porque el conocimiento complejo solo se vuelve útil cuando puede comprenderse, compartirse y aplicarse de forma responsable.",
      applications: "Crea un resumen de estudio, prepara una clase, convierte el contenido en una guía práctica, formula preguntas de investigación o adáptalo para la comunicación pública.",
      cautions: "Este modo local no verifica enlaces, archivos PDF ni fuentes externas. Para un análisis completo en español, utiliza el modo de IA de Lumina.",
      questions: "¿Cuál es la tesis principal? ¿Qué términos necesitan definición? ¿Qué evidencias respaldan la idea? ¿Dónde puede aplicarse ahora?",
    },
  }[locale];
  const modeHint = copy.modeHints[selectedMode] || copy.modeHints.clear;

  return [
    { title: "Title", body: copy.draft },
    { title: "Essential summary", body: firstSentences },
    { title: "Simple explanation", body: `${modeHint} ${copy.explanation}` },
    { title: "Important concepts", body: concepts.length ? concepts.join(", ") : copy.concepts },
    { title: "Why this matters", body: copy.matters },
    { title: "Practical applications", body: copy.applications },
    { title: "Limitations or cautions", body: copy.cautions },
    { title: "Questions to keep learning", body: copy.questions },
  ];
}

async function getConfig() {
  const response = await fetch("/config.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Config unavailable");
  return response.json();
}

async function callLuminaAi(text, selectedMode, selectedLanguage) {
  const cfg = await getConfig();
  const functionsUrl = String(cfg.functionsUrl || `${String(cfg.supabaseUrl || "").replace(/\/$/, "")}/functions/v1`).replace(/\/$/, "");
  if (!functionsUrl || functionsUrl === "/functions/v1") throw new Error("Functions URL unavailable");
  const token = localStorage.getItem("volynx_access_token") || "";
  if (!token) throw new Error("Sign in to use Lumina AI; local mode is ready");

  const response = await fetch(`${functionsUrl}/ai-tools`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      tool: "lumina",
      lite: !hasPaidPlan() && getUses() >= FREE_LIMIT,
      input: {
        text,
        mode: selectedMode,
        language: selectedLanguage,
      },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error || !data.result) {
    throw new Error(data.error || "Lumina AI unavailable");
  }
  return parseSections(data.result);
}

async function runLumina(nextMode) {
  const text = input.value.trim();
  if (!text) {
    input.focus();
    setStatus(tr("lumina.runtime.enter_content", "Enter some content"));
    return;
  }

  if (nextMode) mode.value = nextMode;
  const selectedMode = mode.value;
  const selectedLanguage = language.value;

  if (!hasPaidPlan() && getUses() >= FREE_LIMIT && window.VxLab && !VxLab.hasAccessToken()) {
    VxLab.track?.("lumina", "blocked_by_plan", { limit: FREE_LIMIT, mode: selectedMode, language: selectedLanguage });
    VxLab.confirmLogin(
      VxLab.currentReturnPath(),
      "Sign in to continue using Lumina. You will return to this workspace after login."
    );
    return;
  }

  actions.forEach((button) => { button.disabled = true; });
  setStatus(tr("lumina.runtime.processing", "Illuminating with AI..."), "loading");
  window.VxLab?.track?.("lumina", "process_started", { mode: selectedMode, language: selectedLanguage });
  output.dataset.loading = "true";

  try {
    const sections = await callLuminaAi(text, selectedMode, selectedLanguage);
    if (!hasPaidPlan()) setUses(getUses() + 1);
    renderCards(sections);
    saveLuminaHistory("ai", sections, selectedMode, selectedLanguage, text);
    setStatus(tr("lumina.runtime.ai_active", "AI active"), "ok");
    if (window.VxLab) {
      VxLab.recordEvent("lumina", "ai", `${selectedMode} · ${selectedLanguage}`);
      VxLab.savePreset("lumina", { mode: selectedMode, language: selectedLanguage });
    }
  } catch (error) {
    const sections = localLumina(text, selectedMode, selectedLanguage);
    renderCards(sections);
    saveLuminaHistory("fallback", sections, selectedMode, selectedLanguage, text);
    setStatus(error?.message
      ? tr("lumina.runtime.local_fallback_error", "Local fallback: {error}").replace("{error}", error.message)
      : tr("lumina.runtime.local_fallback", "Local fallback"), "fallback");
    if (window.VxLab) {
      VxLab.recordEvent("lumina", "fallback", `${selectedMode} · ${selectedLanguage}`);
      VxLab.track("lumina", "error", { message: error?.message || "Lumina AI unavailable" });
      VxLab.savePreset("lumina", { mode: selectedMode, language: selectedLanguage });
    }
  } finally {
    actions.forEach((button) => { button.disabled = false; });
    delete output.dataset.loading;
  }
}

actions.forEach((button) => {
  button.addEventListener("click", () => runLumina(button.dataset.mode));
});

examples.forEach((button) => {
  button.addEventListener("click", () => {
    const example = exampleInputs[button.dataset.example];
    if (!example) return;
    input.value = example.text;
    mode.value = example.mode;
    input.focus();
    setStatus(tr("lumina.runtime.example_loaded", "Example loaded"), "ready");
    if (window.VxLab) VxLab.track("lumina", "example_loaded", { example: button.dataset.example });
  });
});

copyBtn?.addEventListener("click", async () => {
  if (!lastPlainText) return;
  const ok = await copyText(lastPlainText);
  setStatus(ok
    ? tr("lumina.runtime.response_copied", "Response copied")
    : tr("lumina.runtime.clipboard_blocked", "Clipboard access was blocked by the browser"), ok ? "ok" : "warn");
  if (ok && window.VxLab) {
    VxLab.recordEvent("lumina", "copy", "Response copied");
  }
});

output?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy-section]");
  if (!button) return;
  const index = Number(button.dataset.copySection);
  const section = lastSections[index];
  if (!section) return;
  const ok = await copyText(`${localizeTitle(section.title)}\n${section.body}`);
  setStatus(ok
    ? tr("lumina.runtime.block_copied", "Section copied")
    : tr("lumina.runtime.clipboard_blocked", "Clipboard access was blocked by the browser"), ok ? "ok" : "warn");
  if (ok && window.VxLab) {
    VxLab.recordEvent("lumina", "copy_block", localizeTitle(section.title));
  }
});

exportBtn?.addEventListener("click", () => {
  if (!lastPlainText) return;
  const blob = new Blob([lastPlainText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "volynx-lumina-response.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
  setStatus(tr("lumina.runtime.response_exported", "Response exported"), "ok");
  if (window.VxLab) {
    VxLab.recordEvent("lumina", "export", "TXT exported");
    VxLab.notifySuccess?.({ kind: "export", tool: "lumina", event: "lumina_export_success" });
  }
});

historyList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-history-id]");
  if (!button) return;
  const row = readHistory().find((item) => item.id === button.dataset.historyId);
  if (!row) return;
  applyLuminaHistory(row);
  if (window.VxLab) VxLab.recordEvent("lumina", "history_open", row.title || "Response opened");
});

updateCounter();
renderHistory();
restoreLuminaHistoryFromUrl();
window.addEventListener("vx:plan-ready", updateCounter);
window.addEventListener("vx:lang-changed", () => {
  updateCounter();
  renderHistory();
  if (lastSections.length) renderCards(lastSections);
});
window.VxLab?.track?.("lumina", "tool_open", { surface: "lumina" });
