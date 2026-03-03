(function () {
  var fileInput   = document.getElementById('file');
  var pickBtn     = document.getElementById('pickBtn');
  var drop        = document.getElementById('drop');
  var runBtn      = document.getElementById('runBtn');
  var downloadBtn = document.getElementById('downloadBtn');
  var preview     = document.getElementById('preview');
  var origMeta    = document.getElementById('origMeta');
  var outMeta     = document.getElementById('outMeta');
  var modeSelect  = document.getElementById('mode');
  var scaleSelect = document.getElementById('scale');
  var formatSelect= document.getElementById('format');
  var sharpenChk  = document.getElementById('sharpen');
  var smoothChk   = document.getElementById('smooth');

  var currentFile = null;
  var outputBlob  = null;

  // ── File picker ──────────────────────────────────────────
  pickBtn.addEventListener('click', function () { fileInput.click(); });
  drop.addEventListener('click', function () { fileInput.click(); });
  drop.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files[0]) loadFile(fileInput.files[0]);
  });

  // ── Drag & drop ──────────────────────────────────────────
  drop.addEventListener('dragover', function (e) {
    e.preventDefault();
    drop.classList.add('drag');
  });
  drop.addEventListener('dragleave', function () {
    drop.classList.remove('drag');
  });
  drop.addEventListener('drop', function (e) {
    e.preventDefault();
    drop.classList.remove('drag');
    var f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) loadFile(f);
  });

  function loadFile(file) {
    currentFile = file;
    outputBlob  = null;
    downloadBtn.disabled = true;
    preview.removeAttribute('src');
    origMeta.textContent = file.name + ' — ' + fmtSize(file.size);
    outMeta.textContent  = '—';
    runBtn.disabled = false;
  }

  // ── Run upscale ──────────────────────────────────────────
  runBtn.addEventListener('click', function () {
    if (!currentFile) return;
    var mode = modeSelect.value;
    if (mode === 'ai') {
      alert('AI upscale requer upgrade. Usando modo local automaticamente.');
    }
    runLocal();
  });

  function runLocal() {
    runBtn.disabled = true;
    runBtn.textContent = 'Processando…';

    var scale   = parseInt(scaleSelect.value, 10);
    var format  = formatSelect.value;
    var sharpen = sharpenChk.checked;
    var smooth  = smoothChk.checked;

    var img = new Image();
    var url = URL.createObjectURL(currentFile);

    img.onload = function () {
      URL.revokeObjectURL(url);

      var srcW = img.naturalWidth;
      var srcH = img.naturalHeight;
      var dstW = srcW * scale;
      var dstH = srcH * scale;

      // Step 1: draw original onto a source canvas
      var srcCanvas = document.createElement('canvas');
      srcCanvas.width  = srcW;
      srcCanvas.height = srcH;
      var srcCtx = srcCanvas.getContext('2d');
      srcCtx.drawImage(img, 0, 0);

      // Step 2: upscale onto output canvas
      var dst = document.createElement('canvas');
      dst.width  = dstW;
      dst.height = dstH;
      var dstCtx = dst.getContext('2d');

      dstCtx.imageSmoothingEnabled = smooth;
      if (smooth) dstCtx.imageSmoothingQuality = 'high';

      dstCtx.drawImage(srcCanvas, 0, 0, dstW, dstH);

      // Step 3: optional sharpen via convolution
      if (sharpen) {
        var imageData = dstCtx.getImageData(0, 0, dstW, dstH);
        applySharpen(imageData);
        dstCtx.putImageData(imageData, 0, 0);
      }

      // Step 4: export
      var ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
      dst.toBlob(function (blob) {
        outputBlob = blob;
        var outUrl = URL.createObjectURL(blob);
        preview.src = outUrl;
        outMeta.textContent = dstW + ' × ' + dstH + 'px — ' + fmtSize(blob.size) + ' (' + ext.toUpperCase() + ')';
        downloadBtn.disabled = false;
        runBtn.disabled = false;
        runBtn.textContent = 'Gerar imagem';
      }, format, 0.92);
    };

    img.onerror = function () {
      URL.revokeObjectURL(url);
      alert('Erro ao carregar a imagem.');
      runBtn.disabled = false;
      runBtn.textContent = 'Gerar imagem';
    };

    img.src = url;
  }

  // ── Sharpen kernel (3×3 unsharp) ─────────────────────────
  function applySharpen(imageData) {
    var kernel = [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ];
    var w = imageData.width;
    var h = imageData.height;
    var src = new Uint8ClampedArray(imageData.data);
    var dst = imageData.data;

    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var i = (y * w + x) * 4;
        for (var c = 0; c < 3; c++) {
          var val = 0;
          for (var ky = -1; ky <= 1; ky++) {
            for (var kx = -1; kx <= 1; kx++) {
              var ki = ((y + ky) * w + (x + kx)) * 4 + c;
              val += src[ki] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          dst[i + c] = Math.min(255, Math.max(0, val));
        }
        dst[i + 3] = src[i + 3]; // preserve alpha
      }
    }
  }

  // ── Download ─────────────────────────────────────────────
  downloadBtn.addEventListener('click', function () {
    if (!outputBlob) return;
    var format = formatSelect.value;
    var ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
    var scale = scaleSelect.value;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(outputBlob);
    a.download = 'upscaled-' + scale + 'x.' + ext;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  });

  // ── Helpers ───────────────────────────────────────────────
  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
})();
