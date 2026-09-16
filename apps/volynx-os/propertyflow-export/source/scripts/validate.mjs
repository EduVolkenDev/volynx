import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const tierTemplates = {
  starter: ["classic-grid", "magazine", "compact-list"],
  professional: ["classic-grid", "magazine", "compact-list", "gallery-hero", "split-view", "masonry"],
  "white-label": ["classic-grid", "magazine", "compact-list", "gallery-hero", "split-view", "masonry", "editorial", "minimalist", "card-stack", "timeline", "map-first", "grouped", "story-mode", "showroom", "catalog"]
};

const fail = (message) => { throw new Error(message); };
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const isLocalized = (value) => typeof value === "string" || (value && typeof value === "object" && (typeof value["pt-BR"] === "string" || typeof value.en === "string"));

const site = await readJson("content/site.json");
const properties = await readJson("content/properties.json");
const expected = tierTemplates[site.tier];

if (!expected) fail(`Unknown tier: ${site.tier}`);
if (site.schemaVersion !== 1) fail("content/site.json must use schemaVersion 1");
if (!site.brand?.name || !site.brand?.colors) fail("Brand name and colors are required");
if (!Array.isArray(site.template?.available) || JSON.stringify(site.template.available) !== JSON.stringify(expected)) {
  fail(`${site.tier} must expose exactly ${expected.length} licensed templates`);
}
if (!expected.includes(site.template.selected)) fail("Selected template is not licensed for this tier");
if (!Array.isArray(properties) || properties.length === 0) fail("At least one property is required");

const ids = new Set();
for (const [index, property] of properties.entries()) {
  if (!property.id || ids.has(property.id)) fail(`Property ${index + 1} has a missing or duplicate id`);
  ids.add(property.id);
  if (!isLocalized(property.title)) fail(`Property ${property.id} needs a title`);
  if (!property.category || !["sale", "rent"].includes(property.listingType)) fail(`Property ${property.id} needs category and listingType`);
  if (!property.location?.label) fail(`Property ${property.id} needs location.label`);
  if (!Array.isArray(property.images) || property.images.length === 0) fail(`Property ${property.id} needs at least one image`);
  for (const image of property.images) {
    if (!image.src || image.src.startsWith("http://") || image.src.startsWith("https://")) fail(`Property ${property.id} must use local image paths`);
    const imagePath = path.join(root, image.src.replace(/^\.\//, ""));
    await access(imagePath).catch(() => fail(`Missing image for ${property.id}: ${image.src}`));
  }
}

console.log(`Property Flow ${site.tier} validated: ${properties.length} properties, ${expected.length} templates.`);
