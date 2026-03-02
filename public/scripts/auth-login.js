async function loadConfig() {
  const res = await fetch("/config.json", { cache: "no-store" });
  if (!res.ok) throw new Error("config.json não encontrado (adicione /config.json no deploy).");
  return await res.json();
}

async function supabasePasswordGrant({ supabaseUrl, supabaseAnonKey, email, password }) {
  const url = `${supabaseUrl}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": supabaseAnonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error_description || data?.msg || data?.error || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return data; // { access_token, refresh_token, expires_in, token_type, user }
}

function setMsg(el, text, kind) {
  el.textContent = text || "";
  el.classList.remove("err", "ok");
  if (kind) el.classList.add(kind);
}

(function init() {
  const form = document.getElementById("loginForm");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const btn = document.getElementById("submitBtn");
  const msg = document.getElementById("msg");

  if (!form || !emailEl || !passEl || !btn || !msg) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // evita POST -> 405 em host estático

    const email = String(emailEl.value || "").trim();
    const password = String(passEl.value || "");

    if (!email || !password) {
      setMsg(msg, "Preencha email e senha.", "err");
      return;
    }

    btn.disabled = true;
    setMsg(msg, "Autenticando…", "");

    try {
      const cfg = await loadConfig();

      if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || String(cfg.supabaseAnonKey).includes("YOUR_")) {
        throw new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY em /config.json.");
      }

      const session = await supabasePasswordGrant({
        supabaseUrl: cfg.supabaseUrl,
        supabaseAnonKey: cfg.supabaseAnonKey,
        email,
        password
      });

      // Armazena sessão para o frontend consumir (Bearer token)
      localStorage.setItem("volynx_access_token", session.access_token);
      localStorage.setItem("volynx_refresh_token", session.refresh_token || "");
      localStorage.setItem("volynx_user_email", email);

      setMsg(msg, "Login OK. Redirecionando…", "ok");

      // Redireciona para Studio (ajuste se necessário)
      window.location.href = "/volynx-lab/studio/";
    } catch (err) {
      setMsg(msg, err?.message || "Falha no login.", "err");
    } finally {
      btn.disabled = false;
    }
  });
})();