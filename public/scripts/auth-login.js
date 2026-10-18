import { persistVolynxSession } from "./auth-session.js";
import { passkeyErrorMessage } from "./auth-passkey-errors.js";

const DEFAULT_REDIRECT = "/volynx-lab/";

function t(key, fallback) {
  var lang = localStorage.getItem("volynx_lang") || "en";
  var dict = window.VX_TRANS && window.VX_TRANS[lang];
  return (dict && dict[key]) || fallback;
}

function resolveRedirect() {
  return window.VxReturn?.paramPath() || window.VxReturn?.storedPath() || DEFAULT_REDIRECT;
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

function localized(en, pt) {
  return (localStorage.getItem("volynx_lang") || "en").startsWith("pt") ? pt : en;
}

function createAuthClient(cfg) {
  if (!window.supabase?.createClient) throw new Error(localized("Authentication is loading. Please refresh.", "A autenticação está carregando. Atualize a página."));
  return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { flowType: "pkce" },
  });
}

(function init() {
  const form = document.getElementById("loginForm");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const btn = document.getElementById("submitBtn");
  const msg = document.getElementById("msg");

  if (!form || !emailEl || !passEl || !btn || !msg) return;

  const googleBtn = document.getElementById("googleSignInBtn");
  const appleBtn = document.getElementById("appleSignInBtn");
  const passkeyBtn = document.getElementById("passkeySignInBtn");
  const alternativesStatus = document.getElementById("loginAlternativesStatus");
  const alternatives = document.getElementById("loginAlternatives");
  let authClient = null;

  function finishSignIn(session, email) {
    persistVolynxSession(session, email);
    const redirect = resolveRedirect();
    const isProductReturn = redirect !== DEFAULT_REDIRECT
      && redirect !== "/profile/"
      && redirect !== "/profile"
      && !redirect.startsWith("/profile/?")
      && redirect.startsWith("/");
    if (window.VxReturn) window.VxReturn.consume(redirect);
    else localStorage.removeItem("volynx_post_login_next");
    window.location.href = isProductReturn ? redirect : "/profile/?welcome=1";
  }

  async function prepareAlternatives() {
    try {
      const cfg = await loadConfig();
      if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) throw new Error("Missing authentication configuration.");
      authClient = createAuthClient(cfg);
      const response = await fetch(`${cfg.supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: cfg.supabaseAnonKey }, cache: "no-store",
      });
      if (!response.ok) throw new Error("Authentication options unavailable.");
      const settings = await response.json();
      const available = {
        google: settings.external?.google === true,
        apple: settings.external?.apple === true,
        passkey: settings.passkeys_enabled === true
          && Boolean(window.PublicKeyCredential && window.isSecureContext)
          && typeof authClient.auth.signInWithPasskey === "function",
      };
      for (const [button, enabled] of [[googleBtn, available.google], [appleBtn, available.apple], [passkeyBtn, available.passkey]]) {
        if (!button) continue;
        button.hidden = !enabled;
        button.disabled = !enabled;
      }
      if (alternatives) alternatives.hidden = !Object.values(available).some(Boolean);
      if (alternativesStatus) alternativesStatus.textContent = "";
    } catch (_) {
      if (alternatives) alternatives.hidden = true;
    }
  }

  async function startSocialSignIn(provider, button) {
    if (!authClient || button.disabled) return;
    button.disabled = true;
    if (alternativesStatus) alternativesStatus.textContent = localized("Opening secure sign-in...", "Abrindo o acesso seguro...");
    try {
      if (window.VxReturn) window.VxReturn.remember(resolveRedirect());
      const { error } = await authClient.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/oauth/` },
      });
      if (error) throw error;
    } catch (error) {
      if (alternativesStatus) alternativesStatus.textContent = error?.message || localized("Could not start sign-in. Please try again.", "Não foi possível iniciar o acesso. Tente novamente.");
      button.disabled = false;
    }
  }

  googleBtn?.addEventListener("click", () => startSocialSignIn("google", googleBtn));
  appleBtn?.addEventListener("click", () => startSocialSignIn("apple", appleBtn));
  passkeyBtn?.addEventListener("click", async () => {
    if (!authClient || passkeyBtn.disabled) return;
    passkeyBtn.disabled = true;
    if (alternativesStatus) alternativesStatus.textContent = localized("Choose your saved passkey on this device.", "Escolha sua chave de acesso salva neste dispositivo.");
    try {
      const { data, error } = await authClient.auth.signInWithPasskey();
      if (error) throw error;
      if (!data?.session) throw new Error(localized("No session was returned.", "Nenhuma sessão foi retornada."));
      finishSignIn(data.session, data.user?.email);
    } catch (error) {
      if (alternativesStatus) alternativesStatus.textContent = passkeyErrorMessage(error, localStorage.getItem("volynx_lang") || "en");
      if (error?.code === "passkey_disabled") {
        passkeyBtn.hidden = true;
        if (alternatives && googleBtn?.hidden && appleBtn?.hidden) alternatives.hidden = true;
      } else {
        passkeyBtn.disabled = false;
      }
    }
  });

  prepareAlternatives();

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

      setMsg(msg, t("login.msg_welcome", "Welcome back. Redirecting..."), "ok");
      finishSignIn(session, email);
    } catch (err) {
      setMsg(msg, err?.message || t("login.err_failed", "Sign in failed. Please try again."), "err");
    } finally {
      btn.disabled = false;
    }
  });
})();
