const DEFAULT_REDIRECT = "/volynx-lab/studio/";

function t(key, fallback) {
  var lang = localStorage.getItem("volynx_lang") || "en";
  var dict = window.VX_TRANS && window.VX_TRANS[lang];
  return (dict && dict[key]) || fallback;
}

function resolveRedirect() {
  try {
    const url = new URL(window.location.href);
    const next = url.searchParams.get("next") || "";
    if (next.startsWith("/") && !next.startsWith("//")) return next;
  } catch {}
  return DEFAULT_REDIRECT;
}

async function loadConfig() {
  const res = await fetch("/config.json", { cache: "no-store" });
  if (!res.ok) throw new Error("config.json not found.");
  return await res.json();
}

async function supabasePasswordGrant({ supabaseUrl, supabaseAnonKey, email, password }) {
  const url = `${supabaseUrl}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error_description || data?.msg || data?.error || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function setMsg(el, text, kind) {
  el.textContent = text || "";
  el.classList.remove("err", "ok");
  if (kind) el.classList.add(kind);
}

function persistSession(session, email) {
  localStorage.setItem("volynx_access_token", session.access_token || "");
  localStorage.setItem("volynx_refresh_token", session.refresh_token || "");
  localStorage.setItem("volynx_user_email", email || session?.user?.email || "");
  localStorage.setItem("volynx_session", JSON.stringify({
    access_token: session.access_token || "",
    refresh_token: session.refresh_token || "",
    expires_at: session.expires_at || null,
    expires_in: session.expires_in || null,
    user: session.user || null
  }));
}

(function init() {
  const form = document.getElementById("loginForm");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const btn = document.getElementById("submitBtn");
  const msg = document.getElementById("msg");

  if (!form || !emailEl || !passEl || !btn || !msg) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = String(emailEl.value || "").trim();
    const password = String(passEl.value || "");

    if (!email || !password) {
      setMsg(msg, t("login.err_fill", "Please fill in email and password."), "err");
      return;
    }

    btn.disabled = true;
    setMsg(msg, t("login.msg_signing", "Signing in..."), "");

    try {
      const cfg = await loadConfig();
      if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || String(cfg.supabaseAnonKey).includes("YOUR_")) {
        throw new Error("Configure SUPABASE_URL and SUPABASE_ANON_KEY in /config.json.");
      }

      const session = await supabasePasswordGrant({
        supabaseUrl: cfg.supabaseUrl,
        supabaseAnonKey: cfg.supabaseAnonKey,
        email,
        password
      });

      persistSession(session, email);
      localStorage.setItem("volynx_post_login_next", resolveRedirect());
      setMsg(msg, t("login.msg_welcome", "Welcome back. Redirecting..."), "ok");
      window.location.href = "/profile/?welcome=1";
    } catch (err) {
      setMsg(msg, err?.message || t("login.err_failed", "Sign in failed. Please try again."), "err");
    } finally {
      btn.disabled = false;
    }
  });
})();
