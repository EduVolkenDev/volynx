#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DEVJOURNEY_DELIVERABLES } from "../src/data/devjourney-deliverables.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DIST_DIR = join(REPO_ROOT, "dist-deliverables");
const PUBLIC_DIR = join(REPO_ROOT, "public", "downloads", "devjourney");

const manifest = {
  generated_at: new Date().toISOString(),
  files: [],
};

mkdirSync(PUBLIC_DIR, { recursive: true });

for (const deliverable of DEVJOURNEY_DELIVERABLES) {
  const src = join(DIST_DIR, deliverable.fileName);
  const dest = join(PUBLIC_DIR, deliverable.fileName);

  if (!existsSync(src)) {
    throw new Error(`Missing ${deliverable.fileName} in dist-deliverables/. Run node scripts/package-devjourney.mjs first.`);
  }

  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);

  const stats = statSync(dest);
  manifest.files.push({
    tier: deliverable.tier,
    fileName: deliverable.fileName,
    href: deliverable.href,
    bytes: stats.size,
  });
}

writeFileSync(
  join(PUBLIC_DIR, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8"
);

process.stdout.write(`Published ${manifest.files.length} Dev Journey deliverable(s) to ${PUBLIC_DIR}\n`);
