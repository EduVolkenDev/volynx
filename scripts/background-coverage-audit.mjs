import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const atmosphereFile = path.join(root, "src/components/PageAtmosphere.astro");
const layoutFiles = ["BaseLayout.astro", "FlagshipLayout.astro", "LegalLayout.astro"];
const errors = [];

function walk(directory, matcher) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute, matcher) : matcher(absolute) ? [absolute] : [];
  });
}

function routeForHtml(file) {
  const relative = path.relative(distDir, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  if (relative === "404.html") return "/404/";
  return `/${relative.replace(/index\.html$/, "").replace(/\.html$/, "/")}`.replace(/\/{2,}/g, "/");
}

const atmosphereSource = fs.readFileSync(atmosphereFile, "utf8");
const curatedEntries = [...atmosphereSource.matchAll(/"(\/[^"]+\/)":\s*\{\s*image:\s*"([^"]+)"/g)]
  .map((match) => ({ route: match[1], image: match[2] }));

const imageOwners = new Map();
for (const entry of curatedEntries) {
  const assetPath = path.join(root, "public", entry.image.replace(/^\//, ""));
  if (!fs.existsSync(assetPath)) errors.push(`${entry.route} references missing asset ${entry.image}`);
  const owner = imageOwners.get(entry.image);
  if (owner) errors.push(`${entry.route} repeats ${entry.image}, already assigned to ${owner}`);
  imageOwners.set(entry.image, entry.route);
}

for (const layoutName of layoutFiles) {
  const source = fs.readFileSync(path.join(root, "src/layouts", layoutName), "utf8");
  if (!source.includes("PageAtmosphere") || !source.includes("<PageAtmosphere")) {
    errors.push(`${layoutName} does not render PageAtmosphere`);
  }
}

if (!fs.existsSync(distDir)) {
  errors.push("dist is missing; run npm run build before backgrounds:check");
}

const backgroundProofs = [
  "data-page-atmosphere=",
  "class=\"lab-bg",
  "class=\"galaxyfield",
  "class=\"cyber-grid",
  "class=\"ambient",
  "class=\"holo-bg",
  "class=\"page-bg",
  "class=\"wmp-bg",
  "class=\"manifesto-backdrop",
  "class=\"world-webgl",
  "class=\"hero-bg",
  "data-page-background=",
];

const htmlFiles = walk(distDir, (file) => file.endsWith(".html"));
let redirects = 0;
let visualPages = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const route = routeForHtml(file);
  if (route.startsWith("/assets/")) continue;
  const redirect = /<meta[^>]+http-equiv=["']refresh["']/i.test(html)
    || /window\.location\.(?:replace|href)/.test(html);
  if (redirect) {
    redirects += 1;
    continue;
  }
  visualPages += 1;
  if (!backgroundProofs.some((proof) => html.includes(proof))) {
    errors.push(`${route} has no auditable page-background marker`);
  }
}

if (errors.length) {
  console.error(`Background audit failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Background audit passed: ${visualPages} visual pages, ${redirects} redirects, ${curatedEntries.length} unique curated assets.`);
}
