import { api } from './api.js';

const CORE = (window.VOLYNX_CORE_URL || '').replace(/\/$/, '');
const BASE = (window.VOLYNX_QR_BASE || '/tools/qr').replace(/\/$/, '');

// Estado global da aplicação
const state = {
  user: null,
  organization: null,
  activeQRCount: 0,
  currentRoute: '/login',
  links: [],
};

// Router
function navigate(path) {
  state.currentRoute = path;
  history.pushState({}, '', `${BASE}${path}`);
  render();
}

function parseRoute() {
  const fullPath = window.location.pathname;
  const path = fullPath.startsWith(BASE) ? fullPath.slice(BASE.length) || '/' : fullPath;

  if (path === '/' || path === '/login') return { view: 'login' };
  if (path === '/dashboard') return { view: 'dashboard' };
  if (path.startsWith('/editor/')) {
    const token = path.split('/')[2] || 'new';
    return { view: 'editor', token };
  }

  return { view: 'login' };
}

async function loadUser() {
  try {
    const data = await api.getMe();
    state.user = data.user;
    state.organization = data.organization;
    state.activeQRCount = data.activeQRCount;
    return true;
  } catch (err) {
    state.user = null;
    return false;
  }
}

// Render principal
async function render() {
  const route = parseRoute();

  // Verificar autenticação
  const isAuthenticated = await loadUser();

  if (!isAuthenticated && route.view !== 'login') {
    navigate('/login');
    return;
  }

  if (isAuthenticated && route.view === 'login') {
    navigate('/dashboard');
    return;
  }

  const app = document.getElementById('app');

  if (route.view === 'login') {
    app.innerHTML = renderLogin();
    attachLoginHandlers();
  } else if (route.view === 'dashboard') {
    await loadLinks();
    app.innerHTML = renderDashboard();
    attachDashboardHandlers();
  } else if (route.view === 'editor') {
    app.innerHTML = renderEditor(route.token);
    attachEditorHandlers(route.token);
  }
}

async function loadLinks() {
  try {
    const data = await api.getLinks();
    state.links = data.links;
  } catch (err) {
    console.error('Failed to load links:', err);
    state.links = [];
  }
}

// ========== VIEWS ==========

function renderLogin() {
  return `
    <div class="login-container">
      <div class="card">
        <h1>VOLYNX QR Generator</h1>
        <p>Dynamic QR codes with customizable redirect links</p>

        <div class="tabs">
          <button class="tab active" data-tab="login">Login</button>
          <button class="tab" data-tab="register">Register</button>
        </div>

        <div class="tab-content active" data-content="login">
          <input type="email" id="login-email" placeholder="Email" autocomplete="email">
          <input type="password" id="login-password" placeholder="Password" autocomplete="current-password">
          <button id="login-btn" class="btn primary">Login</button>
        </div>

        <div class="tab-content" data-content="register">
          <input type="text" id="register-org" placeholder="Organization name (optional)">
          <input type="email" id="register-email" placeholder="Email" autocomplete="email">
          <input type="password" id="register-password" placeholder="Password" autocomplete="new-password">
          <button id="register-btn" class="btn primary">Create account</button>
          <p class="small">Get 30 days free trial with 20 QR codes!</p>
        </div>
      </div>
    </div>
  `;
}

function renderDashboard() {
  const org = state.organization;
  const limit = getEffectiveLimit(org);
  const trialActive = isTrialActive(org);
  const trialDaysLeft = trialActive ? Math.ceil((new Date(org.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  return `
    <div class="dashboard">
      <header class="topbar">
        <div class="topbar-inner">
          <h1>VOLYNX QR Generator</h1>
          <div>
            <span>${state.user.email}</span>
            <button class="btn" id="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      ${trialActive ? `
        <div class="trial-banner">
          ⏰ Trial active: ${trialDaysLeft} day${trialDaysLeft > 1 ? 's' : ''} left (${limit} QR codes available)
        </div>
      ` : ''}

      <div class="container">
        <div class="plan-card">
          <h3>Your Plan: ${org.plan_code}</h3>
          <p>Active QR codes: <strong>${state.activeQRCount} / ${limit}</strong></p>
        </div>

        <div class="qr-list-header">
          <h2>Your QR Codes</h2>
          <button class="btn primary" data-navigate="/editor/new">+ Create QR</button>
        </div>

        <div class="qr-list">
          ${state.links.length === 0 ? `
            <p class="empty-state">No QR codes yet. Create your first one!</p>
          ` : state.links.map(link => `
            <div class="qr-item">
              <div class="qr-preview">
                <img src="${CORE}/api/qr-preview/${link.token}.svg" alt="QR preview" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'">
              </div>
              <div class="qr-info">
                <h4>${link.name || 'Untitled QR'}</h4>
                <p class="small">${link.destination_url}</p>
                <p class="badge ${link.status}">${link.status}</p>
              </div>
              <div class="qr-actions">
                <button class="btn small" data-navigate="/editor/${link.token}">Edit</button>
                <button class="btn small danger" data-action="delete" data-token="${link.token}">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderEditor(token) {
  const link = state.links.find(l => l.token === token);
  const isLocked = link?.style_locked_at;

  return `
    <div class="editor">
      <header class="topbar">
        <div class="topbar-inner">
          <button class="btn" data-navigate="/dashboard">← Back to Dashboard</button>
          <h1>${token === 'new' ? 'Create QR Code' : 'Edit QR Code'}</h1>
          <div></div>
        </div>
      </header>

      <div class="editor-container">
        <div class="editor-left">
          <div class="field">
            <label>Name (optional)</label>
            <input type="text" id="qr-name" placeholder="My QR Code" value="${link?.name || ''}">
          </div>

          <div class="field">
            <label>Destination URL *</label>
            <input type="url" id="destination-url" placeholder="https://example.com" value="${link?.destination_url || ''}">
          </div>

          ${isLocked ? `
            <div class="alert warning">
              🔒 Visual is locked after first download. Only destination URL can be edited.
            </div>
          ` : ''}

          <div class="field">
            <label>QR Dot Color</label>
            <input type="color" id="dots-color" value="${link?.style_json?.dotsColor || '#000000'}" ${isLocked ? 'disabled' : ''}>
          </div>

          <div class="field">
            <label>Background Color</label>
            <input type="color" id="bg-color" value="${link?.style_json?.backgroundColor || '#ffffff'}" ${isLocked ? 'disabled' : ''}>
          </div>

          <button class="btn primary" id="save-draft">Save Draft</button>
        </div>

        <div class="editor-right">
          <h3>Preview</h3>
          <div id="qr-preview" class="qr-preview-container"></div>

          ${token !== 'new' && !isLocked ? `
            <div class="alert info">
              Preview shows WATERMARK until you download.
            </div>
          ` : ''}

          ${token !== 'new' ? `
            <div class="download-actions">
              <button class="btn" id="download-svg">Download SVG</button>
              <button class="btn" id="download-png">Download PNG</button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// ========== HANDLERS ==========

function attachLoginHandlers() {
  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.querySelector(`[data-content="${target}"]`).classList.add('active');
    });
  });

  // Login
  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      await api.login(email, password);
      navigate('/dashboard');
    } catch (err) {
      alert(err.message);
    }
  });

  // Register
  document.getElementById('register-btn')?.addEventListener('click', async () => {
    const orgName = document.getElementById('register-org').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
      await api.register(email, password, orgName);
      navigate('/dashboard');
    } catch (err) {
      alert(err.message);
    }
  });
}

function attachDashboardHandlers() {
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await api.logout();
    navigate('/login');
  });

  // Delete QR
  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this QR code?')) return;

      try {
        await api.deleteLink(btn.dataset.token);
        await render();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function attachEditorHandlers(token) {
  let qrCode = null;
  const link = state.links.find(l => l.token === token);
  const isLocked = link?.style_locked_at;

  const config = {
    dotsColor: link?.style_json?.dotsColor || '#000000',
    backgroundColor: link?.style_json?.backgroundColor || '#ffffff',
  };

  function renderPreview() {
    const data = `${window.location.origin}/r/${token === 'new' ? 'PREVIEW' : token}`;

    const options = {
      width: 400,
      height: 400,
      type: 'svg',
      data,
      dotsOptions: {
        color: config.dotsColor,
        type: 'rounded',
      },
      backgroundOptions: {
        color: config.backgroundColor,
      },
    };

    if (!qrCode) {
      qrCode = new QRCodeStyling(options);
      qrCode.append(document.getElementById('qr-preview'));
    } else {
      qrCode.update(options);
    }

    // Add watermark if not locked
    if (!isLocked && token !== 'new') {
      setTimeout(() => addWatermark(), 100);
    }
  }

  function addWatermark() {
    const svg = document.querySelector('#qr-preview svg');
    if (!svg) return;

    const oldWatermark = svg.querySelector('.watermark');
    if (oldWatermark) oldWatermark.remove();

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'watermark');
    text.setAttribute('x', '50%');
    text.setAttribute('y', '50%');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', 'rgba(255, 0, 0, 0.3)');
    text.setAttribute('font-size', '48');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('transform', 'rotate(-30 200 200)');
    text.textContent = 'PREVIEW';
    svg.appendChild(text);
  }

  function removeWatermark() {
    const watermark = document.querySelector('#qr-preview .watermark');
    if (watermark) watermark.remove();
  }

  // Initial render
  renderPreview();

  // Color inputs
  if (!isLocked) {
    document.getElementById('dots-color').addEventListener('input', (e) => {
      config.dotsColor = e.target.value;
      renderPreview();
    });

    document.getElementById('bg-color').addEventListener('input', (e) => {
      config.backgroundColor = e.target.value;
      renderPreview();
    });
  }

  // Save draft
  document.getElementById('save-draft')?.addEventListener('click', async () => {
    const destination_url = document.getElementById('destination-url').value;
    const name = document.getElementById('qr-name').value;

    if (!destination_url || !destination_url.match(/^https?:\/\//)) {
      alert('Please enter a valid URL (http:// or https://)');
      return;
    }

    try {
      if (token === 'new') {
        const result = await api.createLink(destination_url, name, config);
        navigate(`/editor/${result.link.token}`);
      } else {
        await api.updateLink(token, {
          destination_url,
          name,
          style_json: isLocked ? undefined : config,
        });
        alert('Saved!');
      }
    } catch (err) {
      alert(err.message);
    }
  });

  // Download handlers
  async function handleDownload(format) {
    try {
      const result = await api.downloadLink(token, format);

      if (!result.alreadyLocked) {
        alert('QR Code activated! Visual is now locked. You can still edit the destination URL.');
      }

      // Remove watermark for download
      removeWatermark();

      // Download
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: `qr-${token}.${format}`,
          types: [{
            description: format === 'png' ? 'PNG Image' : 'SVG Image',
            accept: { [`image/${format}`]: [`.${format}`] },
          }],
        });

        const writable = await handle.createWritable();
        const blob = await new Promise(resolve => qrCode.getRawData(format).then(resolve));
        await writable.write(blob);
        await writable.close();
      } else {
        const blob = await new Promise(resolve => qrCode.getRawData(format).then(resolve));
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-${token}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      // Reload to show locked state
      await render();
    } catch (err) {
      alert(err.message);
    }
  }

  document.getElementById('download-svg')?.addEventListener('click', () => handleDownload('svg'));
  document.getElementById('download-png')?.addEventListener('click', () => handleDownload('png'));
}

// ========== HELPERS ==========

function getEffectiveLimit(org) {
  const PLANS = {
    FREE: 3,
    STARTER: 20,
    PRO: 35,
    ELITE: 80,
    VOUCHER_FREE: 1,
  };

  const now = new Date();
  const trialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : null;

  if (trialEnd && now < trialEnd) {
    return PLANS.STARTER; // Trial = STARTER limit
  }

  return PLANS[org.plan_code] || PLANS.FREE;
}

function isTrialActive(org) {
  if (!org.trial_ends_at) return false;
  const now = new Date();
  return now < new Date(org.trial_ends_at);
}

// Event delegation for navigation
document.addEventListener('click', (e) => {
  if (e.target.dataset.navigate) {
    e.preventDefault();
    navigate(e.target.dataset.navigate);
  }
});

window.addEventListener('popstate', render);

// Init
render();
