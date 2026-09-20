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

const ownBackgroundProofs = [
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
const renderedImageOwners = new Map();
let redirects = 0;
let visualPages = 0;
let atmospherePages = 0;
let ownBackgroundPages = 0;
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
  const atmosphereTag = html.match(/<div[^>]+class=\"route-atmosphere\"[^>]*>/)?.[0] || "";
  const renderedImage = atmosphereTag.match(/--vx-atm-image:url\(&#34;([^&]+)&#34;\)/)?.[1] || "";
  const renderedOpacity = Number(atmosphereTag.match(/--vx-atm-image-opacity:([^;\"]+)/)?.[1] || 0);
  const hasAtmosphereImage = Boolean(renderedImage) && renderedOpacity > 0;
  const hasOwnBackground = ownBackgroundProofs.some((proof) => html.includes(proof));
  if (hasAtmosphereImage) {
    atmospherePages += 1;
    const owner = renderedImageOwners.get(renderedImage);
    if (owner) errors.push(`${route} renders ${renderedImage}, already rendered by ${owner}`);
    renderedImageOwners.set(renderedImage, route);
  }
  if (hasOwnBackground) ownBackgroundPages += 1;
  if (!hasAtmosphereImage && !hasOwnBackground) {
    errors.push(`${route} has only a generic atmosphere; assign a route image or an auditable page-owned background`);
  }
}

if (errors.length) {
  console.error(`Background audit failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Background audit passed: ${visualPages} visual pages, ${redirects} redirects, ${atmospherePages} route images, ${ownBackgroundPages} page-owned backgrounds, ${curatedEntries.length} unique curated assets.`);
}
