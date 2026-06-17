#!/usr/bin/env node
/**
 * VOLYNX Icons Store — catalog regenerator
 *
 * Scans public/assets/icons-store/ and builds catalog.json from the explicit
 * FOLDER_MANIFEST below.
 *
 * - Does NOT recurse into sub-folders of Regenerate/, Repairable/, etc.
 * - Skips folders that are not listed in FOLDER_MANIFEST.
 * - Finder tags can still be used as human review notes, but they are not a
 *   shipping gate. A local macOS tag should not decide production inventory.
 *
 * Usage:
 *   node scripts/regenerate-icons-catalog.mjs
 *   node scripts/regenerate-icons-catalog.mjs --dry-run   # preview only
 *
 * After running, review the diff and commit the updated catalog.json.
 */

import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const iconsRoot = path.join(repoRoot, "public/assets/icons-store");
const catalogPath = path.join(iconsRoot, "catalog.json");

const DRY_RUN = process.argv.includes("--dry-run");

const IMAGE_EXT = new Set([".png", ".webp", ".jpg", ".jpeg", ".svg"]);

// ── Explicit folder → friendly-name + category + plan mapping ──────────────
// Only folders listed here ship. Keep this as the source of truth so catalog
// generation stays deterministic across machines and CI.
const FOLDER_MANIFEST = {
  "Abstract-Free":         { name: "Abstract",         category: "futuristic", plan: "free" },
  // "BigIcons-Free":      REMOVED — icons render broken; needs redo (re-enable after fix)
  // "Chromed-Premium":    REMOVED — icons render broken (12, 115, 153… all); needs redo
  "Day-By-Day-free":       { name: "Day by Day",       category: "simple",     plan: "free" },
  // "Free-Greens":        REMOVED — icons render broken; needs redo
  // "Free-Purples":       REMOVED — icons render broken; needs redo
  "daily-common-free":     { name: "Daily Common",     category: "daily",      plan: "free" },
  "daily-common2-free":    { name: "Daily Common II",  category: "daily",      plan: "free" },
  "daily-iridescent-premium": { name: "Daily Iridescent", category: "daily",   plan: "premium" },
  "daily-poligon-free":    { name: "Daily Polygon",    category: "daily",      plan: "free" },
  "daily3Dpremium":        { name: "Daily 3D",         category: "daily",      plan: "premium" },
  "glow-premium":          { name: "Glow",             category: "futuristic", plan: "standard" },
  "golden-icons":          { name: "Golden Icons",     category: "metal",      plan: "free" },
  "Hyper-Icons-Premium":   { name: "Hyper Icons",      category: "futuristic", plan: "premium" },
  "Icons-Glass-Premium":   { name: "Glass Icons",      category: "futuristic", plan: "premium" },
  "icons-tech-free":       { name: "Tech Icons",       category: "futuristic", plan: "free" },
  // "Icons-Glass-Premium-2": REMOVED — folder deleted from disk
  "Iridescent-Premium":    { name: "Iridescent",       category: "futuristic", plan: "premium" },
  // "Metal-Premium":      REMOVED — folder deleted from disk (replaced by metal-chrome-premium)
  "metal-chrome-premium":  { name: "Metal Chrome",     category: "metal",      plan: "premium" },
  // "Nature-Premium":     REMOVED — icons render broken (1, 24, 48… all); needs redo
  "Neon-Icons-Free":       { name: "Neon Icons",       category: "futuristic", plan: "free" },
  // "Neon-Icons-Free3":   REMOVED — folder deleted from disk
  // "Pink-Abstract-Free": REMOVED — icons render broken; needs redo
  "Poligon-Premium":       { name: "Polygon",          category: "futuristic", plan: "premium" },
  "purple-icons-premium":  { name: "Purple Icons",     category: "purple",     plan: "free" },
  "soft-blue":             { name: "Soft Blue",        category: "blue",       plan: "standard" },
  "soft-dark-blue":        { name: "Soft Dark Blue",   category: "blue",       plan: "standard" },
  "soft-green":            { name: "Soft Green",       category: "green",      plan: "standard" },
  "soft-orange":           { name: "Soft Orange",      category: "draw",       plan: "standard" },
  "soft-red":              { name: "Soft Red",         category: "pink",       plan: "standard" },
  "vintage-premium":       { name: "Vintage",          category: "futuristic", plan: "premium" },
};

// ── Walk files in a single folder (no recursion) ──────────────────────────
function filesIn(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isFile() && !e.name.startsWith("."))
      .filter(e => IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    return [];
  }
}

// ── Build slug from filename ──────────────────────────────────────────────
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function prettifyLabel(filename) {
  return path.basename(filename, path.extname(filename))
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Main ──────────────────────────────────────────────────────────────────
function main() {
  const entries = fs.readdirSync(iconsRoot, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

  const report = { included: [], skipped_unmapped: [], missing_manifest: [] };
  const catalog = [];
  let idx = 0;

  for (const folderName of entries.sort()) {
    const abs = path.join(iconsRoot, folderName);
    const manifestEntry = FOLDER_MANIFEST[folderName];

    if (!manifestEntry) {
      report.missing_manifest.push({ folder: folderName, reason: "not listed in FOLDER_MANIFEST" });
      continue;
    }

    const files = filesIn(abs);
    if (files.length === 0) {
      report.skipped_unmapped.push({ folder: folderName, reason: "no image files" });
      continue;
    }

    for (const file of files) {
      idx++;
      const id = `${slugify(folderName)}-${slugify(path.basename(file, path.extname(file)))}-${idx}`;
      catalog.push({
        id,
        name: prettifyLabel(file),
        file,
        path: `/assets/icons-store/${folderName}/${file}`,
        category: manifestEntry.category,
        collection: manifestEntry.name,
        plan: manifestEntry.plan,
      });
    }
    report.included.push({ folder: folderName, name: manifestEntry.name, count: files.length, plan: manifestEntry.plan });
  }

  // Also report folders in manifest that don't exist on disk
  for (const key of Object.keys(FOLDER_MANIFEST)) {
    if (!entries.includes(key)) report.missing_manifest.push({ folder: key, tag: "(folder missing on disk)" });
  }

  // ── Write / report ──
  console.log("\n═══════════════════════════════════════════════════════════════════════");
  console.log("Icons Store catalog regenerator");
  console.log("═══════════════════════════════════════════════════════════════════════\n");

  console.log(`Included (listed in manifest):`);
  for (const r of report.included) {
    console.log(`  ✓ ${r.folder.padEnd(28)} → "${r.name}" · ${r.count} icons · ${r.plan}`);
  }

  if (report.missing_manifest.length) {
    console.log(`\nSkipped (not listed in manifest):`);
    for (const r of report.missing_manifest) console.log(`  ⚠ ${r.folder.padEnd(28)} ${r.reason || r.tag || ""}`);
  }

  if (report.skipped_unmapped.length) {
    console.log(`\nEmpty folders skipped:`);
    for (const r of report.skipped_unmapped) console.log(`  — ${r.folder}: ${r.reason}`);
  }

  const totalIcons = catalog.length;
  const packs = report.included.length;
  console.log(`\n───────────────────────────────────────────────────────────────────────`);
  console.log(`Result: ${totalIcons} icons · ${packs} packs`);
  console.log(`───────────────────────────────────────────────────────────────────────`);

  if (DRY_RUN) {
    console.log("\nDRY RUN — catalog.json NOT written. Remove --dry-run to apply.");
    return;
  }

  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`\nWrote ${catalogPath}`);
}

main();
