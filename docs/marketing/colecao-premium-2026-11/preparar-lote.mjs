#!/usr/bin/env node
/**
 * Prepara um lote de postagem a partir da coleção premium.
 *
 * Uso:
 *   node preparar-lote.mjs --date 2026-11-03 --items 40,39,19
 *   node preparar-lote.mjs --date 2026-11-04 --items 41,5
 *
 * Saída padrão: ~/Desktop/publicar-<data>/
 *   NN-<slug>-feed.png
 *   NN-<slug>-story.png
 *   NN-instagram.txt
 *   NN-linkedin.txt
 *   NN-whatsapp.txt
 *   NN-story.txt
 *   NN-alt.txt
 *   LEIA-ME.md
 *
 * O Instagram/TikTok recebem "link na bio" em vez de URL crua.
 * LinkedIn e WhatsApp recebem a URL de links.csv, com UTM.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function resolvePostsPath() {
  const flag = process.argv.indexOf("--posts");
  const candidates = [
    flag !== -1 ? process.argv[flag + 1] : null,
    process.env.COLECAO_POSTS,
    join(here, "posts.json"),
    join(here, "..", "posts.json"),
    join(homedir(), "Downloads", "colecao-premium", "posts.json"),
  ].filter(Boolean);
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    console.error("posts.json não encontrado. Use --posts <caminho> ou defina COLECAO_POSTS.");
    process.exit(1);
  }
  return found;
}

function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.split(",");
  return lines.map((line) => {
    const values = line.split(",");
    const row = {};
    columns.forEach((column, index) => { row[column] = values[index] ?? ""; });
    return row;
  });
}

function splitCaption(raw) {
  const [main, ...altParts] = raw.split(/TEXTO ALTERNATIVO/);
  const alt = altParts.join("TEXTO ALTERNATIVO").trim();
  const blocks = main.trim().split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const hashtags = blocks.find((block) => block.startsWith("#")) ?? "";
  const ctaLine = blocks.find((block) => /^[^\n#]+:\s*https?:\/\//.test(block)) ?? "";
  const body = blocks.filter((block) => block !== hashtags && block !== ctaLine).join("\n\n");
  const ctaLabel = ctaLine ? ctaLine.slice(0, ctaLine.indexOf(":")) : "Saiba mais";
  return { body, hashtags, ctaLabel, alt };
}

const postsPath = resolvePostsPath();
const collection = dirname(postsPath);
const posts = JSON.parse(readFileSync(postsPath, "utf8"));
const linksPath = join(collection, "publicacao", "links.csv");
const links = parseCsv(readFileSync(linksPath, "utf8"));
const linksByNumber = new Map(links.map((row) => [Number(row.number), row]));

const date = argValue("--date", new Date().toISOString().slice(0, 10));
const itemsArg = argValue("--items", "");
const numbers = itemsArg
  ? itemsArg.split(",").map((value) => Number(value.trim())).filter(Boolean)
  : posts.map((post) => post.number);

const outDir = argValue("--out", join(homedir(), "Desktop", `publicar-${date}`));
mkdirSync(outDir, { recursive: true });

const written = [];
numbers.forEach((number, index) => {
  const post = posts.find((item) => item.number === number);
  if (!post) {
    console.warn(`Peça ${number} não existe. Ignorada.`);
    return;
  }
  if (number === 38) {
    console.warn("Peça 38 é o case Jhonatan Peterson e não deve ser publicada. Ignorada.");
    return;
  }

  const order = String(index + 1).padStart(2, "0");
  const prefix = `${order}-${post.slug}`;
  const row = linksByNumber.get(number) ?? {};
  const captionPath = join(collection, "legendas", `${post.slug}.txt`);
  const captionSource = existsSync(captionPath) ? readFileSync(captionPath, "utf8") : post.caption;
  const { body, hashtags, ctaLabel, alt } = splitCaption(captionSource);

  const feedSource = join(collection, "feed", `${post.slug}.png`);
  const storySource = join(collection, "stories", `${post.slug}.png`);
  const copied = [];

  for (const [suffix, source] of [["feed", feedSource], ["story", storySource]]) {
    if (!existsSync(source)) {
      console.warn(`Peça ${number}: falta ${source}`);
      continue;
    }
    const target = join(outDir, `${prefix}-${suffix}.png`);
    copyFileSync(source, target);
    copied.push(target);
  }

  const instagram = row.instagram
    ? `${body}\n\n${ctaLabel}: link na bio.\n\n${hashtags}`
    : "";
  const linkedin = row.linkedin
    ? `${body}\n\n${ctaLabel}: ${row.linkedin}\n\n${hashtags}`
    : "";
  const whatsapp = row.whatsapp
    ? `${post.headline}\n\n${body}\n\n${ctaLabel}: ${row.whatsapp}`
    : "";
  const story = row.instagram
    ? `${post.headline}\n\n${ctaLabel} → link na bio`
    : `${post.headline}\n\n${ctaLabel}`;
  const tiktok = row.tiktok
    ? `${post.headline}\n\n${ctaLabel}: link na bio.\n\n${hashtags}`
    : "";

  const files = [
    ["instagram", instagram],
    ["linkedin", linkedin],
    ["whatsapp", whatsapp],
    ["story", story],
    ["tiktok", tiktok],
    ["alt", alt],
  ];
  for (const [channel, contents] of files) {
    if (!contents) continue;
    const target = join(outDir, `${prefix}-${channel}.txt`);
    writeFileSync(target, `${contents.trim()}\n`, "utf8");
    copied.push(target);
  }

  written.push({ post, prefix, row, copied, instagram, linkedin, whatsapp, story, tiktok });
});

const readme = [
  `# Publicar · ${date}`,
  "",
  "Tudo nesta pasta está pronto. As imagens são 1080×1350 (feed, 4:5) e 1080×1920 (story, 9:16).",
  "",
  "## Ordem",
  "",
  ...written.map(({ post, prefix }, index) => {
    const when = index === 0 ? "primeiro" : `depois do ${String(index).padStart(2, "0")}`;
    return `${index + 1}. **${post.brand} · ${post.headline}** (${when}) — arquivos \`${prefix}-*\`.`;
  }),
  "",
  "## Instagram",
  "",
  "1. Abra o Instagram no celular ou no navegador com sessão ativa.",
  "2. Feed: use a imagem `-feed.png` e cole o texto de `-instagram.txt`.",
  "3. Stories: use a imagem `-story.png` e adicione o sticker de link.",
  "4. O texto diz “link na bio”: confirme que a bio aponta para o destino do dia.",
  "",
  "## LinkedIn",
  "",
  "1. Use a imagem `-feed.png`.",
  "2. Cole o texto de `-linkedin.txt`; a URL já tem UTM.",
  "",
  "## WhatsApp Status",
  "",
  "1. Use a imagem `-story.png`.",
  "2. Cole o texto de `-whatsapp.txt`; a URL já tem UTM.",
  "",
  "## Regras",
  "",
  "- Não publique a peça 38.",
  "- Não troque a URL por uma sem UTM.",
  "- Uma peça, um CTA.",
  "- Não prometa resultado nem venda.",
  "",
].join("\n");
writeFileSync(join(outDir, "LEIA-ME.md"), readme, "utf8");

console.log(`Lote gerado em ${outDir}`);
for (const { post, row } of written) {
  const channels = ["instagram", "linkedin", "whatsapp", "tiktok"].filter((channel) => row[channel]);
  console.log(`  ${String(post.number).padStart(2)} ${post.brand} · ${post.headline}`);
  console.log(`     canais: ${channels.join(", ")}`);
}
