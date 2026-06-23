import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const translationsPath = path.join(root, "public/js/translations.js");
const translationsSource = fs.readFileSync(translationsPath, "utf8");
const context = { window: {} };

vm.runInNewContext(translationsSource, context, { filename: translationsPath });

const translations = context.window.VX_TRANS;
const en = translations?.en ?? {};
const pt = translations?.pt ?? {};
const enKeys = Object.keys(en);
const ptKeys = Object.keys(pt);
const localeSections = {
  en: translationsSource.slice(
    translationsSource.indexOf("  en: {") + "  en: {".length,
    translationsSource.indexOf("\n  pt: {"),
  ),
  pt: translationsSource.slice(translationsSource.indexOf("\n  pt: {") + "\n  pt: {".length),
};

function duplicateKeys(source) {
  const counts = new Map();
  for (const match of source.matchAll(/^\s*"([^"]+)"\s*:/gm)) {
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count }));
}

const duplicateEn = duplicateKeys(localeSections.en);
const duplicatePt = duplicateKeys(localeSections.pt);

const sourceFiles = execFileSync(
  "rg",
  ["--files", "src", "public", "-g", "*.astro", "-g", "*.html", "-g", "*.js"],
  { cwd: root, encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);

const usedKeys = new Set();
const qrGenKeys = new Set();
const keyPattern = /data-i18n(?:-html|-aria|-placeholder|-title)?=["']([^"']+)["']/g;
const qrGenKeyPattern = /data-qg-i18n=["']([^"']+)["']/g;
const literalCandidates = new Map();

for (const file of sourceFiles) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const match of source.matchAll(keyPattern)) usedKeys.add(match[1]);
  for (const match of source.matchAll(qrGenKeyPattern)) qrGenKeys.add(match[1]);

  if (file.endsWith(".astro")) {
    const count = source.split("\n").filter((line) => {
      if (!/>\s*[A-Za-zÀ-ÿ][^<{]*</.test(line)) return false;
      return !/data-(?:qg-)?i18n|i18n-(?:en|pt)|<style|<script|<!--/.test(line);
    }).length;
    if (count) literalCandidates.set(file, count);
  }
}

const qrGenSource = fs.readFileSync(path.join(root, "public/scripts/qrgen-editor.js"), "utf8");
const qrGenPtStart = qrGenSource.indexOf("    pt: {");
const qrGenPtEnd = qrGenSource.indexOf("\n    }\n  };", qrGenPtStart);
const qrGenPtSource = qrGenPtStart >= 0 && qrGenPtEnd > qrGenPtStart
  ? qrGenSource.slice(qrGenPtStart, qrGenPtEnd)
  : "";
const qrGenPtKeys = new Set(
  [...qrGenPtSource.matchAll(/^\s*"([^"]+)":/gm)].map((match) => match[1]),
);

const accentlessWords = new Set([
  "voce",
  "voces",
  "nao",
  "tambem",
  "ja",
  "estao",
  "sera",
  "serao",
  "possivel",
  "configuracao",
  "configuracoes",
  "informacao",
  "informacoes",
  "pagina",
  "paginas",
  "usuario",
  "usuarios",
  "conteudo",
  "conteudos",
  "opcao",
  "opcoes",
  "sessao",
  "conexao",
  "proximo",
  "proxima",
  "ultimos",
  "ultima",
  "numero",
  "numeros",
  "codigo",
  "codigos",
  "credito",
  "disponivel",
  "necessario",
  "necessaria",
  "facil",
  "rapido",
  "rapida",
  "diagnostico",
  "analise",
  "concluido",
  "concluida",
]);
const informalWords = new Set(["pra", "pros", "tá", "tô"]);
const inconsistentTerms =
  /\b(preview|deploy|assets?|exports?|workspace|browser|templates?|dashboard|customizad[oa]s?|brief)\b/i;

function words(value) {
  return String(value).toLocaleLowerCase("pt-BR").match(/[\p{L}]+/gu) ?? [];
}

const missingEn = ptKeys.filter((key) => !(key in en));
const missingPt = enKeys.filter((key) => !(key in pt));
const missingUsed = [...usedKeys].filter((key) => !(key in en) || !(key in pt));
const missingQrGenPt = [...qrGenKeys].filter((key) => !qrGenPtKeys.has(key));
const suspiciousPortuguese = ptKeys
  .filter(
    (key) =>
      !key.endsWith("_ph") &&
      typeof pt[key] === "string" &&
      words(pt[key]).some((word) => accentlessWords.has(word)),
  )
  .map((key) => ({ key, value: pt[key] }));
const informalPortuguese = [...usedKeys]
  .filter(
    (key) =>
      typeof pt[key] === "string" &&
      words(pt[key]).some((word) => informalWords.has(word)),
  )
  .map((key) => ({ key, value: pt[key] }));
const inconsistentPortugueseTerms = [...usedKeys]
  .filter((key) => typeof pt[key] === "string" && inconsistentTerms.test(pt[key]))
  .map((key) => ({ key, value: pt[key] }));
const identicalLongValues = enKeys
  .filter(
    (key) =>
      key in pt &&
      typeof en[key] === "string" &&
      en[key].length > 12 &&
      en[key] === pt[key],
  )
  .map((key) => ({ key, value: en[key] }));

const report = {
  counts: {
    englishKeys: enKeys.length,
    portugueseKeys: ptKeys.length,
    usedKeys: usedKeys.size,
  },
  missingEn,
  missingPt,
  missingUsed,
  missingQrGenPt,
  duplicateEn,
  duplicatePt,
  suspiciousPortuguese,
  informalPortuguese,
  inconsistentPortugueseTerms,
  identicalLongValues,
  literalCandidateCounts: Object.fromEntries(
    [...literalCandidates.entries()].sort((a, b) => b[1] - a[1]),
  ),
};

console.log(JSON.stringify(report, null, 2));

if (
  missingEn.length ||
  missingPt.length ||
  missingUsed.length ||
  missingQrGenPt.length ||
  duplicateEn.length ||
  duplicatePt.length
) {
  process.exitCode = 1;
}
