import { persistVolynxSession } from "./auth-session.js";

const status = document.getElementById("oauthCallbackStatus");
const retry = document.getElementById("oauthCallbackRetry");

function localized(en, pt) {
  return (localStorage.getItem("volynx_lang") || "en").startsWith("pt") ? pt : en;
}

function showError(message) {
  if (status) status.textContent = message;
  if (retry) retry.hidden = false;
}

async function finishOAuth() {
  const params = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const providerError = params.get("error_description") || fragment.get("error_description") || params.get("error") || fragment.get("error");
  if (providerError) {
    history.replaceState(null, "", window.location.pathname);
    showError(providerError === "access_denied"
      ? localized("Sign in was cancelled. You can try again.", "O acesso foi cancelado. Você pode tentar novamente.")
      : providerError);
    return;
  }
  const code = params.get("code");
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  history.replaceState(null, "", window.location.pathname);
  if (!code && (!accessToken || !refreshToken)) {
    showError(localized("Sign in was not completed. Please try again.", "O acesso não foi concluído. Tente novamente."));
    return;
  }

  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Missing authentication configuration.");
    const cfg = await response.json();
    if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || !window.supabase?.createClient) throw new Error("Authentication is unavailable.");
    const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { detectSessionInUrl: false, flowType: "pkce" },
    });
    const { data, error } = code
      ? await client.auth.exchangeCodeForSession(code)
      : await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    if (!data?.session?.access_token || !data.session.refresh_token) throw new Error(localized("Sign in did not return a session. Please try again.", "O acesso não retornou uma sessão. Tente novamente."));
    persistVolynxSession(data.session);

    const destination = window.VxReturn?.consume("/volynx-lab/") || "/volynx-lab/";
    const isProductReturn = destination !== "/volynx-lab/"
      && destination !== "/profile/"
      && destination !== "/profile"
      && !destination.startsWith("/profile/?")
      && destination.startsWith("/") && !destination.startsWith("//");
    window.location.replace(isProductReturn ? destination : "/profile/?welcome=1");
  } catch (error) {
    showError(error?.message || localized("Could not complete sign in.", "Não foi possível concluir o acesso."));
  }
}

finishOAuth();
