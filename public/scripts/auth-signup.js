const LOGIN_PATH = "/login/";
const DEFAULT_REDIRECT = "/volynx-lab/studio/";

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
  if (!res.ok) throw new Error("config.json não encontrado na raiz pública do deploy.");
  return await res.json();
}

async function supabaseSignup({ supabaseUrl, supabaseAnonKey, email, password }) {
  const url = `${supabaseUrl}/auth/v1/signup`;
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
    const msg = data?.error_description || data?.msg || data?.error || `Erro ${res.status}`;
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

      if (out?.session?.access_token) {
        persistSession(out.session, email);
        setMsg(msg, "Conta criada e logada. Indo para o Studio…", "ok");
        window.location.href = resolveRedirect();
        return;
      }

      setMsg(msg, "Conta criada. Verifique seu email para confirmar e depois faça login.", "ok");
      setTimeout(() => {
        window.location.href = `${LOGIN_PATH}?next=${encodeURIComponent(resolveRedirect())}`;
      }, 1200);
    } catch (err) {
      setMsg(msg, err?.message || "Falha ao criar conta.", "err");
    } finally {
      btn.disabled = false;
    }
  });
})();
