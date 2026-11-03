#!/usr/bin/env node
/**
 * Gera links rastreáveis (UTM) por peça e por canal.
 *
 * Fonte: ../posts.json (não é alterado).
 * Saída: links.csv (uma linha por peça, uma coluna por canal).
 *
 * Peças excluídas: 38 (case Jhonatan Peterson). O site foi desativado de
 * propósito e o link responde 404; publicar essa peça quebraria a confiança.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// posts.json vive na coleção original (fora do repo). Aceita --posts ou
// COLECAO_POSTS; se nenhum for passado, tenta os locais conhecidos.
function resolvePostsPath() {
  const flag = process.argv.indexOf("--posts");
  const candidates = [
    flag !== -1 ? process.argv[flag + 1] : null,
    process.env.COLECAO_POSTS,
    join(here, "posts.json"),
    join(here, "..", "posts.json"),
    join(process.env.HOME ?? "", "Downloads", "colecao-premium", "posts.json"),
  ].filter(Boolean);

  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    console.error("posts.json não encontrado. Use --posts <caminho> ou defina COLECAO_POSTS.");
    process.exit(1);
  }
  return found;
}

const postsPath = resolvePostsPath();
const posts = JSON.parse(readFileSync(postsPath, "utf8"));

const EXCLUDED = new Set([38]);

const campaignByBrand = {
  VOLYNX: "volynx_autoridade_2026_11",
  CVitae: "cvitae_2026_11",
  "VOLYNX Daily": "daily_2026_11",
  "Lynx Studio": "lynx_studio_2026_11",
  "Eduardo Volken": "eduardo_autoridade_2026_11",
  "Palavras do Universo": "pdu_caixa_2026_11",
  "Diário do Universo": "diario_2026_11",
};

const channelsByBrand = {
  VOLYNX: ["instagram", "linkedin", "whatsapp", "pinterest", "youtube"],
  CVitae: ["instagram", "whatsapp"],
  "VOLYNX Daily": ["instagram", "whatsapp"],
  "Lynx Studio": ["instagram", "linkedin"],
  "Eduardo Volken": ["linkedin", "instagram"],
  "Palavras do Universo": ["instagram", "tiktok", "youtube", "whatsapp", "pinterest"],
  "Diário do Universo": ["instagram", "whatsapp"],
};

const medium = {
  instagram: "organic_social",
  tiktok: "organic_social",
  youtube: "organic_social",
  linkedin: "organic_social",
  whatsapp: "status",
  pinterest: "pin",
};

const columns = ["instagram", "linkedin", "tiktok", "youtube", "whatsapp", "pinterest"];

function withUtm(rawUrl, brand, slug, channel) {
  const url = new URL(rawUrl);
  url.searchParams.set("utm_source", channel);
  url.searchParams.set("utm_medium", medium[channel]);
  url.searchParams.set("utm_campaign", campaignByBrand[brand] ?? "volynx_2026_11");
  url.searchParams.set("utm_content", `${slug}_${channel}`);
  return url.toString();
}

const rows = posts
  .filter((post) => !EXCLUDED.has(post.number))
  .map((post) => {
    const channels = channelsByBrand[post.brand] ?? ["instagram"];
    const row = {
      number: post.number,
      brand: post.brand,
      product: post.product,
      slug: post.slug,
    };
    for (const channel of columns) {
      row[channel] = channels.includes(channel)
        ? withUtm(post.url, post.brand, post.slug, channel)
        : "";
    }
    return row;
  });

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const header = ["number", "brand", "product", "slug", ...columns];
const csv = [
  header.join(","),
  ...rows.map((row) => header.map((key) => csvCell(row[key])).join(",")),
].join("\n");

writeFileSync(join(here, "links.csv"), `${csv}\n`, "utf8");

console.log(`links.csv gerado: ${rows.length} peças, ${columns.length} canais.`);
console.log(`Fonte: ${postsPath}`);
console.log(`Excluídas: ${[...EXCLUDED].join(", ")}`);
