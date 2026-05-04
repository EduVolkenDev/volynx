#!/usr/bin/env node
/**
 * VOLYNX — Dev Journey ZIP packager
 *
 * Generates clean, public-ready ZIPs of the Dev Journey kits.
 * Source folders live OUTSIDE the repo (under ~/DevJourney-Formated-Final and ~/Downloads).
 * Output ZIPs land in ./dist-deliverables/  (NOT in public/, NOT committed to git).
 *
 * Usage:
 *   node scripts/package-devjourney.mjs                # all configured tiers
 *   node scripts/package-devjourney.mjs --tier=social  # specific tier
 *   node scripts/package-devjourney.mjs --dry-run      # plan only
 *
 * Cleanup rules (always applied):
 *   - .DS_Store, __MACOSX (macOS metadata)
 *   - *.odt              (replaced by .pdf in our kit)
 *   - SETUP-Hotmart.md   (legacy platform binding — we run on VOLYNX)
 *   - Any file containing "hotmart" in name
 *
 * Output naming:
 *   dist-deliverables/devjourney-social.zip
 *   dist-deliverables/devjourney-pro.zip
 *   dist-deliverables/devjourney-bundle.zip
 */

import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, cpSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const HOME = homedir();

// ── Configuration ──────────────────────────────────────────────
const TIERS = {
  social: {
    label: "Social Sprint",
    sources: [
      // Best-package source per project memory (audit 2026-05-04)
      join(HOME, "DevJourney-Formated-Final/HOTMART PRODUCT/DevJourney_SOCIAL_Hotmart_Kit_v1"),
    ],
    readme: socialReadme(),
  },
  pro: {
    label: "Pro Track",
    sources: [
      // Phase 2: combine 02-TRACK-PRO/ + shared root PDFs from dev-journey-pro-and-bundle
      // join(HOME, "Downloads/dev-journey-pro-and-bundle/02-TRACK-PRO"),
    ],
    readme: null,
  },
  bundle: {
    label: "Bundle Track",
    sources: [
      // Phase 2: combine 03-TRACK-BUNDLE/ + shared root PDFs
      // join(HOME, "Downloads/dev-journey-pro-and-bundle/03-TRACK-BUNDLE"),
    ],
    readme: null,
  },
};

const EXCLUDE_GLOBS = [
  ".DS_Store",
  "__MACOSX",
  "Thumbs.db",
];
const EXCLUDE_EXT = [".odt"];
const EXCLUDE_NAME_CONTAINS = ["hotmart"];

const OUT_DIR = join(REPO_ROOT, "dist-deliverables");

// ── CLI args ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const tierArg = (args.find((a) => a.startsWith("--tier=")) || "").split("=")[1];

// ── Logging ────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};
function log(msg) { process.stdout.write(msg + "\n"); }
function info(msg) { log(`${c.cyan}→${c.reset} ${msg}`); }
function ok(msg) { log(`${c.green}✓${c.reset} ${msg}`); }
function warn(msg) { log(`${c.yellow}⚠${c.reset} ${msg}`); }
function err(msg) { log(`${c.red}✗${c.reset} ${msg}`); }

// ── Helpers ────────────────────────────────────────────────────
function shouldExclude(absPath) {
  const name = basename(absPath);
  if (EXCLUDE_GLOBS.includes(name)) return true;
  if (EXCLUDE_EXT.some((ext) => name.toLowerCase().endsWith(ext))) return true;
  if (EXCLUDE_NAME_CONTAINS.some((needle) => name.toLowerCase().includes(needle))) return true;
  return false;
}

function cleanTree(rootPath) {
  let removed = 0;
  function walk(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch (_) { return; }
    for (const entry of entries) {
      const full = join(dir, entry);
      let st;
      try { st = statSync(full); } catch (_) { continue; }
      if (shouldExclude(full)) {
        rmSync(full, { recursive: true, force: true });
        removed++;
        continue;
      }
      if (st.isDirectory()) walk(full);
    }
  }
  walk(rootPath);
  return removed;
}

function fileCount(rootPath) {
  let count = 0;
  function walk(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch (_) { return; }
    for (const entry of entries) {
      const full = join(dir, entry);
      let st;
      try { st = statSync(full); } catch (_) { continue; }
      if (st.isDirectory()) walk(full);
      else count++;
    }
  }
  walk(rootPath);
  return count;
}

function packageTier(tierKey) {
  const tier = TIERS[tierKey];
  if (!tier) {
    err(`Unknown tier: ${tierKey}`);
    return false;
  }

  const validSources = tier.sources.filter((s) => existsSync(s));
  if (validSources.length === 0) {
    warn(`Skipping ${tierKey}: no source folders configured or accessible.`);
    return false;
  }

  info(`Packaging ${c.yellow}${tierKey}${c.reset} (${tier.label})`);

  const zipPath = join(OUT_DIR, `devjourney-${tierKey}.zip`);
  const stagingRoot = join(OUT_DIR, `_staging_${tierKey}`);

  if (dryRun) {
    log(`  ${c.dim}sources:${c.reset}`);
    validSources.forEach((s) => log(`    - ${s}`));
    log(`  ${c.dim}target:${c.reset} ${zipPath}`);
    return true;
  }

  // Reset staging
  rmSync(stagingRoot, { recursive: true, force: true });
  mkdirSync(stagingRoot, { recursive: true });

  // Copy each source under a folder named after its basename
  for (const src of validSources) {
    const dst = join(stagingRoot, `devjourney-${tierKey}`);
    mkdirSync(dst, { recursive: true });
    cpSync(src, dst, { recursive: true });
  }

  // Clean junk
  const removed = cleanTree(stagingRoot);
  if (removed > 0) ok(`  removed ${removed} junk entries (.DS_Store, __MACOSX, .odt, hotmart-*)`);

  // Inject VOLYNX README
  if (tier.readme) {
    const readmePath = join(stagingRoot, `devjourney-${tierKey}`, "README.md");
    writeFileSync(readmePath, tier.readme, "utf8");
    ok(`  wrote VOLYNX README.md`);
  }

  // Count + size after cleanup
  const count = fileCount(stagingRoot);

  // Remove old ZIP, create new
  rmSync(zipPath, { force: true });

  const zipResult = spawnSync(
    "zip",
    ["-r", "-q", basename(zipPath), basename(stagingRoot)],
    { cwd: OUT_DIR, stdio: "inherit" }
  );

  if (zipResult.status !== 0) {
    err(`  zip failed (exit ${zipResult.status})`);
    return false;
  }

  // Move/rename: zip wrapped the staging dir, move into expected name
  // Actually we want the inner folder, so re-zip just the inner folder
  rmSync(zipPath, { force: true });
  spawnSync(
    "zip",
    ["-r", "-q", join("..", basename(zipPath)), `devjourney-${tierKey}`],
    { cwd: stagingRoot, stdio: "inherit" }
  );

  // Cleanup staging
  rmSync(stagingRoot, { recursive: true, force: true });

  const sz = statSync(zipPath).size;
  const mb = (sz / (1024 * 1024)).toFixed(2);
  ok(`  ${zipPath} — ${count} files, ${mb} MB`);
  return true;
}

// ── README templates (replace Hotmart-era copy) ────────────────
function socialReadme() {
  return `# Dev Journey — Social Sprint

Bem-vindo ao Dev Journey Social Sprint pela VOLYNX.

Este pacote contém:
- 00_START_HERE/ — guias de boas-vindas, requisitos, setup e regras de certificação
- 01_SOCIAL/ — Bloco 1 (HTML/CSS/JS), Bloco 2 (DOM/JSON), glossários e projetos starter
- 02_BRAND_ASSETS/ — arte oficial pra você usar nos seus projetos
- TEMPLATES/ — templates de README de projeto e entrega

## Como funciona

1. Comece pelo \`00_START_HERE/COMO-USAR-O-CURSO.pdf\`
2. Siga \`ROADMAP-MODULO-SOCIAL.md\`
3. Use o checklist em \`CHECKLIST-MODULO-SOCIAL.md\` (ou na área do aluno em https://volynx.world/dev-journey/checklist/)
4. Quando terminar, submeta o projeto pelo formulário online — a certificação é por revisão manual

## Suporte

- Área do aluno: https://volynx.world/dev-journey/student/
- Suporte: https://volynx.world/support/

## Próximos passos

Ao terminar o Social, você pode subir pra **Pro** (Bloco 3 — React App) ou **Bundle** (Blocos 4-5 + Arsenal Kit). Compare em https://volynx.world/dev-journey/#upgrade

---

VOLYNX • Building a Smarter Future
`;
}

// ── Run ────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });

const tiersToRun = tierArg ? [tierArg] : Object.keys(TIERS);
let okCount = 0;
let skipCount = 0;

for (const tier of tiersToRun) {
  const result = packageTier(tier);
  if (result) okCount++;
  else skipCount++;
}

log("");
if (dryRun) {
  ok(`Dry run complete. Would build ${okCount} tier(s).`);
} else {
  ok(`Done. ${okCount} ZIP(s) built, ${skipCount} skipped.`);
  if (okCount > 0) log(`${c.dim}  → ${OUT_DIR}${c.reset}`);
}
