const $ = (s) => document.querySelector(s);

const drop = $("#drop");
const fileInput = $("#file");
const list = $("#list");
const convertBtn = $("#convert");
const zipBtn = $("#zip");
const clearBtn = $("#clear");

const formatSel = $("#format");
const quality = $("#quality");
const qualityVal = $("#qualityVal");
const maxwSel = $("#maxw");
const stats = $("#stats");

qualityVal.textContent = quality.value;

let queue = [];
let results = []; // {name, blob, before, after}

const supportsWorker = (() => {
  try {
    return (
      typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined"
    );
  } catch {
    return false;
  }
})();

const worker = supportsWorker
  ? new Worker(new URL("./worker.js", import.meta.url), { type: "module" })
  : null;

function bytes(n) {
  if (!Number.isFinite(n)) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}

function baseName(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

function outExt(fmt) {
  if (fmt === "jpg") return "jpg";
  return fmt;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function pickMime(format) {
  if (format === "png") return "image/png";
  if (format === "jpg") return "image/jpeg";
  if (format === "avif") return "image/avif";
  return "image/webp";
}

async function convertInMainThread(file, fmt, q, maxW) {
  const ab = await file.arrayBuffer();
  const inBlob = new Blob([ab], {
    type: file.type || "application/octet-stream",
  });

  const img = new Image();
  const url = URL.createObjectURL(inBlob);
  img.src = url;
  await img.decode();

  let w = img.naturalWidth;
  let h = img.naturalHeight;

  if (maxW && w > maxW) {
    const r = maxW / w;
    w = Math.round(w * r);
    h = Math.round(h * r);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.drawImage(img, 0, 0, w, h);

  URL.revokeObjectURL(url);

  let format = fmt || "webp";
  let mime = pickMime(format);

  const blob = await new Promise((resolve) => {
    const qq = mime === "image/png" ? undefined : clamp(q ?? 0.82, 0.1, 0.95);
    canvas.toBlob((b) => resolve(b), mime, qq);
  });

  if (!blob) {
    throw new Error(
      "Falha ao exportar. Formato pode não ser suportado neste navegador."
    );
  }

  return { format, mime, blob };
}

function render() {
  list.innerHTML = "";

  queue.forEach((f) => {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
			<div>
				<div class="item__name">${f.name}</div>
				<div class="item__meta">${bytes(f.size)}</div>
			</div>
			<div class="item__actions">
				<span class="badge">Pronto pra converter</span>
			</div>
		`;
    list.appendChild(li);
  });

  results.forEach((r) => {
    const li = document.createElement("li");
    li.className = "item";
    const saved =
      r.before > 0
        ? Math.max(0, Math.round((1 - r.after / r.before) * 100))
        : 0;
    li.innerHTML = `
			<div>
				<div class="item__name">${r.name}</div>
				<div class="item__meta">${bytes(r.before)} → ${bytes(
      r.after
    )} (${saved}% menor)</div>
			</div>
			<div class="item__actions">
				<a class="link" data-dl="${encodeURIComponent(r.name)}" href="#">Download</a>
			</div>
		`;
    list.appendChild(li);
  });

  zipBtn.disabled = results.length === 0;

  const totalBefore = results.reduce((a, r) => a + r.before, 0);
  const totalAfter = results.reduce((a, r) => a + r.after, 0);

  if (results.length) {
    const saved =
      totalBefore > 0
        ? Math.max(0, Math.round((1 - totalAfter / totalBefore) * 100))
        : 0;
    stats.textContent = `${results.length} convertido(s) • ${bytes(
      totalBefore
    )} → ${bytes(totalAfter)} (${saved}% menor)`;
  } else {
    stats.textContent = "";
  }
}

function addFiles(files) {
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    queue.push(f);
  }
  render();
}

drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("drag");
});
drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("drag");
  addFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", () => addFiles(fileInput.files));
quality.addEventListener(
  "input",
  () => (qualityVal.textContent = quality.value)
);

list.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-dl]");
  if (!a) return;
  e.preventDefault();

  const name = decodeURIComponent(a.getAttribute("data-dl"));
  const r = results.find((x) => x.name === name);
  if (!r) return;

  const url = URL.createObjectURL(r.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
});

convertBtn.addEventListener("click", async () => {
  if (!queue.length) return;

  convertBtn.disabled = true;
  zipBtn.disabled = true;

  const fmt = formatSel.value;
  const q = Number(quality.value) / 100;
  const maxW = Number(maxwSel.value);

  const batch = queue.slice();
  queue = [];
  render();

  for (const f of batch) {
    try {
      let outFmt = fmt;
      let outMime = pickMime(outFmt);
      let outBlob;

      if (worker) {
        const ab = await f.arrayBuffer();
        const msg = { name: f.name, input: ab, format: fmt, quality: q, maxW };
        const out = await new Promise((resolve) => {
          worker.onmessage = (ev) => resolve(ev.data);
          worker.postMessage(msg, [ab]);
        });

        if (!out || out.error) {
          throw new Error(out?.error || "Falha na conversão");
        }

        outFmt = out.format;
        outMime = out.mime;
        outBlob = new Blob([out.output], { type: outMime });
      } else {
        const out = await convertInMainThread(f, fmt, q, maxW);
        outFmt = out.format;
        outMime = out.mime;
        outBlob = out.blob;
      }

      const outName = `${baseName(f.name)}__volynx__${outFmt}.${outExt(
        outFmt
      )}`;
      results.push({
        name: outName,
        blob: outBlob,
        before: f.size,
        after: outBlob.size,
      });
      render();
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      results.push({
        name: `${baseName(f.name)}__volynx__FAILED.txt`,
        blob: new Blob([msg], { type: "text/plain" }),
        before: f.size,
        after: msg.length,
      });
      render();
    }
  }

  convertBtn.disabled = false;
  render();
});

zipBtn.addEventListener("click", async () => {
  if (!results.length) return;
  zipBtn.disabled = true;

  const zip = new JSZip();
  for (const r of results) {
    zip.file(r.name, r.blob);
  }

  const blob = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "volynx_converter.zip";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 800);

  zipBtn.disabled = false;
});

clearBtn.addEventListener("click", () => {
  queue = [];
  results = [];
  render();
  fileInput.value = "";
});

render();
