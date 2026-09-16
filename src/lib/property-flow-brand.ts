const MAX_LOGO_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_LOGO_OUTPUT_BYTES = 1024 * 1024;
const MAX_LOGO_EDGE = 1200;

function toWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Não foi possível preparar a logo.")), "image/webp", quality);
  });
}

export async function optimizePropertyFlowLogo(sourceFile: File): Promise<File> {
  if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(sourceFile.type)) throw new Error("Use uma logo em JPG, PNG ou WebP.");
  if (sourceFile.size > MAX_LOGO_INPUT_BYTES) throw new Error("A logo original ultrapassa o limite de 10 MB.");
  const bitmap = await createImageBitmap(sourceFile);
  try {
    const scale = Math.min(1, MAX_LOGO_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("O navegador não conseguiu preparar a logo.");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob = await toWebp(canvas, 0.9);
    if (blob.size > MAX_LOGO_OUTPUT_BYTES) blob = await toWebp(canvas, 0.78);
    if (blob.size > MAX_LOGO_OUTPUT_BYTES) throw new Error("Não foi possível reduzir a logo para menos de 1 MB.");
    return new File([blob], "logo.webp", { type: "image/webp", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
