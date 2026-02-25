import fs from "fs";
import path from "path";

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

// What matters for routing/architecture in Astro
const INCLUDE_DIRS = [
  "src/pages",
  "src/layouts",
  "src/components",
  "src/styles",
];

const INCLUDE_FILES = [
  "astro.config.mjs",
  "package.json",
  "tsconfig.json",
  ".aiignore",
  ".gitignore",
  "README.md",
];

// Limits
const MAX_FILE_CHARS = 10_000;     // per file
const MAX_TOTAL_CHARS = 120_000;   // total payload hard cap
const MAX_FILES = 120;

const IGNORE_DIRS = new Set([
  ".git", "node_modules", "dist", ".astro", "coverage",
  "_archive", "Archive", ".claude", "src/paragpt",
]);

function normRel(p) {
  return path.relative(ROOT, p).replaceAll("\\", "/");
}

function shouldIgnore(fullPath) {
  const rel = normRel(fullPath);

  for (const d of IGNORE_DIRS) {
    if (rel === d || rel.startsWith(d + "/") || rel.includes("/" + d + "/")) return true;
  }

  // Hard ignore common secrets by filename
  const base = path.basename(rel);
  if (base === ".env" || base.startsWith(".env.")) return true;
  if (base.endsWith(".key") || base.endsWith(".pem")) return true;
  if (base === ".DS_Store") return true;

  return false;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (shouldIgnore(full)) continue;
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile()) out.push(full);
  }
  return out;
}

function isTextFile(file) {
  return /\.(md|txt|json|yml|yaml|toml|js|mjs|ts|tsx|jsx|astro|css|scss|html)$/i.test(file);
}

function readTrimmed(file) {
  const content = fs.readFileSync(file, "utf8");
  if (content.length <= MAX_FILE_CHARS) return content;
  return content.slice(0, MAX_FILE_CHARS) + "\n/* ...trimmed... */\n";
}

// Collect
let files = [];
for (const d of INCLUDE_DIRS) files.push(...walk(path.join(ROOT, d)));
for (const f of INCLUDE_FILES) {
  const abs = path.join(ROOT, f);
  if (fs.existsSync(abs) && !shouldIgnore(abs)) files.push(abs);
}

files = files.filter(isTextFile);
files = Array.from(new Set(files)); // dedupe absolute paths

// Prioritize
const score = (rel) => {
  if (rel === "astro.config.mjs") return 0;
  if (rel === "package.json") return 1;
  if (rel.startsWith("src/pages/")) return 2;
  if (rel.startsWith("src/layouts/")) return 3;
  if (rel.startsWith("src/components/")) return 4;
  if (rel.startsWith("src/styles/")) return 5;
  return 9;
};

const mapped = files
  .map(abs => ({ abs, rel: normRel(abs) }))
  .sort((a, b) => score(a.rel) - score(b.rel) || a.rel.localeCompare(b.rel))
  .slice(0, MAX_FILES);

const out = { root: ROOT, focus: "astro-architecture", files: [] };

let total = 0;
for (const f of mapped) {
  const content = readTrimmed(f.abs);
  if (total + content.length > MAX_TOTAL_CHARS) break;
  total += content.length;
  out.files.push({ path: f.rel, content });
}

process.stdout.write(JSON.stringify(out));