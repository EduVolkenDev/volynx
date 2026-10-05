#!/usr/bin/env node
/**
 * Publish only the current Property Flow buyer archives to the private bucket.
 *
 * Required environment:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   PROPERTYFLOW_PUBLISH_DRY_RUN=1
 *
 * This script never deletes objects and never publishes the audit bundle.
 * Every uploaded archive is downloaded again and checked by byte count/SHA-256.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "apps/volynx-os/public/downloads/propertyflow/manifest.json");
const storageRoot = path.join(root, "apps/volynx-os/storage/propertyflow");
const bucket = "propertyflow";
const dryRun = process.env.PROPERTYFLOW_PUBLISH_DRY_RUN === "1" || process.argv.includes("--dry-run");
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const tierIds = { starter: "pf_starter", professional: "pf_professional", "white-label": "pf_white_label" };
const artifacts = Object.entries(manifest.tiers || {}).map(([tier, item]) => ({
  objectPath: `${tierIds[tier]}/v${manifest.version}.zip`,
  localPath: path.join(storageRoot, item.filename),
  bytes: item.bytes,
  sha256: item.sha256,
  filename: item.filename,
}));

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const supabase = !dryRun ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } }) : null;

if (supabase) {
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) throw bucketError;
  const targetBucket = buckets?.find((item) => item.id === bucket || item.name === bucket);
  if (!targetBucket) throw new Error(`Private bucket "${bucket}" was not found.`);
  if (targetBucket.public) throw new Error(`Refusing to publish: bucket "${bucket}" is public.`);
}

for (const artifact of artifacts) {
  const bytes = await readFile(artifact.localPath);
  if (bytes.length !== artifact.bytes || digest(bytes) !== artifact.sha256) {
    throw new Error(`${artifact.filename}: local manifest mismatch.`);
  }
  console.log(`${dryRun ? "Would publish" : "Publishing"} ${artifact.objectPath} (${bytes.length} bytes, ${artifact.sha256})`);
  if (dryRun) continue;
  const { error } = await supabase.storage.from(bucket).upload(artifact.objectPath, bytes, {
    upsert: true,
    contentType: "application/zip",
    cacheControl: "private, max-age=31536000, immutable",
  });
  if (error) throw new Error(`${artifact.objectPath}: ${error.message}`);
  const { data: remote, error: downloadError } = await supabase.storage.from(bucket).download(artifact.objectPath);
  if (downloadError) throw new Error(`${artifact.objectPath}: remote verification download failed: ${downloadError.message}`);
  const remoteBytes = Buffer.from(await remote.arrayBuffer());
  if (remoteBytes.length !== artifact.bytes || digest(remoteBytes) !== artifact.sha256) {
    throw new Error(`${artifact.objectPath}: remote bytes/SHA-256 mismatch.`);
  }
  console.log(`Verified ${artifact.objectPath}: ${remoteBytes.length} bytes, ${digest(remoteBytes)}`);
}

console.log(dryRun ? "Property Flow export publication dry-run passed." : `Property Flow v${manifest.version} private export publication and integrity verification passed.`);
