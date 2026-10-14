import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const sourceDir = path.join(root, "apps/volynx-os/propertyflow-export/source");
const storageDir = path.join(root, "apps/volynx-os/storage/propertyflow");
// Stage the next release independently; never overwrite published buyer archives.
const manifestPath = path.join(storageDir, "propertyflow-v1.1.3-release-manifest.json");
const licensePath = path.join(root, "apps/volynx-os/content/propertyflow-docs/license.md");
const canonicalCatalogPath = path.join(root, "apps/volynx-os/content/propertyflow.ts");
const visualAssetsDir = path.join(root, "public/assets/propertyflow/visuals");
const checkOnly = process.argv.includes("--check");
const version = "1.1.3";
const auditBundleName = `propertyflow-complete-v${version}.zip`;

const templates = [
  ["classic-grid", "Classic Grid"], ["magazine", "Magazine"], ["compact-list", "Compact List"],
  ["gallery-hero", "Gallery Hero"], ["split-view", "Split View"], ["masonry", "Masonry"],
  ["editorial", "Editorial"], ["minimalist", "Minimalist"], ["card-stack", "Card Stack"],
  ["timeline", "Timeline"], ["map-first", "Map-First"], ["grouped", "Grouped"],
  ["story-mode", "Story Mode"], ["showroom", "Showroom"], ["catalog", "Catalog"]
];

const tiers = {
  starter: {
    label: "Starter", count: 3, attribution: true,
    rights: "Licensed for one organization. This tier does not grant agency delivery or white-label rights."
  },
  professional: {
    label: "Professional", count: 6, attribution: true,
    rights: "Licensed for one organization or one agency client delivery, according to LICENSE.md."
  },
  "white-label": {
    label: "White-Label", count: 15, attribution: false,
    rights: "Licensed for multiple client deliveries and removal of VOLYNX attribution, according to LICENSE.md."
  }
};

const imageSources = [
  ["casa-serra.webp", "public/propertyflow/demo/casa-serra.webp"],
  ["apartamento-autoral.webp", "public/propertyflow/demo/apartamento-autoral.webp"],
  ["refugio-arvores.webp", "public/propertyflow/demo/refugio-arvores.webp"]
];

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");
const archiveName = (tier) => `propertyflow-${tier}-v${version}.zip`;
const normalize = (value) => value.split(path.sep).join("/");

async function walk(directory, prefix = "") {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const relative = normalize(path.join(prefix, entry.name));
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute, relative));
    else files.push([relative, await readFile(absolute)]);
  }
  return files;
}

function readmeFor(tierId, tier, available) {
  const templateList = available.map((key) => `- ${templates.find(([candidate]) => candidate === key)?.[1]} (\`${key}\`)`).join("\n");
  return `# Property Flow ${tier.label} — static export

This is a complete standalone static property website. It does not need a VOLYNX login, Supabase, Stripe, a database or access to the hosted Property Flow dashboard.

## What is included

- Responsive bilingual property catalogue.
- Local brand, contact, property and photo configuration.
- Search, category and sale/rent filters.
- Accessible details dialog with actual listing photos, tailored highlights, location, facts and two Property Flow editorial art panels.
- WhatsApp and email contact actions.
- ${available.length} licensed templates for the ${tier.label} tier.
- Local validation, preview and production build scripts with no external runtime dependency.
- 30 web-ready Property Flow visuals in \`assets/propertyflow/visuals/\`; two are already integrated into the details dialog and the rest are available for customization.

${tier.rights}

## What opens after purchase

The hosted Property Flow workspace is the guided editing and publication path. This ZIP is the optional self-hosted source: \`npm run dev\` opens a working sample site with clearly fictional demo listings. Replace their content and photos before going live. On the public site, **View details** opens the selected property's actual gallery, description, optional verified highlights, location and facts in Property Flow's editorial panels. The decorative artwork in those panels does not depict the listed home. This ZIP does not synchronize with your hosted workspace.

## Start locally

Install Node.js 20 or newer, open this folder in a terminal and run:

\`\`\`bash
npm run validate
npm run dev
\`\`\`

Open http://127.0.0.1:4173. No \`npm install\` is required because this export uses only Node.js and browser standards.

## Add your brand and properties

1. Edit \`content/site.json\` with the company name, colors, contacts and default template.
2. Edit \`content/properties.json\` with the real catalogue.
3. Put optimized WebP or AVIF photos in \`images/\` and reference them with local paths.
4. Add verified, property-specific \`highlights\` where useful. The details dialog already uses two decorative assets; the remaining visual library can support custom editorial sections. None are a substitute for real property photos. See \`docs/VISUAL-ASSETS.md\`.
5. Run \`npm run validate\` after every content change.
6. Set \`template.showSelector\` to \`false\` before launch if visitors should not see the preview selector.

The full data shape is documented in [docs/CONTENT-CONTRACT.md](docs/CONTENT-CONTRACT.md).

## Build and publish

\`\`\`bash
npm run build
npm run preview
\`\`\`

Upload the generated \`dist/\` folder to any static host. See [docs/DEPLOY.md](docs/DEPLOY.md).

## Templates in this export

${templateList}

Changing the selected template never edits property data or photos. The browser selector is a preview convenience; the permanent default lives in \`content/site.json\`.

## Important scope

This export is intentionally static. There is no admin dashboard, authentication, lead database, CRM, hosted tenant connection or automatic synchronization. Read [docs/EXPORT-SCOPE.md](docs/EXPORT-SCOPE.md) before deploying.

## Attribution

${tier.attribution ? "VOLYNX Property Flow attribution must remain visible under this tier." : "White-Label may remove VOLYNX attribution by keeping `brand.showPoweredBy` set to `false`."}

The commercial terms in [LICENSE.md](LICENSE.md) apply to this source export.
`;
}

async function sourceEntriesForTier(tierId) {
  const tier = tiers[tierId];
  const available = templates.slice(0, tier.count).map(([key]) => key);
  const entries = [];
  for (const [relative, buffer] of await walk(sourceDir)) {
    if (relative === "content/site.json") {
      const site = buffer.toString("utf8")
        .replace("__EXPORT_VERSION__", version)
        .replace("__TIER__", tierId)
        .replace("__SHOW_POWERED_BY__", String(tier.attribution))
        .replace("__AVAILABLE_TEMPLATES__", JSON.stringify(available));
      entries.push([relative, Buffer.from(site)]);
    } else {
      entries.push([relative, buffer]);
    }
  }
  const visualAssets = await walk(visualAssetsDir);
  if (visualAssets.length !== 30) throw new Error(`Expected 30 Property Flow visuals, found ${visualAssets.length}`);
  for (const [relative, buffer] of visualAssets) entries.push([`assets/propertyflow/visuals/${relative}`, buffer]);
  for (const [filename, relative] of imageSources) entries.push([`images/${filename}`, await readFile(path.join(root, relative))]);
  entries.push(["LICENSE.md", await readFile(licensePath)]);
  entries.push(["README.md", Buffer.from(readmeFor(tierId, tier, available))]);
  entries.push(["package.json", Buffer.from(`${JSON.stringify({
    name: `propertyflow-${tierId}`,
    version,
    private: true,
    type: "module",
    scripts: {
      validate: "node scripts/validate.mjs",
      dev: "node scripts/serve.mjs",
      build: "node scripts/build.mjs",
      preview: "node scripts/serve.mjs --dist"
    },
    engines: { node: ">=20" }
  }, null, 2)}\n`)]);
  entries.push(["EXPORT-MANIFEST.json", Buffer.from(`${JSON.stringify({
    product: "Property Flow",
    version,
    tier: tierId,
    tierLabel: tier.label,
    templates: available,
    dataMode: "local-static-json",
    runtimeDependencies: [],
    includesHostedCustomerData: false,
    includesPrivateCredentials: false
  }, null, 2)}\n`)]);
  return { entries, available };
}

async function zipEntries(entries) {
  const zip = new JSZip();
  for (const [relative, buffer] of entries) zip.file(relative, buffer, { date: new Date("2026-09-16T00:00:00.000Z") });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 }, platform: "UNIX" });
}

async function assertCatalogParity() {
  const canonical = await readFile(canonicalCatalogPath, "utf8");
  const missing = templates.filter(([key, name]) => !canonical.includes(`key: "${key}"`) || !canonical.includes(`name: "${name}"`));
  if (missing.length) throw new Error(`Export template catalogue drift: ${missing.map(([key]) => key).join(", ")}`);
}

async function inspectArchive(tierId, buffer) {
  const tier = tiers[tierId];
  const expectedTemplates = templates.slice(0, tier.count).map(([key]) => key);
  const zip = await JSZip.loadAsync(buffer);
  const required = ["index.html", "assets/app.js", "assets/styles.css", "content/site.json", "content/properties.json", "scripts/validate.mjs", "scripts/build.mjs", "scripts/serve.mjs", "docs/VISUAL-ASSETS.md", "README.md", "LICENSE.md", "EXPORT-MANIFEST.json", ...imageSources.map(([name]) => `images/${name}`)];
  const missing = required.filter((entry) => !zip.file(entry));
  if (missing.length) throw new Error(`${tierId} archive missing: ${missing.join(", ")}`);
  const names = Object.keys(zip.files);
  const forbidden = names.filter((name) => /(^|\/)(\.env|supabase|stripe|node_modules)(\/|$)/i.test(name));
  if (forbidden.length) throw new Error(`${tierId} archive contains private/runtime paths: ${forbidden.join(", ")}`);
  const site = JSON.parse(await zip.file("content/site.json").async("string"));
  if (site.tier !== tierId || site.exportVersion !== version || JSON.stringify(site.template.available) !== JSON.stringify(expectedTemplates)) throw new Error(`${tierId} tier/template/version contract mismatch`);
  if (names.filter((name) => name.startsWith("assets/propertyflow/visuals/") && name.endsWith(".webp")).length !== 30) throw new Error(`${tierId} archive must contain exactly 30 visual assets`);
  const textNames = names.filter((name) => /\.(html|js|css|json|md)$/i.test(name));
  for (const name of textNames) {
    const value = await zip.file(name)?.async("string");
    if (/sk_live_|service_role|SUPABASE_SERVICE_ROLE|STRIPE_SECRET/i.test(value || "")) throw new Error(`${tierId} archive may contain a secret in ${name}`);
  }
  return { entries: names.filter((name) => !zip.files[name].dir).length, templates: expectedTemplates.length };
}

async function verifyExisting() {
  await assertCatalogParity();
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  for (const tierId of Object.keys(tiers)) {
    const filename = archiveName(tierId);
    const buffer = await readFile(path.join(storageDir, filename));
    const inspected = await inspectArchive(tierId, buffer);
    const expectedHash = manifest.tiers?.[tierId]?.sha256;
    if (!expectedHash || expectedHash !== sha256(buffer)) throw new Error(`${filename} checksum does not match manifest`);
    console.log(`${filename}: ${buffer.length} bytes, ${inspected.entries} files, ${inspected.templates} templates, checksum verified.`);
  }
  const complete = await readFile(path.join(storageDir, auditBundleName));
  if (manifest.sourceBytes !== complete.length || manifest.sourceSha256 !== sha256(complete)) throw new Error("Complete audit bundle does not match manifest");
  const completeZip = await JSZip.loadAsync(complete);
  for (const tierId of Object.keys(tiers)) {
    if (!completeZip.file(`archives/${archiveName(tierId)}`)) throw new Error(`Complete audit bundle missing ${tierId}`);
  }
  console.log(`${auditBundleName}: ${complete.length} bytes, audit bundle verified.`);
}

async function generate() {
  await assertCatalogParity();
  await mkdir(storageDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const tierOutput = {};
  const archiveBuffers = {};
  for (const tierId of Object.keys(tiers)) {
    const { entries } = await sourceEntriesForTier(tierId);
    const buffer = await zipEntries(entries);
    await inspectArchive(tierId, buffer);
    const filename = archiveName(tierId);
    await writeFile(path.join(storageDir, filename), buffer);
    archiveBuffers[tierId] = buffer;
    tierOutput[tierId] = {
      label: tiers[tierId].label,
      filename,
      delivery: "/api/downloads/propertyflow",
      bytes: buffer.length,
      sha256: sha256(buffer),
      templates: tiers[tierId].count
    };
    console.log(`Generated ${filename} (${buffer.length} bytes).`);
  }

  const publicManifest = { product: "propertyflow", version, generatedAt, status: "staged-not-published", source: auditBundleName, sourceBytes: 0, sourceSha256: "", tiers: tierOutput };
  const complete = new JSZip();
  complete.file("README.md", `# Property Flow export audit bundle\n\nGenerated ${generatedAt}. Contains the three autonomous static tier archives and their public delivery manifest. This bundle is for release auditing; buyers receive only the archive licensed for their tier.\n`);
  for (const [tierId, buffer] of Object.entries(archiveBuffers)) complete.file(`archives/${archiveName(tierId)}`, buffer, { date: new Date("2026-09-16T00:00:00.000Z") });
  complete.file("manifest.json", JSON.stringify({
    ...publicManifest,
    sourceBytes: null,
    sourceSha256: null,
    note: "The enclosing audit bundle checksum is recorded in the public release manifest after this archive is generated."
  }, null, 2));
  const completeBuffer = await complete.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 }, platform: "UNIX" });
  publicManifest.sourceBytes = completeBuffer.length;
  publicManifest.sourceSha256 = sha256(completeBuffer);
  await writeFile(path.join(storageDir, auditBundleName), completeBuffer);
  await writeFile(manifestPath, `${JSON.stringify(publicManifest, null, 2)}\n`);
  console.log(`Generated ${auditBundleName} (${completeBuffer.length} bytes).`);
}

if (checkOnly) await verifyExisting();
else {
  await generate();
  await verifyExisting();
}
