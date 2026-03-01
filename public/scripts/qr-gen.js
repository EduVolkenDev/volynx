import QRCodeStyling from 'https://esm.sh/qr-code-styling@1.6.0-rc.1';

let qrCode = null;

document.getElementById('dotsColorType').addEventListener('change', function () {
  var type = this.value;
  document.getElementById('dotsColorGroup').style.display = type === 'solid' ? 'flex' : 'none';
  document.getElementById('dotsGradientGroup').style.display = type === 'gradient' ? 'flex' : 'none';
  document.getElementById('dotsGradientGroup2').style.display = type === 'gradient' ? 'flex' : 'none';
  if (qrCode) generateQR();
});

document.getElementById('logo').addEventListener('change', function (e) {
  var file = e.target.files[0];
  if (file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById('logoImg').src = e.target.result;
      document.getElementById('logoPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    document.getElementById('logoPreview').style.display = 'none';
  }
});

['logoSize', 'logoMargin', 'dotsColor', 'dotsColor1', 'dotsColor2'].forEach(function (id) {
  document.getElementById(id).addEventListener('input', function () { if (qrCode) generateQR(); });
});

document.getElementById('borderRadius').addEventListener('input', function () {
  document.getElementById('qr-container').style.borderRadius = this.value + 'px';
});

function fileToDataURL(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildGradient(kind) {
  if (kind === 'gradient') {
    return {
      type: 'linear', rotation: Math.PI / 4,
      colorStops: [
        { offset: 0, color: document.getElementById('dotsColor1').value },
        { offset: 1, color: document.getElementById('dotsColor2').value }
      ]
    };
  }
  if (kind === 'metallic') {
    return {
      type: 'linear', rotation: 0,
      colorStops: [{ offset: 0, color: '#c0c0c0' }, { offset: .5, color: '#808080' }, { offset: 1, color: '#c0c0c0' }]
    };
  }
  return null;
}

async function generateQR() {
  try {
    var text = document.getElementById('text').value.trim();
    if (!text) return alert('Digite algo para gerar o QR!');

    var size = parseInt(document.getElementById('size').value, 10);
    var dotsType = document.getElementById('dotsType').value;
    var backgroundColor = document.getElementById('backgroundColor').value;
    var dotsColorType = document.getElementById('dotsColorType').value;

    var dotsOptions = { type: dotsType };
    var cornersSquareOptions = { type: dotsType === 'rounded' ? 'extra-rounded' : 'square' };
    var cornersDotOptions = { type: dotsType === 'rounded' ? 'dot' : 'square' };

    if (dotsColorType === 'solid') {
      var c = document.getElementById('dotsColor').value;
      dotsOptions.color = c;
      cornersSquareOptions.color = c;
      cornersDotOptions.color = c;
    } else {
      var g = buildGradient(dotsColorType);
      dotsOptions.gradient = g;
      cornersSquareOptions.gradient = g;
      cornersDotOptions.gradient = g;
    }

    var logoFile = document.getElementById('logo').files[0];
    var logoSize = parseFloat(document.getElementById('logoSize').value);
    var logoMargin = parseInt(document.getElementById('logoMargin').value, 10);

    var options = {
      width: size, height: size, type: 'svg', data: text,
      dotsOptions: dotsOptions,
      cornersSquareOptions: cornersSquareOptions,
      cornersDotOptions: cornersDotOptions,
      backgroundOptions: { color: backgroundColor },
      qrOptions: { errorCorrectionLevel: 'M' }
    };

    if (logoFile) {
      options.image = await fileToDataURL(logoFile);
      options.imageOptions = { crossOrigin: 'anonymous', margin: logoMargin, imageSize: logoSize };
    }

    document.getElementById('qr-container').innerHTML = '';
    qrCode = new QRCodeStyling(options);
    qrCode.append(document.getElementById('qr-container'));

    var radius = document.getElementById('borderRadius').value + 'px';
    document.getElementById('qr-container').style.borderRadius = radius;

    var svg = document.querySelector('#qr-container svg');
    if (svg) {
      svg.style.width = '100%';
      svg.style.height = 'auto';
      svg.style.maxWidth = size + 'px';
    }

    document.getElementById('downloadBtn').style.display = 'inline-block';
  } catch (err) {
    console.error(err);
    alert('Erro ao gerar o QR. Abra o Console (F12) para ver a mensagem.');
  }
}

function downloadQR() {
  if (qrCode) qrCode.download({ extension: 'png' });
}

document.getElementById('generateBtn').addEventListener('click', generateQR);
document.getElementById('downloadBtn').addEventListener('click', downloadQR);
