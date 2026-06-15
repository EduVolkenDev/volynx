#!/usr/bin/env node

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const publicPreviewRoot = join(root, "public/assets/icons-store");
const sourceRoot = process.argv[2] ? resolve(process.argv[2]) : "";
const outputRoot = resolve(process.argv[3] || "/private/tmp/volynx-icons-private");
const catalog = JSON.parse(readFileSync(join(publicPreviewRoot, "catalog.json"), "utf8"));

if (!sourceRoot || sourceRoot === publicPreviewRoot) {
  throw new Error(
    "Usage: node scripts/package-private-icons.mjs <originals-directory> [output-directory]. " +
      "The public preview directory is intentionally rejected.",
  );
}

function slug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function assetTier(icon) {
  const haystack = [icon.collection, icon.category, icon.path, icon.file, icon.name].join(" ").toLowerCase();
  if (haystack.includes("hyper")) return "hyper";
  if (String(icon.plan).toLowerCase() === "premium") return "premium";
  return "standard";
}

function packTier(collection, icons) {
  if (collection.toLowerCase().includes("hyper")) return "hyper";
  if (icons.every((icon) => String(icon.plan).toLowerCase() === "premium")) return "premium";
  return "mixed";
}

function zipFiles(destination, files) {
  mkdirSync(dirname(destination), { recursive: true });
  const result = spawnSync("/usr/bin/zip", ["-q", "-j", destination, ...files], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`zip failed: ${destination}`);
}

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(join(outputRoot, "files"), { recursive: true });
cpSync(sourceRoot, join(outputRoot, "files"), {
  recursive: true,
  filter: (path) => !path.endsWith("catalog.json") && !path.endsWith(".html"),
});

const assets = {};
const collections = new Map();
for (const icon of catalog) {
  const relative = String(icon.path).replace(/^\/assets\/icons-store\//, "");
  const storagePath = `files/${relative}`;
  assets[storagePath] = { tier: assetTier(icon) };
  if (!collections.has(icon.collection)) collections.set(icon.collection, []);
  collections.get(icon.collection).push(icon);
}

const gallery = readFileSync(join(publicPreviewRoot, "volynx-icons-gallery.html"), "utf8");
const cards = [...gallery.matchAll(/<div class="card">[\s\S]*?<div class="icon-wrap">\s*(<svg[\s\S]*?<\/svg>)[\s\S]*?<div class="card-label">([^<]+)<\/div>[\s\S]*?<div class="card-num">VX\s*\/\s*(\d+)<\/div>[\s\S]*?<\/div>/g)];
for (const [, svg, label, number] of cards) {
  const filename = `vx-${number.padStart(2, "0")}-${slug(label)}.svg`;
  const storagePath = `files/svg-essentials/${filename}`;
  mkdirSync(join(outputRoot, "files/svg-essentials"), { recursive: true });
  writeFileSync(join(outputRoot, storagePath), svg);
  assets[storagePath] = { tier: "standard" };
}

const packs = {};
for (const [collection, icons] of collections) {
  const key = slug(collection);
  const files = icons.map((icon) => join(sourceRoot, String(icon.path).replace(/^\/assets\/icons-store\//, "")));
  const path = `packs/${key}.zip`;
  zipFiles(join(outputRoot, path), files);
  packs[key] = { tier: packTier(collection, icons), path };
}
const premiumIcons = catalog.filter((icon) => String(icon.plan).toLowerCase() === "premium");
zipFiles(
  join(outputRoot, "packs/all-premium.zip"),
  premiumIcons.map((icon) => join(sourceRoot, String(icon.path).replace(/^\/assets\/icons-store\//, ""))),
);
packs.__all_premium__ = { tier: "hyper", path: "packs/all-premium.zip" };

writeFileSync(join(outputRoot, "manifest.json"), JSON.stringify({ assets, packs }, null, 2));
console.log(JSON.stringify({
  output: outputRoot,
  assets: Object.keys(assets).length,
  packs: Object.keys(packs).length,
  svgAssets: cards.length,
}, null, 2));
