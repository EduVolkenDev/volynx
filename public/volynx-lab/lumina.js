const input = document.querySelector("#luminaInput");
const output = document.querySelector("#luminaOutput");
const mode = document.querySelector("#luminaMode");
const language = document.querySelector("#luminaLanguage");
const status = document.querySelector("#luminaStatus");
const counter = document.querySelector("#luminaFreeCounter");
const actions = Array.from(document.querySelectorAll("[data-mode]"));

const FREE_LIMIT = 5;
const storageKey = "vx_lumina_free_uses";

function getUses() {
  return Number.parseInt(localStorage.getItem(storageKey) || "0", 10) || 0;
}

function setUses(value) {
  localStorage.setItem(storageKey, String(value));
  updateCounter();
}

function updateCounter() {
  const remaining = Math.max(0, FREE_LIMIT - getUses());
  counter.textContent = `Free: ${remaining} usos`;
}

function setStatus(text) {
  status.textContent = text;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCards(sections) {
  output.innerHTML = sections.map((section) => `
    <article class="lumina-output-card">
      <span>${escapeHtml(localizeTitle(section.title))}</span>
      <p>${escapeHtml(section.body)}</p>
    </article>
  `).join("");
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
      "Why this matters": "Por qué importa",
      "Practical applications": "Aplicaciones prácticas",
      "Limitations or cautions": "Limitaciones o cuidados",
      "Questions to keep learning": "Preguntas para seguir aprendiendo",
      "Resposta Lumina": "Respuesta Lumina",
    },
    en: {},
  };
  return titles[selectedLanguage]?.[title] || title;
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
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tool: "lumina",
      lite: getUses() >= FREE_LIMIT,
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

  actions.forEach((button) => { button.disabled = true; });
  setStatus("Iluminando...");

  try {
    const sections = await callLuminaAi(text, selectedMode, selectedLanguage);
    setUses(getUses() + 1);
    renderCards(sections);
    setStatus("IA ativa");
  } catch (error) {
    renderCards(localLumina(text, selectedMode, selectedLanguage));
    setStatus("Fallback local");
  } finally {
    actions.forEach((button) => { button.disabled = false; });
  }
}

actions.forEach((button) => {
  button.addEventListener("click", () => runLumina(button.dataset.mode));
});

updateCounter();
