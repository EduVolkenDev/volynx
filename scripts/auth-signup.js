alert("AUTH SIGNUP JS CARREGOU");
import { getSupabaseClient } from "/src/lib/supabase-client.js";

async function loadConfig() {
  const res = await fetch("/config.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("config.json não encontrado (adicione /config.json no deploy).");
  }
  return await res.json();
}

async function supabaseSignup({ email, password }) {
  const supabase = await getSupabaseClient();

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const redirectTo = isLocalhost
    ? "http://localhost:4321/auth/confirm"
    : "https://volynx.world/auth/confirm";

  console.log("SIGNUP_REDIRECT_TO =", redirectTo);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo
    }
  });

  console.log("SIGNUP_RESPONSE =", data);
  console.log("SIGNUP_ERROR =", error);

  if (error) {
    throw new Error(error.message || "Falha ao criar conta.");
  }

  return data;
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

      if (
        !cfg?.supabaseUrl ||
        !cfg?.supabaseAnonKey ||
        String(cfg.supabaseAnonKey).includes("YOUR_")
      ) {
        throw new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY em /config.json.");
      }

      const out = await supabaseSignup({
        email,
        password
      });

      if (out?.session?.access_token) {
        localStorage.setItem("volynx_access_token", out.session.access_token);
        localStorage.setItem("volynx_refresh_token", out.session.refresh_token || "");
        localStorage.setItem("volynx_user_email", email);
        setMsg(msg, "Conta criada e logada. Indo para o Studio…", "ok");
        window.location.href = "/studio/";
        return;
      }

      setMsg(msg, "Conta criada. Verifique seu email para confirmar e depois faça login.", "ok");
      setTimeout(() => {
        window.location.href = "/login/";
      }, 1200);
    } catch (err) {
      const errorMessage = err?.message || "Falha ao criar conta.";
      setMsg(msg, errorMessage, "err");
      console.error("SIGNUP_ERROR =", err);
    } finally {
      btn.disabled = false;
    }
  });
})();