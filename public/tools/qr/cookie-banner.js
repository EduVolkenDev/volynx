/**
 * VOLYNX Cookie Consent Banner — standalone version
 * Uses same localStorage key (volynx_consent_v1) across all Volynx pages.
 * Usage: <script src="/cookie-banner.js"></script>
 */
(function () {
  const KEY = "volynx_consent_v1";

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
  }
  function write(consent) {
    localStorage.setItem(KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent("volynx:consent", { detail: consent }));
  }

  // Already consented — do nothing
  if (read()) return;

  // Inject styles
  const style = document.createElement("style");
  style.textContent = `
    .vx-cookie {
      position: fixed;
      inset: auto 18px 18px 18px;
      z-index: 99999;
      display: grid;
      place-items: end center;
    }
    .vx-cookie__card {
      width: min(560px, 100%);
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(10,8,24,0.72);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 22px 46px rgba(0,0,0,0.85), 0 0 26px rgba(167,139,250,0.18);
      overflow: hidden;
      position: relative;
      transform: translateY(10px);
      opacity: 0;
      transition: transform .16s ease, opacity .16s ease;
      font-family: 'Sora', 'Manrope', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }
    .vx-cookie.is-on .vx-cookie__card {
      transform: translateY(0);
      opacity: 1;
    }
    .vx-cookie__glow {
      position: absolute;
      inset: -40%;
      background:
        radial-gradient(circle at 20% 20%, rgba(4,229,255,0.18), transparent 45%),
        radial-gradient(circle at 80% 70%, rgba(167,139,250,0.18), transparent 45%);
      filter: blur(10px);
      pointer-events: none;
    }
    .vx-cookie__head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 14px 0;
      position: relative;
    }
    .vx-cookie__badge {
      font-weight: 800;
      letter-spacing: .16em;
      font-size: 11px;
      padding: 8px 10px;
      border-radius: 999px;
      border: 1px solid rgba(160,252,252,0.22);
      background: rgba(4,6,13,0.45);
      color: rgba(200,245,255,0.92);
      text-transform: uppercase;
      white-space: nowrap;
    }
    .vx-cookie__title {
      font-weight: 800;
      color: #fff;
      letter-spacing: .08em;
    }
    .vx-cookie__text {
      padding: 10px 14px 0;
      margin: 0;
      color: rgba(230,232,255,0.86);
      line-height: 1.5;
      font-size: 14px;
      position: relative;
    }
    .vx-cookie__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 12px 14px 14px;
      position: relative;
    }
    .vx-btn {
      font-weight: 800;
      letter-spacing: .14em;
      text-transform: uppercase;
      font-size: 11px;
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.18);
      background: rgba(10,8,24,0.60);
      color: #fff;
      cursor: pointer;
      transition: filter .18s ease, transform .18s ease;
    }
    .vx-btn:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }
    .vx-btn--primary {
      background: radial-gradient(9% 100% at 50% 50%, rgba(245,231,145,0.55) 20%, rgba(210,202,54,0.35) 120%, rgba(223,221,121,0.65) 250%, rgba(201,196,111,0.40) 392%);
      border: 1px solid rgba(255,255,255,0.34);
    }
    .vx-btn--soft {
      border: 1px solid rgba(160,252,252,0.22);
      box-shadow: 0 0 18px rgba(4,229,255,0.12);
    }
    .vx-btn--ghost {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.18);
    }
    .vx-cookie__link {
      display: inline-block;
      padding: 0 14px 14px;
      font-size: 12px;
      color: rgba(200,245,255,0.85);
      text-decoration: underline;
      position: relative;
    }
    .vx-cookie__prefs {
      padding: 0 14px 14px;
      position: relative;
    }
    .vx-cookie__prefsTitle {
      font-weight: 800;
      letter-spacing: .10em;
      text-transform: uppercase;
      font-size: 12px;
      color: rgba(255,255,255,0.92);
      margin: 8px 0 8px;
    }
    .vx-toggle {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      user-select: none;
      color: rgba(230,232,255,0.88);
      font-size: 13px;
      cursor: pointer;
    }
    .vx-toggle input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .vx-toggle__ui {
      width: 44px;
      height: 26px;
      border-radius: 999px;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.18);
      position: relative;
      flex: 0 0 auto;
    }
    .vx-toggle__ui::after {
      content: "";
      position: absolute;
      width: 18px;
      height: 18px;
      top: 50%;
      left: 4px;
      transform: translateY(-50%);
      border-radius: 50%;
      background: rgba(255,255,255,0.78);
      box-shadow: 0 6px 18px rgba(0,0,0,0.55);
      transition: left .16s ease, background .16s ease;
    }
    .vx-toggle input:checked + .vx-toggle__ui {
      background: rgba(4,229,255,0.16);
      border-color: rgba(160,252,252,0.26);
    }
    .vx-toggle input:checked + .vx-toggle__ui::after {
      left: 22px;
      background: rgba(245,231,145,0.85);
    }
    .vx-toggle__label small {
      opacity: .78;
      font-weight: 500;
      margin-left: 6px;
    }
    .vx-cookie__prefsActions {
      display: flex;
      justify-content: flex-end;
      padding-top: 6px;
    }
    @media (max-width: 480px) {
      .vx-cookie { inset: auto 12px 12px 12px; }
    }
  `;
  document.head.appendChild(style);

  // Inject HTML
  const wrapper = document.createElement("div");
  wrapper.className = "vx-cookie";
  wrapper.id = "vxCookie";
  wrapper.setAttribute("role", "dialog");
  wrapper.setAttribute("aria-modal", "true");
  wrapper.setAttribute("aria-label", "Cookie preferences");
  wrapper.innerHTML = `
    <div class="vx-cookie__card">
      <div class="vx-cookie__glow" aria-hidden="true"></div>
      <div class="vx-cookie__head">
        <div class="vx-cookie__badge" aria-hidden="true">VOLYNX</div>
        <div class="vx-cookie__title">Cookies & Privacy</div>
      </div>
      <p class="vx-cookie__text">
        We use essential cookies for the platform to work. With your permission, we use analytics cookies to
        improve the experience and track impact responsibly. You are in control.
      </p>
      <div class="vx-cookie__actions">
        <button class="vx-btn vx-btn--ghost" id="vxCookiePrefs" type="button">Preferences</button>
        <button class="vx-btn vx-btn--soft" id="vxCookieReject" type="button">Reject</button>
        <button class="vx-btn vx-btn--primary" id="vxCookieAccept" type="button">Accept</button>
      </div>
      <a class="vx-cookie__link" href="/privacy/" rel="noopener">Privacy policy</a>
      <div class="vx-cookie__prefs" id="vxCookiePanel" hidden>
        <div class="vx-cookie__prefsTitle">Preferences</div>
        <label class="vx-toggle">
          <input type="checkbox" checked disabled />
          <span class="vx-toggle__ui"></span>
          <span class="vx-toggle__label">Essential <small>Always on</small></span>
        </label>
        <label class="vx-toggle">
          <input type="checkbox" id="vxConsentAnalytics" />
          <span class="vx-toggle__ui"></span>
          <span class="vx-toggle__label">Analytics <small>Helps improve the experience</small></span>
        </label>
        <div class="vx-cookie__prefsActions">
          <button class="vx-btn vx-btn--soft" id="vxCookieSave" type="button">Save</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);

  // Show with animation
  requestAnimationFrame(() => wrapper.classList.add("is-on"));

  // Logic
  const panel = document.getElementById("vxCookiePanel");
  const chkAnalytics = document.getElementById("vxConsentAnalytics");

  function close() {
    wrapper.classList.remove("is-on");
    setTimeout(() => wrapper.remove(), 160);
  }

  document.getElementById("vxCookieAccept").addEventListener("click", () => {
    write({ essential: true, analytics: true, ts: Date.now() });
    close();
  });

  document.getElementById("vxCookieReject").addEventListener("click", () => {
    write({ essential: true, analytics: false, ts: Date.now() });
    close();
  });

  document.getElementById("vxCookiePrefs").addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      const s = read();
      chkAnalytics.checked = !!(s && s.analytics);
    }
  });

  document.getElementById("vxCookieSave").addEventListener("click", () => {
    write({ essential: true, analytics: chkAnalytics.checked, ts: Date.now() });
    close();
  });
})();
