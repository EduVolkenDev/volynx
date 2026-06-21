(function () {
  async function checkPermission(toolName) {
    var FREE = { allowed: true, plan: 'free', remaining: null };
    var cfg;
    try { cfg = await fetch('/config.json', { cache: 'no-store' }).then(function(r){ return r.json(); }); }
    catch (_) { return FREE; }
    var apiBase = (cfg.functionsUrl || cfg.apiBaseUrl || '').replace(/\/$/, '');
    var token = localStorage.getItem('volynx_access_token') || '';
    if (!apiBase || !token) return FREE;
    try {
      var ctrl = new AbortController();
      var t = setTimeout(function(){ ctrl.abort(); }, 3500);
      var res = await fetch(apiBase + '/check-permission', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
        body: JSON.stringify({ tool: toolName }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) return FREE;
      return await res.json();
    } catch (_) { return FREE; }
  }

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

  function labNotify(title, message, tone) {
    if (window.VxLab && typeof VxLab.notify === 'function') {
      VxLab.notify({
        tool: 'image-scaler',
        event: tone === 'error' ? 'error_notice' : 'notice',
        tone: tone || 'warn',
        icon: tone === 'error' ? '!' : 'i',
        title: title,
        message: message
      });
    } else {
      alert(message || title);
    }
  }

  // ── State ─────────────────────────────────────────────────
  var loadedImages     = [];  // [{ file, img, baseName }]
  var processedResults = [];  // [{ baseName, blob, width, height }]
  var singleBlob       = null;

  // ── File picker ──────────────────────────────────────────
  pickBtn.addEventListener('click', function () { fileInput.click(); });
  drop.addEventListener('click', function () { fileInput.click(); });
  drop.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });

  fileInput.addEventListener('change', async function () {
    var files = Array.from(fileInput.files || []);
    if (files.length) await loadFiles(files);
  });

  // ── Drag & drop ──────────────────────────────────────────
  drop.addEventListener('dragover', function (e) {
    e.preventDefault();
    drop.classList.add('drag');
  });
  drop.addEventListener('dragleave', function () {
    drop.classList.remove('drag');
  });
  drop.addEventListener('drop', async function (e) {
    e.preventDefault();
    drop.classList.remove('drag');
    var files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
    if (files.length) await loadFiles(files);
  });

  // ── Load files ───────────────────────────────────────────
  function fileToImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload  = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Failed to load ' + file.name)); };
      img.src = url;
    });
  }

  async function loadFiles(files) {
    var valid = files.filter(function (f) { return f && f.type && f.type.startsWith('image/'); });
    loadedImages     = [];
    processedResults = [];
    singleBlob       = null;

    if (preview) preview.removeAttribute('src');
    if (outMeta) outMeta.textContent = '—';
    if (downloadBtn) downloadBtn.disabled = true;

    if (!valid.length) {
      labNotify('No valid images', 'Select a PNG, JPG, WebP or another browser-readable image.');
      return;
    }

    runBtn.disabled = true;
    setDropText('Loading ' + valid.length + ' file(s)…');

    try {
      for (var i = 0; i < valid.length; i++) {
        var f = valid[i];
        var img = await fileToImage(f);
        loadedImages.push({ file: f, img: img, baseName: f.name.replace(/\.[^/.]+$/, '') });
      }
    } catch (err) {
      console.error(err);
      labNotify('Image loading failed', 'Image Scaler could not read one of the selected files. Try another format or a smaller file.', 'error');
      setDropText('Error — please try again');
      runBtn.disabled = true;
      return;
    }

    var totalBytes = valid.reduce(function (s, f) { return s + f.size; }, 0);
    if (origMeta) origMeta.textContent = valid.length + ' file(s) · ' + fmtSize(totalBytes);
    setDropText(valid.length + ' file(s) ready');
    runBtn.disabled = false;
  }

  // ── Run upscale ──────────────────────────────────────────
  runBtn.addEventListener('click', async function () {
    if (!loadedImages.length) return;
    runBtn.disabled = true;
    runBtn.textContent = 'Checking…';
    try {
      var perm = await checkPermission('image-scaler');
      if (!perm.allowed) {
        if (window.VxLab?.shouldSendToLogin(perm)) {
          VxLab.confirmLogin(
            VxLab.currentReturnPath(),
            'Sign in to continue upscaling. You will return to Image Scaler after login.'
          );
          runBtn.disabled = false;
          runBtn.textContent = 'Process';
          return;
        }
        if (window.VxTokens) {
          var tokenResult = await VxTokens.spend('image-scaler', 'medium', {
            description: 'Scale images (limit exceeded)'
          });
          if (!tokenResult.ok) {
            runBtn.disabled = false;
            runBtn.textContent = 'Process';
            return;
          }
        } else {
          if (window.VxLab?.shouldSendToLogin(perm)) {
            VxLab.confirmLogin(
              VxLab.currentReturnPath(),
              'Sign in to continue upscaling. You will return to Image Scaler after login.'
            );
            runBtn.disabled = false;
            runBtn.textContent = 'Process';
            return;
          }
          var isFreeUser = window.VxPlan ? !window.VxPlan.isPaid(perm.plan) : (perm.plan === 'free');
          var msg = isFreeUser
            ? 'Free limit reached. Sign in or upgrade to continue.'
            : 'Plan limit reached. Upgrade to continue.';
          if (isFreeUser && window.VxLab) VxLab.confirmUpgrade('Daily limit reached. Upgrade to Pro for more.\n\nClick OK to see upgrade options.');
          else labNotify('Daily limit reached', msg, 'warn');
          runBtn.disabled = false;
          runBtn.textContent = 'Process';
          return;
        }
      }
    } catch (err) {
      console.warn('check-permission failed, allowing local usage:', err);
    }
    var mode = modeSelect ? modeSelect.value : 'local';
    if (mode === 'ai') {
      labNotify('AI upscale is Pro', 'AI upscale requires an upgrade. Image Scaler will continue with local mode for this run.');
    }
    await runLocal();
  });

  async function runLocal() {
    runBtn.disabled  = true;
    downloadBtn.disabled = true;
    processedResults = [];
    singleBlob       = null;

    var scale   = parseInt(scaleSelect.value, 10);
    var format  = formatSelect.value;
    var sharpen = sharpenChk ? sharpenChk.checked : false;
    var smooth  = smoothChk  ? smoothChk.checked  : true;
    var ext     = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';

    try {
      for (var i = 0; i < loadedImages.length; i++) {
        var item = loadedImages[i];
        runBtn.textContent = 'Processing ' + (i + 1) + '/' + loadedImages.length + '…';
        setDropText('Processing ' + (i + 1) + '/' + loadedImages.length + '…');

        var result = await upscaleOne(item, scale, format, sharpen, smooth);
        processedResults.push(result);

        // Show first result in preview
        if (i === 0) {
          preview.src = URL.createObjectURL(result.blob);
        }
      }

      var totalOut = processedResults.reduce(function (s, r) { return s + r.blob.size; }, 0);
      outMeta.textContent = processedResults.length + ' file(s) · ' + fmtSize(totalOut) + ' (' + ext.toUpperCase() + ')';

      if (processedResults.length === 1) singleBlob = processedResults[0].blob;
      if (window.VxLab) {
        VxLab.recordEvent('image-scaler', 'upscale', processedResults.length + ' file(s) upscaled');
        VxLab.savePreset('image-scaler', {
          scale: scale + 'x',
          format: format.split('/')[1],
          smoothing: smooth ? 'high' : 'off',
        });
      }

      setDropText(processedResults.length + ' file(s) upscaled');
      downloadBtn.disabled = false;
    } catch (err) {
      console.error(err);
      labNotify('Processing failed', 'Image Scaler could not process this image. Try a smaller file or another format.', 'error');
      setDropText('Error — please try again');
    } finally {
      runBtn.disabled  = false;
      runBtn.textContent = 'Process';
    }
  }

  function upscaleOne(item, scale, format, sharpen, smooth) {
    return new Promise(function (resolve, reject) {
      var img      = item.img;
      var srcW     = img.naturalWidth;
      var srcH     = img.naturalHeight;
      var dstW     = srcW * scale;
      var dstH     = srcH * scale;

      // Draw original onto source canvas
      var srcCanvas    = document.createElement('canvas');
      srcCanvas.width  = srcW;
      srcCanvas.height = srcH;
      var srcCtx = srcCanvas.getContext('2d');
      srcCtx.drawImage(img, 0, 0);

      // Upscale onto output canvas
      var dst    = document.createElement('canvas');
      dst.width  = dstW;
      dst.height = dstH;
      var dstCtx = dst.getContext('2d');

      dstCtx.imageSmoothingEnabled = smooth;
      if (smooth) dstCtx.imageSmoothingQuality = 'high';
      dstCtx.drawImage(srcCanvas, 0, 0, dstW, dstH);

      // Optional sharpen via convolution
      if (sharpen) {
        var imageData = dstCtx.getImageData(0, 0, dstW, dstH);
        applySharpen(imageData);
        dstCtx.putImageData(imageData, 0, 0);
      }

      dst.toBlob(function (blob) {
        if (!blob) { reject(new Error('Blob generation failed for ' + item.baseName)); return; }
        resolve({ baseName: item.baseName, blob: blob, width: dstW, height: dstH });
      }, format, 0.92);
    });
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
  downloadBtn.addEventListener('click', async function () {
    if (!processedResults.length) return;
    var format = formatSelect.value;
    var ext    = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
    var scale  = scaleSelect.value;

    // Single file — direct download
    if (processedResults.length === 1 && singleBlob) {
      var a = document.createElement('a');
      a.href     = URL.createObjectURL(singleBlob);
      a.download = processedResults[0].baseName + '-' + scale + 'x.' + ext;
      a.click();
      if (window.VxLab) {
        VxLab.recordEvent('image-scaler', 'download', a.download);
        VxLab.notifySuccess?.({ kind: 'download', tool: 'image-scaler', event: 'scaled_image_download_success' });
      }
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      return;
    }

    // Multiple files — ZIP download
    if (!window.JSZip) {
      labNotify('ZIP export unavailable', 'The ZIP library did not load. Reload the page and try again.', 'error');
      return;
    }
    var zip = new window.JSZip();
    for (var i = 0; i < processedResults.length; i++) {
      var r = processedResults[i];
      zip.file(r.baseName + '-' + scale + 'x.' + ext, r.blob);
    }
    var zipBlob = await zip.generateAsync({ type: 'blob' });
    var a2 = document.createElement('a');
    a2.href     = URL.createObjectURL(zipBlob);
    a2.download = 'volynx-scaler-batch.zip';
    a2.click();
    if (window.VxLab) {
      VxLab.recordEvent('image-scaler', 'download', 'Batch ZIP downloaded');
      VxLab.notifySuccess?.({ kind: 'download', tool: 'image-scaler', event: 'scaled_batch_download_success' });
    }
    setTimeout(function () { URL.revokeObjectURL(a2.href); }, 5000);
  });

  // ── Helpers ───────────────────────────────────────────────
  function fmtSize(bytes) {
    if (window.VxFileMetrics) return window.VxFileMetrics.formatBytes(bytes);
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function setDropText(text) {
    var p = drop ? drop.querySelector('p') : null;
    if (p) p.textContent = text;
  }
})();
