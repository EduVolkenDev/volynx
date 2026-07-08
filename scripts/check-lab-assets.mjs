import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "public", "lab-assets.json");
const requiredPaths = [
  ["shared", "zip", "script"],
  ["converter", "zip", "script"],
  ["converter", "heic", "script"],
  ["imageScaler", "zip", "script"],
  ["qrGen", "renderer", "script"],
  ["auth", "realtimeFallback", "script"],
  ["imageSuite", "zip", "script"],
  ["imageSuite", "aiUpscale", "runtime", "tf"],
  ["imageSuite", "aiUpscale", "runtime", "modelDefinition"],
  ["imageSuite", "aiUpscale", "runtime", "upscaler"],
  ["imageSuite", "aiUpscale", "modelFiles", "model"],
  ["imageSuite", "aiUpscale", "modelFiles", "shard"],
  ["imageSuite", "backgroundRemoval", "runtime", "script"],
  ["imageSuite", "backgroundRemoval", "runtime", "wasm"],
  ["imageSuite", "backgroundRemoval", "runtime", "worker"],
  ["imageSuite", "backgroundRemoval", "runtime", "jsepWasm"],
  ["imageSuite", "backgroundRemoval", "runtime", "jsepWorker"],
  ["imageSuite", "backgroundRemoval", "modelFile"],
];

function get(value, path) {
  return path.reduce((current, key) => current?.[key], value);
}

function collectAssets(value, out = []) {
  if (!value || typeof value !== "object") return out;
  if (typeof value.url === "string") out.push(value);
  Object.keys(value).forEach((key) => collectAssets(value[key], out));
  return out;
}

function publicFilePath(publicPath) {
  return join(root, "public", publicPath.replace(/^\//, ""));
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const failures = [];

for (const path of requiredPaths) {
  const asset = get(manifest, path);
  if (!asset || typeof asset.url !== "string") {
    failures.push(`Missing manifest asset: ${path.join(".")}`);
  }
}

const assets = collectAssets(manifest);
for (const asset of assets) {
  if (!asset.url.startsWith("/")) {
    failures.push(`External Lab asset URL is not allowed: ${asset.url}`);
    continue;
  }

  const filePath = publicFilePath(asset.url);
  try {
    const [buffer, info] = await Promise.all([readFile(filePath), stat(filePath)]);
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    if (asset.bytes !== info.size) failures.push(`Byte mismatch for ${asset.url}: manifest=${asset.bytes} actual=${info.size}`);
    if (asset.sha256 !== sha256) failures.push(`SHA-256 mismatch for ${asset.url}`);
  } catch (error) {
    failures.push(`Missing Lab asset file ${asset.url}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(`Lab asset check failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Lab asset check passed: ${assets.length} local assets verified.`);
