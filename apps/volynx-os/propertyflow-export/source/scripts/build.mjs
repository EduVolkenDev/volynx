import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const dist = path.join(root, "dist");
const validation = spawnSync(process.execPath, [path.join(root, "scripts/validate.mjs")], { cwd: root, stdio: "inherit" });
if (validation.status !== 0) process.exit(validation.status || 1);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const entry of ["index.html", "assets", "content", "images"]) {
  await cp(path.join(root, entry), path.join(dist, entry), { recursive: true });
}

const site = JSON.parse(await readFile(path.join(root, "content/site.json"), "utf8"));
await writeFile(path.join(dist, "export-meta.json"), `${JSON.stringify({ product: "Property Flow", version: site.exportVersion, tier: site.tier, generatedBy: "VOLYNX static export" }, null, 2)}\n`);
console.log(`Static site built at ${dist}`);
