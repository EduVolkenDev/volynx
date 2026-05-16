/**
 * VX Token Refresh — keeps the Supabase access_token in localStorage fresh.
 *
 * Why: auth-login.js stores both access_token (1h TTL) and refresh_token
 * (~30 days TTL) but no code ever swaps them. After ~1h every authed call
 * (profile read, balance, ping_streak, RPC) returns 401 with
 * "JWT expired" until the user happens to log out and back in.
 *
 * What this does:
 *   - On page load: if access_token is missing or close to expiry (<5 min
 *     remaining), POST refresh_token to /auth/v1/token?grant_type=refresh_token
 *     and store the new pair.
 *   - Every 5 minutes while the tab is open: re-check and refresh ahead of
 *     expiry. The 1h Supabase TTL means we always renew at least 5x before
 *     it dies.
 *   - On `visibilitychange` (tab refocus): refresh check, so a user coming
 *     back after a long pause picks up a fresh token before any UI fires
 *     an authed request.
 *   - If refresh fails (refresh_token revoked/expired), clear both tokens
 *     so the next protected interaction redirects to /login/ instead of
 *     hammering 401s in a loop.
 *
 * This is a global page-load script; it does not need to be called by any
 * other code. Existing fetch() calls that read volynx_access_token from
 * localStorage will see the refreshed value automatically because the
 * refresh writes back to the same key before any user action happens.
 */
(function () {
  var ACCESS_KEY = "volynx_access_token";
  var REFRESH_KEY = "volynx_refresh_token";
  var REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // refresh when < 5 min left
  var POLL_INTERVAL_MS = 5 * 60 * 1000; // re-check every 5 min
  var inFlight = null;

  function readJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      return r.ok ? r.json() : Promise.reject(new Error("config " + r.status));
    });
  }

  function decodeExp(token) {
    try {
      var payload = token.split(".")[1];
      if (!payload) return 0;
      payload = payload.replace(/-/g, "+").replace(/_/g, "/");
      var data = JSON.parse(atob(payload));
      return (data && data.exp ? data.exp * 1000 : 0);
    } catch (_) {
      return 0;
    }
  }

  function clearAuth() {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem("volynx_session");
    } catch (_) {}
    try {
      document.documentElement.classList.remove("vx-authed");
    } catch (_) {}
  }

  function performRefresh() {
    if (inFlight) return inFlight;

    var refreshToken = "";
    try {
      refreshToken = localStorage.getItem(REFRESH_KEY) || "";
    } catch (_) {}
    if (!refreshToken) return Promise.resolve(null);

    inFlight = readJSON("/config.json")
      .then(function (cfg) {
        var url = String(cfg.supabaseUrl || "").replace(/\/$/, "") +
          "/auth/v1/token?grant_type=refresh_token";
        return fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": cfg.supabaseAnonKey || ""
          },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
      })
      .then(function (res) {
        if (!res.ok) {
          // Refresh token itself is dead — wipe the slate so no further
          // 401s fire, the user just goes through /login/ next time.
          if (res.status === 400 || res.status === 401) {
            clearAuth();
          }
          throw new Error("refresh " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.access_token) {
          throw new Error("refresh: empty response");
        }
        try {
          localStorage.setItem(ACCESS_KEY, data.access_token);
          if (data.refresh_token) {
            localStorage.setItem(REFRESH_KEY, data.refresh_token);
          }
          if (data.user && data.user.email) {
            localStorage.setItem("volynx_user_email", data.user.email);
          }
          localStorage.setItem("volynx_session", JSON.stringify({
            access_token: data.access_token,
            refresh_token: data.refresh_token || refreshToken,
            expires_at: data.expires_at || null,
            expires_in: data.expires_in || null,
            user: data.user || null
          }));
          if (window.VxAuthBridge) window.VxAuthBridge.sync();
          document.documentElement.classList.add("vx-authed");
        } catch (_) {}
        try {
          window.dispatchEvent(new CustomEvent("vx:token-refreshed", {
            detail: { access_token: data.access_token }
          }));
        } catch (_) {}
        return data.access_token;
      })
      .catch(function (err) {
        if (window.console && console.warn) {
          console.warn("[vx-token-refresh]", err && err.message ? err.message : err);
        }
        return null;
      })
      .then(function (result) {
        inFlight = null;
        return result;
      });

    return inFlight;
  }

  function maybeRefresh() {
    var token = "";
    try {
      token = localStorage.getItem(ACCESS_KEY) || "";
    } catch (_) {}
    if (!token) return Promise.resolve(null);

    var exp = decodeExp(token);
    var remaining = exp - Date.now();

    // Already expired or expiring soon — refresh now.
    if (remaining < REFRESH_THRESHOLD_MS) {
      return performRefresh();
    }
    return Promise.resolve(token);
  }

  // Public hook for code paths that want to ensure a fresh token before
  // making an authed request, e.g. await window.vxEnsureFreshToken();
  window.vxEnsureFreshToken = maybeRefresh;
  window.vxRefreshToken = performRefresh;

  function init() {
    maybeRefresh();
    setInterval(maybeRefresh, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") maybeRefresh();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
