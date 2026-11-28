/*
 * VOLYNX first-party analytics
 *
 * Collects only after the visitor has opted into analytics in the cookie
 * banner. Events are anonymous: no email address, form value, file name,
 * complete URL query string or raw error message is sent.
 */
(() => {
  if (window.VxAnalytics?.__initialized) return;

  const CONSENT_KEY = "volynx_consent_v1";
  const SESSION_KEY = "volynx_analytics_session_v1";
  const ATTRIBUTION_KEY = "volynx_campaign_attribution";
  const QUEUE_KEY = "__volynxAnalyticsQueue";
  const EVENT_NAMES = new Set([
    "page_view",
    "campaign_view",
    "cta_click",
    "signup_started",
    "signup_confirmation_requested",
    "signup_completed",
    "signup_resend_requested",
    "signup_failed",
    "checkout_started",
    "checkout_redirected",
    "checkout_failed",
    "lead_submitted",
    "tool_started",
    "activation_started",
    "activation_result",
    "upgrade_view",
  ]);
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  const PRIVATE_PAGE_PREFIXES = [
    "/account/",
    "/admin/",
    "/auth/",
    "/dashboard/",
    "/delivery/",
    "/profile/",
    "/recarregar/",
  ];
  const GOOGLE_MEASUREMENT_ID = "G-N820406NJ2";
  let googleStarted = false;
  let active = false;

  function startGoogleAnalytics() {
    window["ga-disable-" + GOOGLE_MEASUREMENT_ID] = false;
    if (googleStarted) return;
    googleStarted = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("js", new Date());
    window.gtag("config", GOOGLE_MEASUREMENT_ID, {
      send_page_view: false,
      page_location: window.location.origin + window.location.pathname,
      page_referrer: document.referrer ? new URL(document.referrer).origin : "",
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + GOOGLE_MEASUREMENT_ID;
    document.head.appendChild(script);
  }
  let pageViewTracked = false;
  let configPromise = null;

  function parseStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (_) {
      return null;
    }
  }

  function hasConsent() {
    return parseStorage(CONSENT_KEY)?.analytics === true;
  }

  function text(value, maxLength = 80) {
    const normalized = String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9._~:-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized.slice(0, maxLength);
  }

  function eventLabel(value) {
    return text(value, 80) || undefined;
  }

  function sessionId() {
    try {
      const existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const next = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, next);
      return next;
    } catch (_) {
      return crypto.randomUUID();
    }
  }

  function deviceType() {
    const width = window.innerWidth || 0;
    if (width && width < 640) return "mobile";
    if (width && width < 1024) return "tablet";
    return "desktop";
  }

  function currentAttribution() {
    const fromUrl = {};
    const params = new URLSearchParams(window.location.search);
    for (const key of UTM_KEYS) {
      const value = text(params.get(key), 80);
      if (value) fromUrl[key] = value;
    }

    let previous = {};
    try {
      previous = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || "{}") || {};
    } catch (_) {}

    const merged = { ...previous, ...fromUrl };
    try {
      if (Object.keys(merged).length) sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(merged));
    } catch (_) {}
    return merged;
  }

  function referrerHost() {
    try {
      return document.referrer ? new URL(document.referrer).hostname.toLowerCase().slice(0, 120) : undefined;
    } catch (_) {
      return undefined;
    }
  }

  function isPrivatePage() {
    return PRIVATE_PAGE_PREFIXES.some((prefix) => window.location.pathname.startsWith(prefix));
  }

  async function loadConfig() {
    if (!configPromise) {
      configPromise = fetch("/config.json", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .catch(() => null);
    }
    return configPromise;
  }

  async function transmit(payload) {
    const config = await loadConfig();
    const baseUrl = String(config?.functionsUrl || "").replace(/\/$/, "");
    if (!baseUrl) return false;

    try {
      await fetch(`${baseUrl}/track-analytics-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  function track(event, detail = {}) {
    if (!active || !hasConsent() || !EVENT_NAMES.has(event)) return false;

    if (!isPrivatePage() && window.gtag) {
      window.gtag("event", event, {
        send_to: GOOGLE_MEASUREMENT_ID,
        page_location: window.location.origin + window.location.pathname,
        event_label: eventLabel(detail?.label),
      });
    }
    const attribution = currentAttribution();
    const payload = {
      event_name: event,
      event_label: eventLabel(detail?.label),
      page_path: window.location.pathname || "/",
      session_id: sessionId(),
      referrer_host: referrerHost(),
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      locale: (document.documentElement.lang || navigator.language || "").slice(0, 16),
      device_type: deviceType(),
    };
    void transmit(payload);
    return true;
  }

  function trackCampaign(detail) {
    const label = eventLabel(detail?.event || detail?.campaign);
    const name = String(detail?.event || "").endsWith("_view") ? "campaign_view" : "cta_click";
    track(name, { label });
  }

  function drainQueue() {
    const queued = Array.isArray(window[QUEUE_KEY]) ? window[QUEUE_KEY].splice(0) : [];
    queued.forEach((item) => track(item?.event, item?.detail || {}));
  }

  function start() {
    if (active || !hasConsent()) return;
    if (!isPrivatePage()) startGoogleAnalytics();
    active = true;
    window.VxAnalytics.active = true;
    if (!pageViewTracked) {
      pageViewTracked = true;
      if (!isPrivatePage()) {
        track("page_view");
        if (window.location.pathname === "/tiktok/") track("campaign_view", { label: "tiktok" });
      }
    }
    drainQueue();
  }

  window.VxAnalytics = {
    __initialized: true,
    active: false,
    track,
    hasConsent,
  };

  window.addEventListener("volynx:consent", (event) => {
    if (event?.detail?.analytics === true) {
      start();
      return;
    }
    window["ga-disable-" + GOOGLE_MEASUREMENT_ID] = true;
    active = false;
    pageViewTracked = false;
    window.VxAnalytics.active = false;
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(ATTRIBUTION_KEY);
    } catch (_) {}
  });
  window.addEventListener("volynx:campaign-event", (event) => trackCampaign(event?.detail || {}));
  document.addEventListener("click", (event) => {
    const target = event.target?.closest?.("[data-analytics-event]");
    if (!target) return;
    track("cta_click", { label: target.dataset.campaignEvent || target.dataset.analyticsEvent });
  });

  start();
})();
