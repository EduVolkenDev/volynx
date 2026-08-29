const DEFAULT_REDIRECT = "/volynx-lab/";

function t(key, fallback) {
  var lang = localStorage.getItem("volynx_lang") || "en";
  var dict = window.VX_TRANS && window.VX_TRANS[lang];
  return (dict && dict[key]) || fallback;
}

function resolveRedirect() {
  if (window.VxReturn) {
    return window.VxReturn.paramPath() || window.VxReturn.storedPath() || DEFAULT_REDIRECT;
  }
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

async function supabaseSignup({ supabaseUrl, supabaseAnonKey, email, password, fullName, username }) {
  const url = `${supabaseUrl}/auth/v1/signup`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password,
      data: {
        full_name: fullName || null,
        username: username || null,
      }
    })
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

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
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
  // Mirror tokens to cross-subdomain cookies so daily.volynx.world / cvitae.volynx.world see the session
  if (window.VxAuthBridge) window.VxAuthBridge.sync();
}

function showCheckEmail(email) {
  const signupState = document.getElementById("signupState");
  const checkState  = document.getElementById("checkEmailState");
  const checkMsg    = document.getElementById("checkMsg");

  if (signupState) signupState.hidden = true;
  if (checkState)  checkState.hidden  = false;

  // Inject the user's email into the message
  if (checkMsg) {
    const template = checkMsg.getAttribute("data-i18n-template") || checkMsg.innerHTML;
    checkMsg.setAttribute("data-i18n-template", template);
    checkMsg.removeAttribute("data-i18n-html");
    checkMsg.innerHTML = template.replace("{email}", escapeHtml(email));
  }
}

(function init() {
  const form      = document.getElementById("signupForm");
  const fullnameEl = document.getElementById("fullname");
  const usernameEl = document.getElementById("username");
  const emailEl   = document.getElementById("email");
  const passEl    = document.getElementById("password");
  const btn       = document.getElementById("submitBtn");
  const msg       = document.getElementById("msg");

  if (!form || !emailEl || !passEl || !btn || !msg) return;
  if (window.VxReturn) window.VxReturn.remember(resolveRedirect());

  // Auto-format username: lowercase, strip invalid chars
  if (usernameEl) {
    usernameEl.addEventListener("input", () => {
      usernameEl.value = usernameEl.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = String(fullnameEl?.value || "").trim();
    const username = String(usernameEl?.value || "").trim();
    const email    = String(emailEl.value || "").trim();
    const password = String(passEl.value || "");

    if (!fullName || !username || !email || !password) {
      setMsg(msg, t("signup.err_fill", "Please fill in all fields."), "err");
      return;
    }

    if (username.length < 3 || username.length > 30) {
      setMsg(msg, t("signup.err_username_len", "Username must be 3–30 characters."), "err");
      return;
    }

    btn.disabled = true;
    setMsg(msg, t("signup.msg_creating", "Creating your account..."), "");

    try {
      const cfg = await loadConfig();
      if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || String(cfg.supabaseAnonKey).includes("YOUR_")) {
        throw new Error("Configure SUPABASE_URL and SUPABASE_ANON_KEY in /config.json.");
      }

      const out = await supabaseSignup({
        supabaseUrl: cfg.supabaseUrl,
        supabaseAnonKey: cfg.supabaseAnonKey,
        email,
        password,
        fullName,
        username
      });

      // Rare: auto-login when email confirmation is disabled
      if (out?.session?.access_token) {
        persistSession(out.session, email);
        setMsg(msg, t("signup.msg_created", "Account created. Redirecting..."), "ok");
        const redirect = resolveRedirect();
        if (window.VxReturn) window.VxReturn.consume(redirect);
        window.location.href = redirect;
        return;
      }

      // Normal flow: email confirmation required
      showCheckEmail(email);

    } catch (err) {
      setMsg(msg, err?.message || t("signup.err_failed", "Failed to create account."), "err");
    } finally {
      btn.disabled = false;
    }
  });
})();
