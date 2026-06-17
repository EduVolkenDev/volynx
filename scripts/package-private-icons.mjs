#!/usr/bin/env node
/**
 * Build private Icon Vault deliverables.
 *
 * Output is intentionally outside public/. Upload storage/icons-store/<version>
 * to the private Supabase Storage bucket named "icons".
 */

import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CATALOG_PATH = path.join(REPO_ROOT, "public/assets/icons-store/catalog.json");
const OUT_ROOT = path.join(REPO_ROOT, "storage/icons-store");
const VERSION = process.env.ICONS_DELIVERY_VERSION || "v1.0.0";
const VERSION_ROOT = path.join(OUT_ROOT, VERSION);
const PAID_PLANS = new Set(["standard", "premium", "paid"]);

function slugify(value, fallback = "icon") {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || fallback;
}

function safeFileName(value, fallback = "icon.webp") {
  const name = path.basename(String(value || fallback))
    .replace(/[^a-z0-9._-]+/gi, "-")
    .slice(0, 120);
  return name || fallback;
}

function publicPathToDisk(assetPath) {
  const clean = String(assetPath || "").replace(/^\//, "");
  if (!clean.startsWith("assets/icons-store/") || clean.includes("..")) {
    throw new Error(`Unsafe icon path: ${assetPath}`);
  }
  return path.join(REPO_ROOT, "public", clean);
}

function singleObjectPath(icon) {
  return `${VERSION}/singles/${slugify(icon.id)}/${safeFileName(icon.file || icon.path)}`;
}

function packObjectPath(collection) {
  return `${VERSION}/packs/${slugify(collection)}.zip`;
}

function fullComboObjectPath() {
  return `${VERSION}/packs/full-premium-combo.zip`;
}

function readmeFor(label, count) {
  return [
    "VOLYNX Icon Vault",
    "",
    `${label}`,
    `${count} file${count === 1 ? "" : "s"}`,
    "",
    "License: commercial use for the purchasing account.",
    "Do not redistribute, resell, scrape, or publish the source files as a competing icon pack.",
    "Support: https://volynx.world/support/?product=volynx-icons-store&intent=delivery",
    "",
  ].join("\n");
}

async function addIcon(zip, icon, prefix = "") {
  const diskPath = publicPathToDisk(icon.path);
  await fs.access(diskPath);
  const bytes = await fs.readFile(diskPath);
  const filename = safeFileName(icon.file || icon.path);
  zip.file(prefix ? `${prefix}/${filename}` : filename, bytes);
}

async function writeSingle(icon) {
  const dest = path.join(OUT_ROOT, singleObjectPath(icon));
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(publicPathToDisk(icon.path), dest);
  return dest;
}

async function writePack(collection, icons, objectPath) {
  const zip = new JSZip();
  const folder = slugify(collection, "volynx-icons");
  for (const icon of icons) {
    await addIcon(zip, icon, folder);
  }
  zip.file(`${folder}/README-LICENSE.txt`, readmeFor(collection, icons.length));

  const dest = path.join(OUT_ROOT, objectPath);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  await fs.writeFile(dest, buffer);
  return dest;
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf8"));
  if (!Array.isArray(catalog)) throw new Error("catalog.json must be an array");

  const paidIcons = catalog.filter((icon) => PAID_PLANS.has(String(icon.plan || "").toLowerCase()));
  if (!paidIcons.length) throw new Error("No paid icons found in catalog");

  await fs.rm(VERSION_ROOT, { recursive: true, force: true });
  await fs.mkdir(VERSION_ROOT, { recursive: true });

  const byCollection = new Map();
  const singles = [];
  for (const icon of paidIcons) {
    const collection = String(icon.collection || icon.category || "Icon Pack");
    if (!byCollection.has(collection)) byCollection.set(collection, []);
    byCollection.get(collection).push(icon);
    const objectPath = singleObjectPath(icon);
    await writeSingle(icon);
    singles.push({
      id: icon.id,
      name: icon.name,
      collection,
      plan: icon.plan,
      public_path: icon.path,
      object_path: objectPath,
      file: icon.file,
    });
  }

  const packs = [];
  for (const [collection, icons] of Array.from(byCollection.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    const objectPath = packObjectPath(collection);
    await writePack(collection, icons, objectPath);
    packs.push({ collection, count: icons.length, object_path: objectPath });
  }

  const fullComboPath = fullComboObjectPath();
  await writePack("Full Premium Combo", paidIcons, fullComboPath);
  packs.push({ collection: "__all_premium__", count: paidIcons.length, object_path: fullComboPath });

  const manifest = {
    version: VERSION,
    bucket: "icons",
    generated_at: new Date().toISOString(),
    paid_icon_count: paidIcons.length,
    paid_pack_count: byCollection.size,
    singles,
    packs,
  };
  await fs.writeFile(path.join(VERSION_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  await fs.writeFile(path.join(OUT_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  console.log(`Built ${singles.length} private singles, ${packs.length} pack ZIPs`);
  console.log(`Output: ${VERSION_ROOT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
