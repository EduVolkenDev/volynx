import { persistVolynxSession } from "./auth-session.js";

async function loadConfig() {
  const res = await fetch("/config.json", { cache: "no-store" });
  if (!res.ok) throw new Error("config.json not found.");
  return await res.json();
}

const iconEl      = document.getElementById("confirmIcon");
const spinnerEl   = document.getElementById("confirmSpinner");
const titleEl     = document.getElementById("confirmTitle");
const msgEl       = document.getElementById("confirmMsg");
const countdownEl = document.getElementById("confirmCountdown");
const btnLogin    = document.getElementById("confirmBtn");
const btnRetry    = document.getElementById("confirmBtnRetry");

function finishSession(session) {
  if (!session?.access_token || !session.refresh_token) return false;
  persistVolynxSession(session);
  window.location.replace(window.VxReturn?.consume('/profile/?welcome=1') || '/profile/?welcome=1');
  return true;
}

function showSuccess() {
  try {
    window.VxAnalytics?.track("signup_completed", { label: "email_confirmed" });
  } catch (_) {
    // Confirmation remains independent from optional analytics.
  }
  if (spinnerEl) spinnerEl.hidden = true;
  iconEl.classList.add("is-success");
  iconEl.textContent = "";
  iconEl.appendChild(document.createTextNode("\u2713"));

  titleEl.textContent = "Email confirmed";
  msgEl.textContent   = "Your account is verified. You can now sign in.";

  const loginHref = window.VxReturn
    ? window.VxReturn.loginUrl(window.VxReturn.paramPath() || window.VxReturn.storedPath() || "/volynx-lab/")
    : "/login/";
  btnLogin.href = loginHref;
  btnLogin.hidden = false;

  countdownEl.hidden = false;
  let seconds = 5;
  countdownEl.textContent = `Redirecting to login in ${seconds}s...`;

  const timer = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(timer);
      window.location.href = loginHref;
      return;
    }
    countdownEl.textContent = `Redirecting to login in ${seconds}s...`;
  }, 1000);
}

function showError(errorMsg) {
  if (spinnerEl) spinnerEl.hidden = true;
  iconEl.classList.add("is-error");
  iconEl.textContent = "";
  iconEl.appendChild(document.createTextNode("\u2715"));

  titleEl.textContent = "Confirmation failed";
  msgEl.textContent   = errorMsg || "Invalid or expired link. Please try signing up again.";

  btnRetry.hidden = false;
  btnLogin.hidden = false;
}

async function confirm() {
  const params     = new URLSearchParams(window.location.search);
  if (params.get("type") === "recovery" || new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery") return;
  const token_hash = params.get("token_hash");
  const type       = params.get("type");
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  // Remove email-link credentials before calling the provider.
  if (token_hash || fragment.has('access_token')) {
    params.delete('token_hash');
    params.delete('type');
    history.replaceState(null, '', window.location.pathname + (params.size ? '?' + params.toString() : ''));
  }

  if (token_hash && type) {
    try {
      const cfg = await loadConfig();
      if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) {
        showError("Missing Supabase configuration.");
        return;
      }

      const res = await fetch(`${cfg.supabaseUrl}/auth/v1/verify`, {
        method: "POST",
        headers: {
          apikey: cfg.supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token_hash, type }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showError(data?.error_description || data?.msg || data?.error || "Verification failed.");
      } else {
        if (!finishSession(data.session || data)) showSuccess();
      }
    } catch (e) {
      showError(e?.message);
    }
    return;
  }

  if (fragment.has('access_token') && fragment.has('refresh_token')) {
    try {
      const cfg = await loadConfig();
      const response = await fetch(`${cfg.supabaseUrl}/auth/v1/user`, {
        headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${fragment.get('access_token')}` },
      });
      if (!response.ok) throw new Error('This confirmation link is invalid or has expired.');
      finishSession({ access_token: fragment.get('access_token'), refresh_token: fragment.get('refresh_token'), user: await response.json() });
    } catch (error) { showError(error.message); }
    return;
  }

  showError("Confirmation parameters not found.");
}

confirm();
