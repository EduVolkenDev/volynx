import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modelSource = join(root, "node_modules", "@upscalerjs", "esrgan-slim");
const upscalerSource = join(root, "node_modules", "upscaler");
const tfSource = join(root, "node_modules", "@tensorflow", "tfjs");
const jszipSource = join(root, "node_modules", "jszip");
const heic2anySource = join(root, "node_modules", "heic2any");
const ortSource = join(root, "node_modules", "onnxruntime-web");
const qrCodeStylingSource = join(root, "node_modules", "qr-code-styling");
const supabaseSource = join(root, "node_modules", "@supabase", "supabase-js");
const modelTarget = join(root, "public", "models", "esrgan-slim-1.0.0-x2");
const runtimeTarget = join(root, "public", "vendor", "upscaler-1.0.0-tfjs-4.11.0");
const jszipTarget = join(root, "public", "vendor", "jszip-3.10.1");
const heic2anyTarget = join(root, "public", "vendor", "heic2any-0.0.4");
const ortTarget = join(root, "public", "vendor", "onnxruntime-web-1.21.0");
const qrCodeStylingTarget = join(root, "public", "vendor", "qr-code-styling-1.9.2");
const supabaseTarget = join(root, "public", "vendor", "supabase-js-2.101.1");
const manifestTarget = join(root, "public", "lab-assets.json");

await Promise.all([
  mkdir(modelTarget, { recursive: true }),
  mkdir(runtimeTarget, { recursive: true }),
  mkdir(jszipTarget, { recursive: true }),
  mkdir(heic2anyTarget, { recursive: true }),
  mkdir(ortTarget, { recursive: true }),
  mkdir(qrCodeStylingTarget, { recursive: true }),
  mkdir(supabaseTarget, { recursive: true }),
]);
await Promise.all([
  copyFile(join(modelSource, "models", "x2", "model.json"), join(modelTarget, "model.json")),
  copyFile(join(modelSource, "models", "x2", "group1-shard1of1.bin"), join(modelTarget, "group1-shard1of1.bin")),
  copyFile(join(modelSource, "LICENSE"), join(modelTarget, "LICENSE.txt")),
  copyFile(join(tfSource, "dist", "tf.min.js"), join(runtimeTarget, "tf.min.js")),
  copyFile(
    join(modelSource, "dist", "umd", "models", "esrgan-slim", "src", "x2", "index.min.js"),
    join(runtimeTarget, "esrgan-slim-2x.min.js")
  ),
  copyFile(
    join(upscalerSource, "dist", "browser", "umd", "upscaler.min.js"),
    join(runtimeTarget, "upscaler.min.js")
  ),
  copyFile(join(upscalerSource, "LICENSE"), join(runtimeTarget, "UPSCALER-LICENSE.txt")),
  copyFile(join(jszipSource, "dist", "jszip.min.js"), join(jszipTarget, "jszip.min.js")),
  copyFile(join(jszipSource, "LICENSE.markdown"), join(jszipTarget, "LICENSE.txt")),
  copyFile(join(heic2anySource, "dist", "heic2any.min.js"), join(heic2anyTarget, "heic2any.min.js")),
  copyFile(join(heic2anySource, "LICENSE.md"), join(heic2anyTarget, "LICENSE.txt")),
  copyFile(join(ortSource, "dist", "ort.min.js"), join(ortTarget, "ort.min.js")),
  copyFile(join(ortSource, "dist", "ort-wasm-simd-threaded.wasm"), join(ortTarget, "ort-wasm-simd-threaded.wasm")),
  copyFile(join(ortSource, "dist", "ort-wasm-simd-threaded.mjs"), join(ortTarget, "ort-wasm-simd-threaded.mjs")),
  copyFile(join(ortSource, "dist", "ort-wasm-simd-threaded.jsep.wasm"), join(ortTarget, "ort-wasm-simd-threaded.jsep.wasm")),
  copyFile(join(ortSource, "dist", "ort-wasm-simd-threaded.jsep.mjs"), join(ortTarget, "ort-wasm-simd-threaded.jsep.mjs")),
  copyFile(join(qrCodeStylingSource, "lib", "qr-code-styling.js"), join(qrCodeStylingTarget, "qr-code-styling.js")),
  copyFile(join(qrCodeStylingSource, "LICENSE"), join(qrCodeStylingTarget, "LICENSE.txt")),
  copyFile(join(supabaseSource, "dist", "umd", "supabase.js"), join(supabaseTarget, "supabase.js")),
]);

async function fileMeta(publicPath) {
  const filePath = join(root, "public", publicPath.replace(/^\//, ""));
  const [buffer, info] = await Promise.all([readFile(filePath), stat(filePath)]);
  return {
    url: publicPath,
    bytes: info.size,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

const manifest = {
  schema: 1,
  shared: {
    zip: {
      library: "jszip",
      version: "3.10.1",
      license: "MIT OR GPL-3.0-or-later",
      local: true,
      script: await fileMeta("/vendor/jszip-3.10.1/jszip.min.js"),
    },
  },
  converter: {
    zip: {
      local: true,
      script: await fileMeta("/vendor/jszip-3.10.1/jszip.min.js"),
    },
    heic: {
      library: "heic2any",
      version: "0.0.4",
      license: "MIT",
      local: true,
      script: await fileMeta("/vendor/heic2any-0.0.4/heic2any.min.js"),
    },
  },
  imageScaler: {
    zip: {
      local: true,
      script: await fileMeta("/vendor/jszip-3.10.1/jszip.min.js"),
    },
  },
  qrGen: {
    renderer: {
      library: "qr-code-styling",
      version: "1.9.2",
      license: "MIT",
      local: true,
      script: await fileMeta("/vendor/qr-code-styling-1.9.2/qr-code-styling.js"),
    },
  },
  auth: {
    realtimeFallback: {
      library: "@supabase/supabase-js",
      version: "2.101.1",
      license: "MIT",
      local: true,
      script: await fileMeta("/vendor/supabase-js-2.101.1/supabase.js"),
    },
  },
  imageSuite: {
    zip: {
      library: "jszip",
      version: "3.10.1",
      license: "MIT OR GPL-3.0-or-later",
      local: true,
      script: await fileMeta("/vendor/jszip-3.10.1/jszip.min.js"),
    },
    aiUpscale: {
      engine: "UpscalerJS",
      model: "ESRGAN Slim 2x",
      versions: {
        upscaler: "1.0.0",
        tensorflow: "4.11.0",
        esrganSlim: "1.0.0",
      },
      license: "Apache-2.0",
      local: true,
      runtime: {
        tf: await fileMeta("/vendor/upscaler-1.0.0-tfjs-4.11.0/tf.min.js"),
        modelDefinition: await fileMeta("/vendor/upscaler-1.0.0-tfjs-4.11.0/esrgan-slim-2x.min.js"),
        upscaler: await fileMeta("/vendor/upscaler-1.0.0-tfjs-4.11.0/upscaler.min.js"),
      },
      modelFiles: {
        model: await fileMeta("/models/esrgan-slim-1.0.0-x2/model.json"),
        shard: await fileMeta("/models/esrgan-slim-1.0.0-x2/group1-shard1of1.bin"),
      },
    },
    backgroundRemoval: {
      engine: "onnxruntime-web + U2NetP",
      model: "U2NetP",
      versions: {
        onnxruntimeWeb: "1.21.0",
      },
      license: "MIT runtime; U2NetP model asset",
      localModel: true,
      localRuntime: true,
      runtimeBase: "/vendor/onnxruntime-web-1.21.0/",
      runtime: {
        script: await fileMeta("/vendor/onnxruntime-web-1.21.0/ort.min.js"),
        wasm: await fileMeta("/vendor/onnxruntime-web-1.21.0/ort-wasm-simd-threaded.wasm"),
        worker: await fileMeta("/vendor/onnxruntime-web-1.21.0/ort-wasm-simd-threaded.mjs"),
        jsepWasm: await fileMeta("/vendor/onnxruntime-web-1.21.0/ort-wasm-simd-threaded.jsep.wasm"),
        jsepWorker: await fileMeta("/vendor/onnxruntime-web-1.21.0/ort-wasm-simd-threaded.jsep.mjs"),
      },
      modelFile: await fileMeta("/models/u2netp.onnx"),
    },
  },
};

await writeFile(manifestTarget, `${JSON.stringify(manifest, null, 2)}\n`);

console.log("Synced local Lab assets: JSZip, HEIC, UpscalerJS, ESRGAN Slim 2x, ONNX Runtime, QR renderer, Supabase fallback, and manifest.");
