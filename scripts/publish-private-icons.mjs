#!/usr/bin/env node
/**
 * Upload private Icon Vault deliverables to Supabase Storage.
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   ICONS_DELIVERY_VERSION=v1.0.0
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const VERSION = process.env.ICONS_DELIVERY_VERSION || "v1.0.0";
const OUT_ROOT = path.join(REPO_ROOT, "storage/icons-store");
const VERSION_ROOT = path.join(OUT_ROOT, VERSION);
const MANIFEST_PATH = path.join(VERSION_ROOT, "manifest.json");
const BUCKET = "icons";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function contentType(filePath) {
  if (filePath.endsWith(".zip")) return "application/zip";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}

async function ensureBucket() {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw listErr;
  const existing = buckets?.find((bucket) => bucket.id === BUCKET || bucket.name === BUCKET);
  if (existing) {
    if (existing.public) {
      const { error } = await supabase.storage.updateBucket(BUCKET, { public: false });
      if (error) throw error;
    }
    return;
  }
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 1024 * 1024 * 1024,
  });
  if (error) throw error;
}

async function uploadObject(objectPath, diskPath) {
  const bytes = await fs.readFile(diskPath);
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, bytes, {
    upsert: true,
    contentType: contentType(diskPath),
    cacheControl: "private, max-age=31536000, immutable",
  });
  if (error) throw new Error(`${objectPath}: ${error.message}`);
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  const objects = [
    ...manifest.singles.map((item) => item.object_path),
    ...manifest.packs.map((item) => item.object_path),
    `${VERSION}/manifest.json`,
  ];

  await ensureBucket();

  let uploaded = 0;
  for (const objectPath of objects) {
    const diskPath = objectPath.endsWith("/manifest.json")
      ? MANIFEST_PATH
      : path.join(OUT_ROOT, objectPath);
    await uploadObject(objectPath, diskPath);
    uploaded++;
    if (uploaded % 50 === 0) console.log(`Uploaded ${uploaded}/${objects.length}`);
  }

  console.log(`Uploaded ${uploaded} private icon objects to bucket "${BUCKET}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
