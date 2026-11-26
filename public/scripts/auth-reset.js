import { persistVolynxSession } from "./auth-session.js";

const form = document.getElementById("resetForm");
const status = document.getElementById("resetStatus");
const save = document.getElementById("resetSave");
const password = document.getElementById("resetPassword");
const confirmation = document.getElementById("resetConfirm");
const retry = document.getElementById("resetRetry");
const continueLink = document.getElementById("resetContinue");
let client;
let recoverySession;
let statusMessage;

function text(en, pt) {
  return (document.documentElement.lang || "en").startsWith("pt") ? pt : en;
}

function message(en, pt) {
  statusMessage = { en, pt };
  status.textContent = text(en, pt);
}

window.addEventListener("vx:lang-changed", () => {
  if (statusMessage) status.textContent = text(statusMessage.en, statusMessage.pt);
});

function expired() {
  form.hidden = true;
  retry.hidden = false;
  message("This recovery link is invalid or expired. Request a new link.", "Este link é inválido ou expirou. Solicite um novo link.");
}

async function initialize() {
  const query = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, "", location.pathname);
  if (query.has("error") || fragment.has("error")) return expired();
  const tokenHash = query.get("token_hash");
  const isRecovery = (query.get("type") || fragment.get("type")) === "recovery";
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  if (!isRecovery || (!tokenHash && (!accessToken || !refreshToken))) return expired();

  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Configuration unavailable");
    const cfg = await response.json();
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { detectSessionInUrl: false, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = tokenHash
      ? await client.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
      : await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error || !data?.session?.access_token || !data.session.refresh_token) return expired();
    recoverySession = data.session;
    message("Choose a password with at least 6 characters.", "Escolha uma senha com pelo menos 6 caracteres.");
    form.hidden = false;
    password.focus();
  } catch {
    message("Could not verify your link. Please request a new link and try again.", "Não foi possível verificar seu link. Solicite outro e tente novamente.");
    retry.hidden = false;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client || !recoverySession || save.disabled) return;
  if (password.value.length < 6) {
    message("Use at least 6 characters.", "Use pelo menos 6 caracteres.");
    return;
  }
  if (password.value !== confirmation.value) {
    message("The passwords must match.", "As senhas precisam ser iguais.");
    return;
  }
  save.disabled = true;
  message("Saving your password…", "Salvando sua senha…");
  try {
    const { error } = await client.auth.updateUser({ password: password.value });
    if (error) throw error;
    let sessionSaved = true;
    try {
      persistVolynxSession(recoverySession);
    } catch {
      sessionSaved = false;
      continueLink.href = "/login/";
    }
    password.value = "";
    confirmation.value = "";
    form.hidden = true;
    continueLink.hidden = false;
    if (sessionSaved) {
      message("Password updated. You can open your account.", "Senha atualizada. Você pode abrir sua conta.");
    } else {
      message("Password updated. Sign in with your new password.", "Senha atualizada. Entre com sua nova senha.");
    }
  } catch (error) {
    message(error?.message || "Could not save your password. Please try again.", error?.message || "Não foi possível salvar sua senha. Tente novamente.");
  } finally {
    save.disabled = false;
  }
});

if (!window.VxReturn?.redirectingRecovery) initialize();
