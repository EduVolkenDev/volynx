/**
 * Browser-side image policy for the Johnny / Parisnez property catalog.
 *
 * Originals must never be uploaded to Supabase Storage. This helper decodes
 * the selected image, removes metadata by drawing it to a canvas, resizes it
 * to the catalog limit, and emits a WebP derivative ready for upload.
 */

export const JOHNNY_PROPERTY_IMAGE_POLICY = {
  maxInputBytes: 20 * 1024 * 1024,
  maxOutputBytes: 3 * 1024 * 1024,
  maxLongEdge: 2400,
  initialQuality: 0.82,
  minimumQuality: 0.58,
  qualityStep: 0.06,
  maxResizePasses: 4,
  outputMimeType: "image/webp" as const,
};

export const DEFAULT_PROPERTY_FLOW_IMAGE_POLICY = JOHNNY_PROPERTY_IMAGE_POLICY;

const SUPPORTED_INPUT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export type JohnnyPropertyImageOptimizationOptions = Partial<
  Pick<
    typeof JOHNNY_PROPERTY_IMAGE_POLICY,
    | "maxInputBytes"
    | "maxOutputBytes"
    | "maxLongEdge"
    | "initialQuality"
    | "minimumQuality"
    | "qualityStep"
    | "maxResizePasses"
  >
>;

export type JohnnyPropertyImageUpload = {
  file: File;
  blob: Blob;
  contentHash: string | null;
  filename: string;
  mimeType: typeof JOHNNY_PROPERTY_IMAGE_POLICY.outputMimeType;
  sizeBytes: number;
  width: number;
  height: number;
  sourceBytes: number;
  sourceMimeType: string;
  quality: number;
  compressionRatio: number;
};

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
  release?: () => void;
};

function clampQuality(value: number): number {
  return Math.min(1, Math.max(0.1, value));
}

function outputDimensions(
  width: number,
  height: number,
  maxLongEdge: number,
  resizePass: number,
): { width: number; height: number } {
  const longestEdge = Math.max(width, height);
  const policyScale = longestEdge > maxLongEdge ? maxLongEdge / longestEdge : 1;
  const passScale = Math.pow(0.86, resizePass);
  const scale = Math.min(1, policyScale * passScale);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!canvas.width || !canvas.height) {
      reject(new Error("A imagem não possui dimensões válidas."));
      return;
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("O navegador não conseguiu gerar o WebP."));
          return;
        }

        if (blob.type !== JOHNNY_PROPERTY_IMAGE_POLICY.outputMimeType) {
          reject(new Error("Este navegador não oferece codificação WebP."));
          return;
        }

        resolve(blob);
      },
      JOHNNY_PROPERTY_IMAGE_POLICY.outputMimeType,
      clampQuality(quality),
    );
  });
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fall through to the Image decoder for browsers that reject an input
      // format or do not support the ImageBitmap orientation option.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  try {
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Não foi possível ler esta imagem.", { cause: error });
  }
}

function baseFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.[^/.]+$/, "");
  const normalized = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || "property-image";
}

async function sha256Hex(blob: Blob): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;

  const digest = await globalThis.crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Prepare one staff-selected image for the Johnny property bucket.
 * The returned File is the only file that should be uploaded.
 */
export async function optimizePropertyFlowImage(
  sourceFile: File,
  options: JohnnyPropertyImageOptimizationOptions = {},
): Promise<JohnnyPropertyImageUpload> {
  const policy = { ...JOHNNY_PROPERTY_IMAGE_POLICY, ...options };

  if (!sourceFile.type.startsWith("image/")) {
    throw new Error("Selecione uma imagem. Vídeos não pertencem à galeria de imóveis.");
  }

  if (sourceFile.size > policy.maxInputBytes) {
    throw new Error("A imagem original ultrapassa o limite de 20 MB.");
  }

  if (sourceFile.type && !SUPPORTED_INPUT_TYPES.has(sourceFile.type)) {
    throw new Error("Formato não suportado. Use JPEG, PNG, WebP ou AVIF.");
  }

  const decoded = await decodeImage(sourceFile);
  let blob: Blob | null = null;
  let width = 0;
  let height = 0;
  let selectedQuality = policy.initialQuality;

  try {
    for (let resizePass = 0; resizePass < policy.maxResizePasses; resizePass += 1) {
      const dimensions = outputDimensions(
        decoded.width,
        decoded.height,
        policy.maxLongEdge,
        resizePass,
      );
      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("O navegador não conseguiu preparar a imagem.");

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

      for (
        let quality = policy.initialQuality;
        quality >= policy.minimumQuality;
        quality -= policy.qualityStep
      ) {
        const candidate = await canvasToWebp(canvas, quality);
        blob = candidate;
        width = canvas.width;
        height = canvas.height;
        selectedQuality = quality;
        if (candidate.size <= policy.maxOutputBytes) break;
      }

      if (blob && blob.size <= policy.maxOutputBytes) break;
    }
  } finally {
    decoded.close?.();
    decoded.release?.();
  }

  if (!blob || blob.size > policy.maxOutputBytes) {
    throw new Error("Não foi possível reduzir a imagem para menos de 3 MB.");
  }

  const filename = `${baseFilename(sourceFile.name)}.webp`;
  const file = new File([blob], filename, {
    type: policy.outputMimeType,
    lastModified: Date.now(),
  });

  return {
    file,
    blob,
    contentHash: await sha256Hex(blob),
    filename,
    mimeType: policy.outputMimeType,
    sizeBytes: blob.size,
    width,
    height,
    sourceBytes: sourceFile.size,
    sourceMimeType: sourceFile.type || "application/octet-stream",
    quality: clampQuality(selectedQuality),
    compressionRatio: sourceFile.size ? blob.size / sourceFile.size : 1,
  };
}

/**
 * Deterministic storage path. The content hash prevents duplicate object
 * names while the first three segments preserve the storage RLS convention.
 */
export function buildPropertyFlowImagePath({
  organizationId,
  siteId,
  propertyId,
  contentHash,
}: {
  organizationId: string;
  siteId: string;
  propertyId: string;
  contentHash: string;
}): string {
  if (!/^[a-f0-9]{64}$/i.test(contentHash)) {
    throw new Error("Hash de imagem inválido.");
  }

  return `${organizationId}/${siteId}/${propertyId}/${contentHash.toLowerCase()}.webp`;
}

/** Backward-compatible aliases for the first Johnny implementation. */
export const optimizeJohnnyPropertyImage = optimizePropertyFlowImage;
export const buildJohnnyPropertyImagePath = buildPropertyFlowImagePath;
