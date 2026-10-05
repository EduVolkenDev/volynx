#!/usr/bin/env node

/**
 * Regenerates the visual assets used by the Property Flow description cards.
 *
 * The script is intentionally self-contained: it uses Node's native fetch,
 * does not store a key in the repository, and writes only the five named
 * assets consumed by the Parisnez renderer.
 *
 * Usage:
 *   OPENAI_API_KEY=... node scripts/generate-propertyflow-description-assets.mjs
 *   node scripts/generate-propertyflow-description-assets.mjs --dry-run
 *   node scripts/generate-propertyflow-description-assets.mjs --out /path/to/description
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultOutputDir = resolve(scriptDir, '../../parisnez/assets/propertyflow/description');
const apiUrl = 'https://api.openai.com/v1/images/generations';
const model = process.env.PROPERTYFLOW_IMAGE_MODEL || 'gpt-image-1';

const visualDirection = [
  'luxury real-estate editorial art direction',
  'black and charcoal marble with elegant natural white and warm-gold veining',
  'brushed champagne gold accents, smoked glass, controlled violet reflections',
  'cinematic studio lighting, premium architectural visualization, tactile materials',
  'sophisticated, restrained, spacious composition with a clear focal object',
  'no text, no letters, no logo, no watermark, no people, no emoji, no UI, no border',
  'wide landscape composition with generous negative space on the left for overlay copy',
].join(', ');

const assets = [
  {
    filename: 'lifestyle-hero.webp',
    prompt: `${visualDirection}. Create an abstract lifestyle scene: a sculptural infinity pool, a calm sunlit terrace, and a refined tropical leaf silhouette emerging from a black marble plinth. The scene should communicate leisure, comfort, privacy, and quiet luxury without looking like a stock photograph.`,
  },
  {
    filename: 'structure-hero.webp',
    prompt: `${visualDirection}. Create an abstract architectural scene: a contemporary residence with strong geometric volumes, a monumental doorway, precise linear details, and a black marble slab grounding the composition. Emphasize structure, construction quality, space, and permanence.`,
  },
  {
    filename: 'transaction-hero.webp',
    prompt: `${visualDirection}. Create an abstract real-estate transaction still life: a polished architectural key and a minimal folded document resting on veined black marble, with a subtle champagne-gold reflection. Make it confident and discreet, never literal or corporate.`,
  },
  {
    filename: 'location-hero.webp',
    prompt: `${visualDirection}. Create an abstract sense-of-place composition: elegant topographic contour lines and a single refined location marker emerging from layered black marble, with a distant horizon glow and subtle gold highlights. Communicate access, setting, and exclusivity.`,
  },
  {
    filename: 'community-hero.webp',
    prompt: `${visualDirection}. Create an abstract gated-community scene: a circular courtyard, a sculptural entrance, soft architectural lighting, and layered black marble planes with champagne-gold edges. Communicate security, belonging, landscape, and high standards.`,
  },
];

function readFlag(name) {
  return process.argv.includes(name);
}

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function findWebpEncoder() {
  for (const binary of ['cwebp', 'magick', 'convert']) {
    try {
      execFileSync(binary, ['-version'], { stdio: 'ignore' });
      return binary;
    } catch {
      // Try the next installed encoder.
    }
  }
  return null;
}

function encodeWebp(inputPath, outputPath, encoder) {
  if (encoder === 'cwebp') {
    execFileSync(encoder, ['-quiet', '-q', '88', inputPath, '-o', outputPath], { stdio: 'inherit' });
    return;
  }
  execFileSync(encoder, [inputPath, '-quality', '88', outputPath], { stdio: 'inherit' });
}

async function generatePng(prompt, apiKey) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      size: '1536x1024',
      quality: 'high',
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const detail = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Image generation failed: ${detail}`);
  }

  const image = payload?.data?.[0];
  if (image?.b64_json) return Buffer.from(image.b64_json, 'base64');
  if (image?.url) {
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) throw new Error(`Generated image download failed: HTTP ${imageResponse.status}`);
    return Buffer.from(await imageResponse.arrayBuffer());
  }
  throw new Error('Image generation returned neither b64_json nor an image URL.');
}

async function main() {
  const outputDir = resolve(readOption('--out', process.env.PROPERTYFLOW_ASSET_DIR || defaultOutputDir));
  const dryRun = readFlag('--dry-run');
  const force = readFlag('--force') || readFlag('--overwrite');
  const encoder = dryRun ? null : findWebpEncoder();

  console.log(`Output: ${outputDir}`);
  console.log(`Model: ${model}`);
  console.log(`Assets: ${assets.length}`);

  for (const asset of assets) {
    console.log(`- ${asset.filename}`);
    if (!dryRun && !force) {
      try {
        readFileSync(join(outputDir, asset.filename));
        throw new Error(`already exists; use --force to replace it: ${asset.filename}`);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
  }

  if (dryRun) {
    console.log('Dry run complete. No API request or file write was performed.');
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required. Use --dry-run to inspect the plan without a key.');
  if (!encoder) throw new Error('No WebP encoder found. Install cwebp or ImageMagick, then retry.');

  mkdirSync(outputDir, { recursive: true });
  const temporaryDir = mkdtempSync(join(tmpdir(), 'propertyflow-description-'));

  try {
    for (const asset of assets) {
      console.log(`Generating ${asset.filename}...`);
      const pngPath = join(temporaryDir, asset.filename.replace(/\.webp$/i, '.png'));
      const webpPath = join(outputDir, asset.filename);
      const png = await generatePng(asset.prompt, apiKey);
      writeFileSync(pngPath, png);
      encodeWebp(pngPath, webpPath, encoder);
      console.log(`  wrote ${webpPath}`);
    }
  } finally {
    rmSync(temporaryDir, { recursive: true, force: true });
  }

  console.log('Property Flow description assets regenerated successfully.');
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
