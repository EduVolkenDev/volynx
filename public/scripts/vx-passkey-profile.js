import { persistVolynxSession } from "./auth-session.js";
import { passkeyErrorMessage } from "./auth-passkey-errors.js";

const section = document.getElementById("passkeySettings");
const button = document.getElementById("registerPasskeyBtn");
const status = document.getElementById("registerPasskeyStatus");
const list = document.getElementById("passkeyList");

let client = null;
let busy = false;

function localized(en, pt) {
  return (localStorage.getItem("volynx_lang") || "en").startsWith("pt") ? pt : en;
}

function showStatus(message) {
  if (status) status.textContent = message;
}

function setBusy(value) {
  busy = value;
  if (button) button.disabled = value || !client || !window.PublicKeyCredential || !window.isSecureContext;
  list?.querySelectorAll("button").forEach((item) => { item.disabled = value; });
}

function errorMessage(error, fallback) {
  return error?.code || error?.name
    ? passkeyErrorMessage(error, localStorage.getItem("volynx_lang") || "en")
    : fallback;
}

async function authenticatedClient() {
  if (!client) throw new Error(localized("Passkeys are unavailable.", "As chaves de acesso estão indisponíveis."));
  const { data: account, error: userError } = await client.auth.getUser();
  if (userError || !account?.user) throw userError || new Error(localized("Sign in again to manage passkeys.", "Entre novamente para gerenciar suas chaves."));
  const { data: current } = await client.auth.getSession();
  if (current?.session) persistVolynxSession(current.session);
  return client;
}

async function renderPasskeys() {
  if (!list) return;
  const auth = await authenticatedClient();
  const { data, error } = await auth.auth.passkey.list();
  if (error) throw error;
  const passkeys = Array.isArray(data) ? data : Array.isArray(data?.passkeys) ? data.passkeys : [];
  list.replaceChildren();
  for (const passkey of passkeys) {
    const item = document.createElement("li");
    item.className = "profile-passkey__item";
    const name = document.createElement("span");
    name.className = "profile-passkey__name";
    name.textContent = passkey.friendly_name || localized("Saved passkey", "Chave de acesso salva");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "profile-passkey__remove";
    remove.textContent = localized("Remove", "Remover");
    remove.setAttribute("aria-label", localized(`Remove ${name.textContent}`, `Remover ${name.textContent}`));
    remove.addEventListener("click", async () => {
      if (busy || !window.confirm(localized("Remove this passkey? You can still sign in with your password.", "Remover esta chave de acesso? Você ainda poderá entrar com sua senha."))) return;
      setBusy(true);
      showStatus(localized("Removing passkey…", "Removendo chave de acesso…"));
      try {
        const current = await authenticatedClient();
        const { error: removeError } = await current.auth.passkey.delete({ passkeyId: passkey.id });
        if (removeError) throw removeError;
        await renderPasskeys();
        showStatus(localized("Passkey removed.", "Chave de acesso removida."));
      } catch (error) {
        showStatus(errorMessage(error, localized("Could not remove the passkey.", "Não foi possível remover a chave.")));
      } finally {
        setBusy(false);
      }
    });
    item.append(name, remove);
    list.appendChild(item);
  }
  if (passkeys.length === 0) {
    const empty = document.createElement("li");
    empty.className = "profile-passkey__name";
    empty.textContent = localized("No passkeys saved yet.", "Nenhuma chave de acesso salva ainda.");
    list.appendChild(empty);
  }
  list.hidden = false;
}

button?.addEventListener("click", async () => {
  if (busy || button.disabled) return;
  setBusy(true);
  showStatus(localized("Confirm on your device to save this passkey…", "Confirme no dispositivo para salvar esta chave…"));
  try {
    const auth = await authenticatedClient();
    const { error } = await auth.auth.registerPasskey();
    if (error) throw error;
    await renderPasskeys();
    showStatus(localized("Passkey saved. You can use it next time you sign in.", "Chave salva. Você poderá usá-la no próximo acesso."));
  } catch (error) {
    showStatus(errorMessage(error, localized("Could not save the passkey.", "Não foi possível salvar a chave de acesso.")));
  } finally {
    setBusy(false);
  }
});

async function preparePasskeys() {
  if (!section || !button || !status || !list) return;
  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    if (!response.ok) return;
    const cfg = await response.json();
    if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || !client) return;
    const settingsResponse = await fetch(`${cfg.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: cfg.supabaseAnonKey }, cache: "no-store",
    });
    if (!settingsResponse.ok) return;
    const settings = await settingsResponse.json();
    if (settings.passkeys_enabled !== true) return;
    section.hidden = false;
    if (!window.PublicKeyCredential || !window.isSecureContext) {
      showStatus(localized("This browser or connection cannot use passkeys.", "Este navegador ou conexão não permite chaves de acesso."));
      return;
    }
    if (typeof client.auth.registerPasskey !== "function" || typeof client.auth.passkey?.list !== "function") {
      throw new Error(localized("Passkeys are unavailable in this version.", "As chaves não estão disponíveis nesta versão."));
    }
    await renderPasskeys();
    setBusy(false);
  } catch (error) {
    showStatus(errorMessage(error, localized("Could not load passkeys. Refresh to try again.", "Não foi possível carregar as chaves. Atualize para tentar novamente.")));
  }
}

if (window.VxProfileAuthClient) {
  client = window.VxProfileAuthClient;
  preparePasskeys();
} else {
  window.addEventListener("vx:profile-ready", () => {
    client = window.VxProfileAuthClient;
    preparePasskeys();
  }, { once: true });
}
