#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const manifestPath = resolve(root, "apps/volynx-os/public/downloads/propertyflow/manifest.json");
const contractPath = resolve(root, "supabase/functions/_shared/propertyflow-delivery.ts");
const consumers = [
  "supabase/functions/stripe-webhook/index.ts",
  "supabase/functions/refresh-pf-url/index.ts",
  "supabase/functions/regenerate-delivery-url/index.ts",
];

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const contract = await readFile(contractPath, "utf8");
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

expect(manifest.version === "1.1.0", `Expected PropertyFlow manifest v1.1.0, found ${manifest.version || "missing"}.`);
expect(contract.includes('PROPERTYFLOW_VERSION = "v1.1.0"'), "Shared contract version does not match the manifest.");
expect(contract.includes('PROPERTYFLOW_BUCKET = "propertyflow"'), "Shared contract must use the private propertyflow bucket.");

const tierContracts = [
  ["starter", "pf_starter"],
  ["professional", "pf_professional"],
  ["white-label", "pf_white_label"],
];

for (const [tier, addonId] of tierContracts) {
  const item = manifest.tiers?.[tier];
  expect(Boolean(item), `Manifest is missing ${tier}.`);
  if (!item) continue;

  const localPath = resolve(root, "apps/volynx-os/storage/propertyflow", item.filename);
  const expectedObjectPath = `${addonId}/v${manifest.version}.zip`;

  try {
    const localBytes = await readFile(localPath);
    const localSha256 = createHash("sha256").update(localBytes).digest("hex");
    expect(localBytes.length === item.bytes, `${tier}: local byte count differs from manifest.`);
    expect(localSha256 === item.sha256, `${tier}: local SHA-256 differs from manifest.`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  expect(contract.includes(`addonId: "${addonId}"`), `${tier}: addon ID missing from shared contract.`);
  expect(contract.includes(`filename: "${item.filename}"`), `${tier}: filename differs from shared contract.`);
  expect(contract.includes(`objectPath: "${expectedObjectPath}"`), `${tier}: object path differs from shared contract.`);
  expect(contract.includes(`bytes: ${item.bytes}`), `${tier}: byte count differs from shared contract.`);
  expect(contract.includes(`sha256: "${item.sha256}"`), `${tier}: SHA-256 differs from shared contract.`);
  expect(contract.includes(`templates: ${item.templates}`), `${tier}: template allowance differs from shared contract.`);
}

for (const relative of consumers) {
  const source = await readFile(resolve(root, relative), "utf8");
  expect(source.includes('from "../_shared/propertyflow-delivery.ts"'), `${relative} does not use the shared PropertyFlow delivery contract.`);
  expect(!source.includes("propertyflow-starter-v1.0.0.zip"), `${relative} still references the retired Starter v1.0.0 ZIP.`);
  expect(!source.includes("propertyflow-professional-v1.0.0.zip"), `${relative} still references the retired Professional v1.0.0 ZIP.`);
  expect(!source.includes("propertyflow-white-label-v1.0.0.zip"), `${relative} still references the retired White-Label v1.0.0 ZIP.`);
}

if (failures.length) {
  console.error(`PropertyFlow delivery check failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PropertyFlow delivery contract verified:");
for (const [tier, addonId] of tierContracts) {
  const item = manifest.tiers[tier];
  console.log(`- ${addonId}/v${manifest.version}.zip · ${item.bytes} bytes · ${item.sha256}`);
}
