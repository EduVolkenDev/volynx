function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function pickMime(format) {
  if (format === "png") return "image/png";
  if (format === "jpg") return "image/jpeg";
  if (format === "avif") return "image/avif";
  return "image/webp";
}

self.onmessage = async (e) => {
  try {
    const { input, format, quality, maxW } = e.data;

    const inBlob = new Blob([input]);
    const bmp = await createImageBitmap(inBlob);

    let w = bmp.width;
    let h = bmp.height;

    if (maxW && w > maxW) {
      const r = maxW / w;
      w = Math.round(w * r);
      h = Math.round(h * r);
    }

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d", { alpha: true });
    ctx.drawImage(bmp, 0, 0, w, h);

    let fmt = format || "webp";
    let mime = pickMime(fmt);

    // fallback: se AVIF falhar, cai pra WebP
    if (fmt === "avif") {
      try {
        await canvas.convertToBlob({
          type: mime,
          quality: clamp(quality ?? 0.82, 0.1, 0.95),
        });
      } catch {
        fmt = "webp";
        mime = "image/webp";
      }
    }

    const opts = { type: mime };
    if (
      mime === "image/jpeg" ||
      mime === "image/webp" ||
      mime === "image/avif"
    ) {
      opts.quality = clamp(quality ?? 0.82, 0.1, 0.95);
    }

    const outBlob = await canvas.convertToBlob(opts);
    const outBuf = await outBlob.arrayBuffer();

    self.postMessage({ format: fmt, mime, output: outBuf }, [outBuf]);
  } catch (err) {
    self.postMessage({ error: err && err.message ? err.message : String(err) });
  }
};
