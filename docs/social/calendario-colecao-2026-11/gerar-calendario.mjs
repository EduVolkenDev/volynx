#!/usr/bin/env node
/**
 * Gera o planejamento de postagens da coleção VOLYNX (50 assuntos × PT/EN).
 *
 * Uso:
 *   node gerar-calendario.mjs
 *   node gerar-calendario.mjs --start=2026-11-09 --ready=1,2,3
 *   node gerar-calendario.mjs --ready=all
 *
 * O script não publica nada. Ele valida os arquivos, distribui as datas e
 * escreve calendario.csv, calendario.json e calendario.md nesta pasta.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rest] = arg.slice(2).split("=");
    result[rawKey] = rest.length ? rest.join("=") : "true";
  }
  return result;
}

function expandHome(value) {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function mdCell(value) {
  return (value == null ? "" : String(value))
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

function firstUrl(text) {
  const match = text.match(/https?:\/\/[^\s)\]]+/);
  return match ? match[0].replace(/[.,;:]+$/, "") : "";
}

const WEEKDAY_NAMES = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) throw new Error(`Data inválida: ${value}`);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function weekdayOf(date) {
  return date.getUTCDay();
}

const BLOCKS = [
  { max: 4, label: "01 · Marca e entrada" },
  { max: 10, label: "02 · Ferramentas" },
  { max: 13, label: "03 · Educação e comunidade" },
  { max: 16, label: "04 · Kits" },
  { max: 22, label: "05 · Serviços" },
  { max: 26, label: "06 · Cloud, VX e planos" },
  { max: 29, label: "07 · CVitae" },
  { max: 35, label: "08 · Daily" },
  { max: 38, label: "09 · Lynx, marca pessoal e case" },
  { max: 47, label: "10 · Palavras do Universo" },
  { max: 50, label: "11 · Diário do Universo" },
];

function blockFor(number) {
  return BLOCKS.find((block) => number <= block.max)?.label ?? "12 · Outros";
}

function statusFor(item, ready) {
  if (ready.has(item.number)) {
    return { arte: "pronta", publicacao: "pronto_para_agendar" };
  }
  if (item.priority === "refinar") {
    return { arte: "refino_pendente", publicacao: "aguardando_arte" };
  }
  return { arte: "correcao_pendente", publicacao: "aguardando_arte" };
}

const args = parseArgs(process.argv.slice(2));
const artRoot = path.resolve(
  expandHome(
    args.root ?? path.join("~", "Downloads", "Posts VOLYNX - Português e Inglês")
  )
);
const auditPath = path.resolve(HERE, args.audit ?? "auditoria-artes.json");
const start = args.start ?? "2026-11-16";
const weekdays = new Set(
  (args.weekdays ?? "1,2,3,4,5")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
);
const skipDates = new Set(
  (
    args["skip-dates"] ??
    "2026-12-24,2026-12-25,2026-12-31,2027-01-01"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const feedTime = args["feed-time"] ?? "09:00";
const storyTime = args["story-time"] ?? "12:30";
const enFeedTime = args["en-feed-time"] ?? "18:00";
const timezone = args.tz ?? "America/Sao_Paulo";
const outputDir = path.resolve(HERE, args.out ?? ".");

if (!weekdays.size) throw new Error("Informe ao menos um dia da semana em --weekdays.");

const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
if (!Array.isArray(audit.items) || audit.items.length !== 50) {
  throw new Error(
    `A auditoria deve conter 50 itens; encontrei ${audit.items?.length ?? 0}.`
  );
}

const items = [...audit.items].sort((a, b) => a.number - b.number);
const ready = new Set();
if (args.ready === "all") {
  for (const item of items) ready.add(item.number);
} else if (args.ready) {
  for (const value of args.ready.split(",")) {
    const number = Number(value.trim());
    if (Number.isInteger(number)) ready.add(number);
  }
}

const missing = [];
const rows = [];
const scheduleDate = parseDate(start);
let cursor = new Date(scheduleDate.getTime());

for (const item of items) {
  while (
    !weekdays.has(weekdayOf(cursor)) ||
    skipDates.has(toIsoDate(cursor))
  ) {
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  const date = toIsoDate(cursor);
  const week =
    Math.floor(
      (cursor.getTime() - scheduleDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    ) + 1;
  const feedPt = path.join("Português", "Feed", `${item.slug}.png`);
  const storyPt = path.join("Português", "Stories", `${item.slug}.png`);
  const feedEn = path.join("English", "Feed", `${item.slug}.png`);
  const storyEn = path.join("English", "Stories", `${item.slug}.png`);
  const captionPt = path.join(
    "Português",
    "Legendas individuais",
    `${item.slug}.txt`
  );
  const captionEn = path.join(
    "English",
    "Legendas individuais",
    `${item.slug}.txt`
  );

  for (const relative of [feedPt, storyPt, feedEn, storyEn, captionPt, captionEn]) {
    if (!fs.existsSync(path.join(artRoot, relative))) {
      missing.push(relative);
    }
  }

  const captionPtText = fs.existsSync(path.join(artRoot, captionPt))
    ? fs.readFileSync(path.join(artRoot, captionPt), "utf8")
    : "";
  const captionEnText = fs.existsSync(path.join(artRoot, captionEn))
    ? fs.readFileSync(path.join(artRoot, captionEn), "utf8")
    : "";
  const status = statusFor(item, ready);

  rows.push({
    numero: item.number,
    slug: item.slug,
    bloco: blockFor(item.number),
    produto: item.product,
    prioridade_auditoria: item.priority,
    status_arte: status.arte,
    status_publicacao: status.publicacao,
    semana_campanha: week,
    data_pt: date,
    dia_semana_pt: WEEKDAY_NAMES[weekdayOf(cursor)],
    hora_feed_pt: feedTime,
    hora_story_pt: storyTime,
    data_en: date,
    hora_feed_en: enFeedTime,
    hora_story_en: storyTime,
    fuso: timezone,
    feed_pt: path.join("Português", "Feed", `${item.slug}.png`),
    story_pt: path.join("Português", "Stories", `${item.slug}.png`),
    feed_en: path.join("English", "Feed", `${item.slug}.png`),
    story_en: path.join("English", "Stories", `${item.slug}.png`),
    legenda_pt: path.join(
      "Português",
      "Legendas individuais",
      `${item.slug}.txt`
    ),
    legenda_en: path.join(
      "English",
      "Legendas individuais",
      `${item.slug}.txt`
    ),
    cta_pt: firstUrl(captionPtText),
    cta_en: firstUrl(captionEnText),
    nota_auditoria: item.finding,
    nota_ingles: item.english_note,
    observacao_story: item.stories_note,
    post_id: "",
    story_id: "",
    publicado_em: "",
    observacoes: "",
  });

  cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
}

if (missing.length) {
  console.error(
    `\n${missing.length} arquivo(s) não encontrado(s) em ${artRoot}:\n` +
      missing.map((value) => `  - ${value}`).join("\n") +
      "\n\nAjuste a pasta com --root=\"...\" e rode de novo.\n"
  );
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const headers = Object.keys(rows[0]);
const csv = [headers.join(",")]
  .concat(rows.map((row) => headers.map((key) => csvCell(row[key])).join(",")))
  .join("\n");
fs.writeFileSync(path.join(outputDir, "calendario.csv"), `${csv}\n`);

const payload = {
  generatedAt: new Date().toISOString(),
  collection: "Posts VOLYNX - Português e Inglês",
  artRoot: artRoot.startsWith(os.homedir())
    ? `~${artRoot.slice(os.homedir().length)}`
    : artRoot,
  assumptions: {
    start,
    weekdays: [...weekdays],
    skipDates: [...skipDates],
    timezone,
    feedTimePt: feedTime,
    storyTimePt: storyTime,
    feedTimeEn: enFeedTime,
    format: "feed 4:5 + story 9:16 por assunto, PT e EN",
    english: "mesma data do PT; usar somente se houver canal EN separado",
    publishing: "nenhuma publicação automática; importar o CSV no agendador",
  },
  counts: {
    subjects: rows.length,
    feedPt: rows.length,
    storiesPt: rows.length,
    feedEn: rows.length,
    storiesEn: rows.length,
    captionsPt: rows.length,
    captionsEn: rows.length,
    pendingRefine: rows.filter((row) => row.prioridade_auditoria === "refinar")
      .length,
    pendingFix: rows.filter((row) => row.prioridade_auditoria === "corrigir")
      .length,
    ready: rows.filter((row) => row.status_arte === "pronta").length,
  },
  posts: rows,
};
fs.writeFileSync(
  path.join(outputDir, "calendario.json"),
  `${JSON.stringify(payload, null, 2)}\n`
);

const byBlock = new Map();
for (const row of rows) {
  const entry = byBlock.get(row.bloco) ?? {
    label: row.bloco,
    count: 0,
    first: row.data_pt,
    last: row.data_pt,
  };
  entry.count += 1;
  entry.last = row.data_pt;
  byBlock.set(row.bloco, entry);
}

const md = [];
md.push("# Calendário de postagens · Coleção VOLYNX");
md.push("");
md.push(
  "Planejamento dos 50 assuntos da coleção, com feed 4:5 e story 9:16 em português e inglês."
);
md.push("");
md.push("## Resumo");
md.push("");
md.push(`- **Assuntos:** ${rows.length}`);
md.push(
  `- **Peças validadas:** ${rows.length * 4} artes (feed e story, PT e EN) + ${rows.length * 2} legendas`
);
md.push(
  `- **Prioridade da auditoria:** ${payload.counts.pendingFix} correções e ${payload.counts.pendingRefine} refinamentos`
);
md.push(
  `- **Prontas para agendar:** ${payload.counts.ready} de ${rows.length}`
);
md.push(
  `- **Janela:** ${rows[0].data_pt} a ${rows[rows.length - 1].data_pt}`
);
md.push(
  `- **Cadência:** ${weekdays.size} dias por semana · feed às ${feedTime} · story às ${storyTime} (${timezone})`
);
md.push(
  `- **Datas puladas:** ${[...skipDates].join(", ") || "nenhuma"}`
);
md.push("");
md.push("## Premissas");
md.push("");
md.push(
  "- O calendário usa os arquivos de `Posts VOLYNX - Português e Inglês`; nada é movido ou renomeado."
);
md.push(
  "- O inglês está na mesma data do português, às " +
    `${enFeedTime}. Use apenas se existir um canal EN separado; caso contrário, ignore as colunas ` +
    "`data_en`/`hora_feed_en`."
);
md.push(
  "- O story do dia usa a arte 9:16 correspondente e deve ser publicado depois do feed."
);
md.push(
  "- Nenhuma publicação é automática. O CSV é a fonte para Meta Business Suite, Buffer, Later ou outro agendador."
);
md.push(
  "- O status `refino_pendente` marca os 27 itens que o Codex apontou como refinamento; `correcao_pendente` marca os 23 de correção material."
);
md.push("");
md.push("## Resumo por bloco");
md.push("");
md.push("| Bloco | Posts | Primeira data | Última data |");
md.push("|---|---:|---|---|");
for (const entry of byBlock.values()) {
  md.push(
    `| ${mdCell(entry.label)} | ${entry.count} | ${entry.first} | ${entry.last} |`
  );
}
md.push("");
md.push("## Calendário");
md.push("");
md.push("| # | Sem | Data | Dia | Bloco | Assunto | Prioridade | Status | CTA PT |");
md.push("|---:|---:|---|---|---|---|---|---|---|");
for (const row of rows) {
  md.push(
    `| ${row.numero} | ${row.semana_campanha} | ${row.data_pt} | ${mdCell(
      row.dia_semana_pt
    )} | ${mdCell(row.bloco)} | ${mdCell(row.produto)} | ${
      row.prioridade_auditoria
    } | ${row.status_arte} | ${row.cta_pt ? `<${row.cta_pt}>` : "—"} |`
  );
}
md.push("");
md.push("## Checklist por post");
md.push("");
md.push(
  "1. Confirmar `status_arte = pronta` e `status_publicacao = pronto_para_agendar`."
);
md.push("2. Publicar o feed 4:5 com a legenda individual e o texto alternativo.");
md.push("3. Publicar o story 9:16 no mesmo dia, com o sticker de link quando houver.");
md.push("4. Conferir o destino do CTA em celular antes de agendar.");
md.push("5. Registrar `post_id`, `story_id` e `publicado_em` no CSV.");
md.push("");
md.push("## Próximo passo");
md.push("");
md.push(
  "Quando o refinamento terminar, rode `node gerar-calendario.mjs --ready=all` para marcar tudo como pronto, ou informe os números concluídos, por exemplo `--ready=1,2,4,7`."
);
fs.writeFileSync(path.join(outputDir, "calendario.md"), `${md.join("\n")}\n`);

console.log(
  JSON.stringify(
    {
      ok: true,
      artRoot: payload.artRoot,
      rows: rows.length,
      counts: payload.counts,
      window: {
        first: rows[0].data_pt,
        last: rows[rows.length - 1].data_pt,
      },
      outputs: ["calendario.csv", "calendario.json", "calendario.md"].map(
        (file) => path.join(outputDir, file)
      ),
    },
    null,
    2
  )
);
