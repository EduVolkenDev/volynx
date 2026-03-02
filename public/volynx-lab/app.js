/* VOLYNX Lab — Converter app.js */

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
  addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
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
      const blob = await convertImage(files[i], mime, quality, maxw);
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

  convertBtn.disabled = false;
  if (converted.length > 1) zipBtn.disabled = false;
});

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
