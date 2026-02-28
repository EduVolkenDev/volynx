async function loadConfig() {
  const res = await fetch("/config.json", { cache: "no-store" });
  if (!res.ok) throw new Error("config.json não encontrado (adicione /config.json no deploy).");
  return await res.json();
}

async function supabaseSignup({ supabaseUrl, supabaseAnonKey, email, password }) {
  const url = `${supabaseUrl}/auth/v1/signup`;
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
  return data; // { user, session? }
}

function setMsg(el, text, kind) {
  el.textContent = text || "";
  el.classList.remove("err", "ok");
  if (kind) el.classList.add(kind);
}

(function init() {
  const form = document.getElementById("signupForm");
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
      setMsg(msg, "Preencha email e senha.", "err");
      return;
    }

    btn.disabled = true;
    setMsg(msg, "Criando conta…", "");

    try {
      const cfg = await loadConfig();

      if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || String(cfg.supabaseAnonKey).includes("YOUR_")) {
        throw new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY em /config.json.");
      }

      const out = await supabaseSignup({
        supabaseUrl: cfg.supabaseUrl,
        supabaseAnonKey: cfg.supabaseAnonKey,
        email,
        password
      });

      // Se o Supabase estiver com confirmação de email, session pode vir null
      if (out?.session?.access_token) {
        localStorage.setItem("volynx_access_token", out.session.access_token);
        localStorage.setItem("volynx_refresh_token", out.session.refresh_token || "");
        localStorage.setItem("volynx_user_email", email);
        setMsg(msg, "Conta criada e logada. Indo para o Studio…", "ok");
        window.location.href = "/studio/";
        return;
      }

      setMsg(msg, "Conta criada. Verifique seu email para confirmar e depois faça login.", "ok");
      setTimeout(() => { window.location.href = "/login/"; }, 1200);
    } catch (err) {
      setMsg(msg, err?.message || "Falha ao criar conta.", "err");
    } finally {
      btn.disabled = false;
    }
  });
})();