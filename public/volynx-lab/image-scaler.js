document.addEventListener("DOMContentLoaded", function () {
  const $ = (id) => document.getElementById(id);

  const fileEl = $("file");
  const pickBtn = $("pickBtn");
  const dropEl = $("drop");
  const runBtn = $("runBtn");
  const downloadBtn = $("downloadBtn");
  const previewEl = $("preview");

  const modeEl = $("mode");
  const scaleEl = $("scale");
  const fmtEl = $("format");
  const sharpenEl = $("sharpen");
  const smoothEl = $("smooth");

  const origMeta = $("origMeta");
  const outMeta = $("outMeta");

  let srcImg = null;
  let srcFile = null;
  let srcName = "image";
  let outBlob = null;
  let outW = 0, outH = 0;

  pickBtn.addEventListener("click", () => fileEl.click());
  dropEl.addEventListener("click", () => fileEl.click());
  dropEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") fileEl.click();
  });

  fileEl.addEventListener("change", async () => {
    const f = fileEl.files && fileEl.files[0];
    if (!f) return;
    await loadFile(f);
  });

  ["dragenter", "dragover"].forEach(ev => {
    dropEl.addEventListener(ev, (e) => {
      e.preventDefault();
      dropEl.classList.add("drag");
    });
  });
  ["dragleave", "drop"].forEach(ev => {
    dropEl.addEventListener(ev, (e) => {
      e.preventDefault();
      dropEl.classList.remove("drag");
    });
  });
  dropEl.addEventListener("drop", async (e) => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    await loadFile(f);
  });

  async function loadFile(file) {
    srcFile = file;
    srcName = (file.name || "image").replace(/\.[a-z0-9]+$/i, "");
    const url = URL.createObjectURL(file);

    const img = new Image();
    img.decoding = "async";
    img.src = url;

    await img.decode();
    URL.revokeObjectURL(url);

    srcImg = img;
    origMeta.textContent = `${img.naturalWidth}×${img.naturalHeight} • ${(file.size / 1024 / 1024).toFixed(2)}MB`;
    runBtn.disabled = false;
    downloadBtn.disabled = true;
    previewEl.removeAttribute("src");
    outMeta.textContent = "—";
    outBlob = null;
  }

  runBtn.addEventListener("click", async () => {
    if (!srcImg || !srcFile) return;

    runBtn.disabled = true;
    downloadBtn.disabled = true;
    runBtn.textContent = "Processando…";

    const mode = modeEl.value || "local";
    const scale = parseInt(scaleEl.value, 10) || 2;
    const mime = fmtEl.value || "image/png";
    const doSharpen = sharpenEl.checked;
    const hiSmooth = smoothEl.checked;

    try {
      let blob;

      if (mode === "ai") {
        blob = await upscaleAI({ file: srcFile, scale, mime });
      } else {
        const inW = srcImg.naturalWidth;
        const inH = srcImg.naturalHeight;

        outW = Math.max(1, Math.round(inW * scale));
        outH = Math.max(1, Math.round(inH * scale));

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;

        const ctx = canvas.getContext("2d", { willReadFrequently: doSharpen });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = hiSmooth ? "high" : "medium";
        ctx.drawImage(srcImg, 0, 0, outW, outH);

        if (doSharpen) {
          try { applySharpen(ctx, outW, outH); } catch (e) {}
        }

        blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.95));
      }

      outBlob = blob;

      const bmp = await createImageBitmap(outBlob);
      outW = bmp.width;
      outH = bmp.height;

      const outUrl = URL.createObjectURL(outBlob);
      previewEl.src = outUrl;

      outMeta.textContent = `${outW}×${outH} • ${mime.replace("image/", "").toUpperCase()} • ${(outBlob.size / 1024 / 1024).toFixed(2)}MB`;
      downloadBtn.disabled = false;

    } catch (err) {
      alert(err?.message || "Falha ao processar.");
      outMeta.textContent = "—";
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = "Gerar imagem";
    }
  });

  async function upscaleAI({ file, scale, mime }) {
    const form = new FormData();
    form.append("file", file);
    form.append("scale", String(scale));
    form.append("mime", mime);

    const res = await fetch("/api/upscale", { method: "POST", body: form });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t || "AI Upscale indisponível.");
    }
    return await res.blob();
  }

  downloadBtn.addEventListener("click", () => {
    if (!outBlob) return;

    const mime = fmtEl.value || "image/png";
    const ext = mime === "image/png" ? "png" : (mime === "image/webp" ? "webp" : "jpg");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(outBlob);
    a.download = `${srcName}-${outW}x${outH}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1200);
  });

  function applySharpen(ctx, w, h) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const src = imgData.data;
    const out = new Uint8ClampedArray(src.length);

    const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    const idx = (x, y) => (y * w + x) * 4;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        let ki = 0;
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const p = idx(x + i, y + j);
            const kv = k[ki++];
            r += src[p] * kv;
            g += src[p + 1] * kv;
            b += src[p + 2] * kv;
            a += src[p + 3];
          }
        }
        const p0 = idx(x, y);
        out[p0] = clamp(r);
        out[p0 + 1] = clamp(g);
        out[p0 + 2] = clamp(b);
        out[p0 + 3] = clamp(a / 9);
      }
    }

    for (let x = 0; x < w; x++) {
      copyPx(src, out, idx(x, 0));
      copyPx(src, out, idx(x, h - 1));
    }
    for (let y = 0; y < h; y++) {
      copyPx(src, out, idx(0, y));
      copyPx(src, out, idx(w - 1, y));
    }

    imgData.data.set(out);
    ctx.putImageData(imgData, 0, 0);
  }

  function copyPx(src, out, p) {
    out[p] = src[p]; out[p + 1] = src[p + 1]; out[p + 2] = src[p + 2]; out[p + 3] = src[p + 3];
  }
  function clamp(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }
});
