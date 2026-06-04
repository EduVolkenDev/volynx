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
    counter.textContent = "Pro: uso expandido";
    return;
  }
  const remaining = Math.max(0, FREE_LIMIT - getUses());
  counter.textContent = `Free: ${remaining}/${FREE_LIMIT} usos`;
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
  setStatus("Preset aplicado", "ok");
}

if (window.VxLab?.renderToolPresets) {
  VxLab.renderToolPresets("lumina", {
    anchor: ".lumina-controls",
    apply: applyLuminaPreset,
    emptyText: "Use Lumina once and your mode preset appears here.",
  });
}

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
      "Resposta Lumina": "Resposta Lumina",
    },
    es: {
      "Title": "Título",
      "Essential summary": "Resumen esencial",
      "Simple explanation": "Explicación simple",
      "Important concepts": "Conceptos importantes",
      "Why this matters": "Por que importa",
      "Practical applications": "Aplicaciones practicas",
      "Limitations or cautions": "Limitaciones o cuidados",
      "Questions to keep learning": "Preguntas para seguir aprendiendo",
      "Resposta Lumina": "Respuesta Lumina",
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
        <button type="button" data-copy-section="${index}">Copiar bloco</button>
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
    historyList.innerHTML = '<p class="lumina-history__empty">Nenhuma resposta salva neste navegador ainda.</p>';
    return;
  }
  historyList.innerHTML = rows.map((row) => {
    const date = row.ts ? new Date(row.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
    return `
      <button type="button" class="lumina-history__item" data-history-id="${escapeHtml(row.id)}">
        <span>${escapeHtml(row.mode || "Lumina")} · ${escapeHtml(row.language || "pt")} · ${escapeHtml(row.source || "local")}</span>
        <strong>${escapeHtml(row.title || "Resposta Lumina")}</strong>
        <em>${escapeHtml(date)}</em>
      </button>
    `;
  }).join("");
}

function saveLuminaHistory(source, sections, selectedMode, selectedLanguage) {
  const rows = readHistory();
  const first = sections.find((section) => section.title === "Title") || sections[0];
  const title = first?.body || first?.title || "Resposta Lumina";
  rows.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    title: title.slice(0, 90),
    source,
    mode: selectedMode,
    language: selectedLanguage,
    sections,
    ts: new Date().toISOString(),
  });
  writeHistory(rows);
  renderHistory();
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
  return [{ title: "Resposta Lumina", body: text.trim() }];
}

function localLumina(text, selectedMode, selectedLanguage) {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  const firstSentences = sentences.slice(0, 3).join(" ").trim() || clean.slice(0, 420);
  const words = clean.toLowerCase().match(/[a-zÀ-ÿ0-9]{5,}/g) || [];
  const concepts = Array.from(new Set(words.filter((word) => !["sobre", "porque", "quando", "their", "there", "would", "could", "para", "como", "with", "from"].includes(word)))).slice(0, 8);
  const modeHint = {
    clear: "A ideia central foi simplificada para leitura inicial.",
    deep: "A leitura precisa manter detalhes técnicos e organizar premissas, evidências e consequências.",
    practical: "O próximo passo é transformar o conteúdo em uma decisão, projeto, estudo ou experimento.",
    multilingual: "Use esta base para adaptar o conteúdo em português, inglês e espanhol sem perder precisão.",
    creator: "Este conteúdo pode virar aula, post educativo, roteiro, página explicativa ou material de apoio.",
  }[selectedMode] || "A ideia central foi simplificada para leitura inicial.";

  const languageName = { pt: "Português", en: "English", es: "Español" }[selectedLanguage] || "Português";

  return [
    { title: "Title", body: "Lumina local draft" },
    { title: "Essential summary", body: firstSentences },
    { title: "Simple explanation", body: `${modeHint} Em termos simples, o texto apresenta uma ideia que precisa ser entendida pelo tema principal, pelos conceitos usados e pelo impacto que pode gerar.` },
    { title: "Important concepts", body: concepts.length ? concepts.join(", ") : "Tema principal, contexto, aplicação, limites." },
    { title: "Why this matters", body: "Importa porque conhecimento complexo só se torna útil quando pode ser entendido, compartilhado e aplicado com responsabilidade." },
    { title: "Practical applications", body: "Criar um resumo de estudo, preparar uma aula, transformar em guia prático, levantar perguntas de pesquisa ou adaptar para comunicação pública." },
    { title: "Limitations or cautions", body: `Este fallback não verifica links, PDFs ou fontes externas. Para uma análise completa em ${languageName}, publique/ative o modo IA da Lumina.` },
    { title: "Questions to keep learning", body: "Qual é a tese principal? Quais termos precisam de definição? Que evidências sustentam a ideia? Onde isso pode ser aplicado agora?" },
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

  const response = await fetch(`${functionsUrl}/ai-tools`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(localStorage.getItem("volynx_access_token") ? { Authorization: `Bearer ${localStorage.getItem("volynx_access_token")}` } : {}),
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
    setStatus("Cole um conteúdo");
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
  setStatus("Iluminando com IA...", "loading");
  window.VxLab?.track?.("lumina", "process_started", { mode: selectedMode, language: selectedLanguage });
  output.dataset.loading = "true";

  try {
    const sections = await callLuminaAi(text, selectedMode, selectedLanguage);
    if (!hasPaidPlan()) setUses(getUses() + 1);
    renderCards(sections);
    saveLuminaHistory("ai", sections, selectedMode, selectedLanguage);
    setStatus("IA ativa", "ok");
    if (window.VxLab) {
      VxLab.recordEvent("lumina", "ai", `${selectedMode} · ${selectedLanguage}`);
      VxLab.savePreset("lumina", { mode: selectedMode, language: selectedLanguage });
    }
  } catch (error) {
    const sections = localLumina(text, selectedMode, selectedLanguage);
    renderCards(sections);
    saveLuminaHistory("fallback", sections, selectedMode, selectedLanguage);
    setStatus(error?.message ? `Fallback local: ${error.message}` : "Fallback local", "fallback");
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
    setStatus("Exemplo carregado", "ready");
    if (window.VxLab) VxLab.track("lumina", "example_loaded", { example: button.dataset.example });
  });
});

copyBtn?.addEventListener("click", async () => {
  if (!lastPlainText) return;
  const ok = await copyText(lastPlainText);
  setStatus(ok ? "Resposta copiada" : "Clipboard bloqueado pelo browser", ok ? "ok" : "warn");
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
  setStatus(ok ? "Bloco copiado" : "Clipboard bloqueado pelo browser", ok ? "ok" : "warn");
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
  setStatus("Resposta exportada", "ok");
  if (window.VxLab) VxLab.recordEvent("lumina", "export", "TXT exported");
});

historyList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-history-id]");
  if (!button) return;
  const row = readHistory().find((item) => item.id === button.dataset.historyId);
  if (!row) return;
  mode.value = row.mode || mode.value;
  language.value = row.language || language.value;
  renderCards(row.sections || []);
  setStatus(row.source === "ai" ? "Histórico IA" : "Histórico local", "ok");
  if (window.VxLab) VxLab.recordEvent("lumina", "history_open", row.title || "Response opened");
});

updateCounter();
renderHistory();
window.addEventListener("vx:plan-ready", updateCounter);
window.VxLab?.track?.("lumina", "tool_open", { surface: "lumina" });
