import { getSupabaseClient } from "/src/lib/supabase-client.js";

const iconEl  = document.getElementById("icon");
const titleEl = document.getElementById("title");
const msgEl   = document.getElementById("msg");
const btnEl   = document.getElementById("btn");

function showSuccess() {
  iconEl.textContent  = "✓";
  titleEl.textContent = "E-mail confirmado com sucesso";
  msgEl.textContent   = "Sua conta foi verificada. Redirecionando para o login…";
  btnEl.style.display = "inline-flex";
  setTimeout(() => { window.location.href = "/login"; }, 2500);
}

function showError(msg) {
  iconEl.textContent  = "✕";
  titleEl.textContent = "Falha na confirmação";
  msgEl.textContent   = msg || "Link inválido ou expirado. Tente cadastrar novamente.";
  btnEl.style.display = "inline-flex";
}

async function confirm() {
  const params     = new URLSearchParams(window.location.search);
  const token_hash = params.get("token_hash");
  const type       = params.get("type");

  // Flow PKCE (padrão atual do Supabase)
  if (token_hash && type) {
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (error) { showError(error.message); } else { showSuccess(); }
    } catch (e) {
      showError(e?.message);
    }
    return;
  }

  // Flow legado: tokens no hash (#access_token=...)
  const hash        = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hash.get("access_token");
  if (accessToken) {
    showSuccess();
    return;
  }

  showError("Parâmetros de confirmação não encontrados.");
}

confirm();
