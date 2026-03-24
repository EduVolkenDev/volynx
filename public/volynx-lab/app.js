/* VOLYNX Lab — Converter app.js */

const FREE_LIMIT = 5;
const STORAGE_KEY = "volynx_converter_usage";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getLocalUsage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const today = todayKey();
  if (!raw) { const data = { date: today, used: 0 }; localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return data; }
  try {
    const data = JSON.parse(raw);
    if (data.date !== today) { const reset = { date: today, used: 0 }; localStorage.setItem(STORAGE_KEY, JSON.stringify(reset)); return reset; }
    return data;
  } catch { const reset = { date: today, used: 0 }; localStorage.setItem(STORAGE_KEY, JSON.stringify(reset)); return reset; }
}

function incrementLocalUsage(n) {
  const data = getLocalUsage();
  data.used += n;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function getConfig() {
  try { return await fetch('/config.json', { cache: 'no-store' }).then(r => r.json()); }
  catch { return {}; }
}

async function checkPermission(toolName, count) {
  const cfg = await getConfig();
  const apiBase = (cfg.apiBaseUrl || '').replace(/\/$/, '');
  const token = localStorage.getItem('volynx_access_token') || '';

  // Try server-side check
  if (apiBase) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${apiBase}/api/check-permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tool: toolName }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        const perm = await res.json();
        if (!perm.useLocalStorage) {
          return { allowed: perm.remaining === -1 || perm.remaining >= count, plan: perm.plan, remaining: perm.remaining, limit: perm.limit, source: 'server' };
        }
      }
    } catch (_) {}
  }

  // Fallback: localStorage
  const usage = getLocalUsage();
  const remaining = Math.max(0, FREE_LIMIT - usage.used);
  return { allowed: remaining >= count, plan: 'free', remaining, limit: FREE_LIMIT, source: 'local' };
}

async function logUsage(toolName, amount) {
  const cfg = await getConfig();
  const apiBase = (cfg.apiBaseUrl || '').replace(/\/$/, '');
  const token = localStorage.getItem('volynx_access_token') || '';

  if (apiBase && token) {
    try {
      fetch(`${apiBase}/api/log-usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tool: toolName, amount }),
      }).catch(() => {});
    } catch (_) {}
  }

  // Always also track locally
  incrementLocalUsage(amount);
}

function isHeic(file) {
  if (file.type === 'image/heic' || file.type === 'image/heif') return true;
  const ext = file.name.split('.').pop().toLowerCase();
  return ext === 'heic' || ext === 'heif';
}

const fileInput  = document.getElementById('file');
const dropZone   = document.getElementById('drop');
const formatSel  = document.getElementById('format');
const qualityIn  = document.getElementById('quality');
const qualityVal = document.getElementById('qualityVal');
const maxwSel    = document.getElementById('maxw');
const convertBtn = document.getElementById('convert');
const zipBtn     = document.getElementById('zip');
const clearBtn   = document.getElementById('clear');
const list       = document.getElementById('list');
const stats      = document.getElementById('stats');

let files = [];
let converted = [];

/* ===== Quality label ===== */
qualityIn.addEventListener('input', () => {
  qualityVal.textContent = qualityIn.value;
});

/* ===== Drop zone ===== */
dropZone.addEventListener('click', (e) => {
  if (e.target !== fileInput) fileInput.click();
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag');
  addFiles(Array.from(e.dataTransfer.files).filter(f =>
    f.type.startsWith('image/') || isHeic(f)
  ));
});

fileInput.addEventListener('change', () => {
  addFiles(Array.from(fileInput.files));
  fileInput.value = '';
});

function addFiles(incoming) {
  incoming.forEach(f => {
    if (!files.find(x => x.name === f.name && x.size === f.size)) files.push(f);
  });
  renderList();
}

/* ===== Render file list ===== */
function renderList() {
  list.innerHTML = '';
  converted = [];
  zipBtn.disabled = true;

  files.forEach((f, i) => {
    const li = document.createElement('li');
    li.className = 'item';
    li.dataset.index = i;
    li.innerHTML = `
      <span class="item__name">${f.name}</span>
      <div class="item__actions">
        <span class="item__meta">${formatSize(f.size)}</span>
        <span class="item__status" id="status-${i}">—</span>
        <button class="item__remove" aria-label="Remover">✕</button>
      </div>
    `;
    li.querySelector('.item__remove').addEventListener('click', () => {
      files.splice(i, 1);
      renderList();
    });
    list.appendChild(li);
  });

  updateStats();
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function updateStats() {
  stats.textContent = files.length ? `${files.length} arquivo(s)` : '';
}

/* ===== Convert ===== */
convertBtn.addEventListener('click', async () => {
  if (!files.length) return;

  convertBtn.disabled = true;
  converted = [];

  // Check permission with file count
  const perm = await checkPermission('converter', files.length);
  if (!perm.allowed) {
    const msg = perm.remaining === 0
      ? `Daily limit reached (${perm.limit}). ${perm.plan === 'free' ? 'Upgrade to Pro for more.' : 'Try again tomorrow.'}`
      : `Limit: ${perm.remaining} remaining today. You selected ${files.length} files.`;
    alert(msg);
    convertBtn.disabled = false;
    return;
  }

  const format  = formatSel.value;
  const quality = parseInt(qualityIn.value, 10) / 100;
  const maxw    = parseInt(maxwSel.value, 10);
  const mime    = format === 'jpg'  ? 'image/jpeg'
                : format === 'avif' ? 'image/avif'
                : format === 'png'  ? 'image/png'
                : 'image/webp';

  for (let i = 0; i < files.length; i++) {
    const statusEl = document.getElementById(`status-${i}`);
    statusEl.textContent = '⏳';

    try {
      const resolved = await resolveFile(files[i]);
      const blob = await convertImage(resolved, mime, quality, maxw);
      const ext  = format === 'jpg' ? 'jpg' : format;
      const name = files[i].name.replace(/\.[^.]+$/, '') + '.' + ext;

      converted.push({ name, blob });

      const url = URL.createObjectURL(blob);
      statusEl.innerHTML = `✅ ${formatSize(blob.size)} <a href="${url}" download="${name}" class="link">↓ baixar</a>`;
    } catch (err) {
      statusEl.textContent = '❌ erro';
      console.error(files[i].name, err);
    }
  }

  // Log usage after successful conversion
  if (converted.length > 0) {
    await logUsage('converter', converted.length);
  }

  convertBtn.disabled = false;
  if (converted.length > 1) zipBtn.disabled = false;
});

async function resolveFile(file) {
  if (!isHeic(file)) return file;
  if (typeof heic2any === 'undefined') throw new Error('heic2any não carregou');
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
  return Array.isArray(result) ? result[0] : result;
}

function convertImage(file, mime, quality, maxw) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (maxw > 0 && w > maxw) {
        h = Math.round((h * maxw) / w);
        w = maxw;
      }

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('toBlob falhou')),
        mime,
        quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Erro ao carregar imagem')); };
    img.src = url;
  });
}

/* ===== ZIP download ===== */
zipBtn.addEventListener('click', async () => {
  if (!converted.length || typeof JSZip === 'undefined') return;

  zipBtn.disabled = true;
  zipBtn.textContent = 'Gerando ZIP…';

  const zip = new JSZip();
  converted.forEach(({ name, blob }) => zip.file(name, blob));

  const content = await zip.generateAsync({ type: 'blob' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(content),
    download: 'volynx-converted.zip'
  });
  a.click();
  URL.revokeObjectURL(a.href);

  zipBtn.disabled = false;
  zipBtn.textContent = 'Baixar ZIP';
});

/* ===== Clear ===== */
clearBtn.addEventListener('click', () => {
  files = [];
  converted = [];
  zipBtn.disabled = true;
  renderList();
});
