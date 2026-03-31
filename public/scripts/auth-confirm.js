async function loadConfig() {
  const res = await fetch("/config.json", { cache: "no-store" });
  if (!res.ok) throw new Error("config.json not found.");
  return await res.json();
}

const iconEl      = document.getElementById("confirmIcon");
const spinnerEl   = document.getElementById("confirmSpinner");
const titleEl     = document.getElementById("confirmTitle");
const msgEl       = document.getElementById("confirmMsg");
const countdownEl = document.getElementById("confirmCountdown");
const btnLogin    = document.getElementById("confirmBtn");
const btnRetry    = document.getElementById("confirmBtnRetry");

function showSuccess() {
  if (spinnerEl) spinnerEl.hidden = true;
  iconEl.classList.add("is-success");
  iconEl.textContent = "";
  iconEl.appendChild(document.createTextNode("\u2713"));

  titleEl.textContent = "Email confirmed";
  msgEl.textContent   = "Your account is verified. You can now sign in.";

  btnLogin.hidden = false;

  countdownEl.hidden = false;
  let seconds = 5;
  countdownEl.textContent = `Redirecting to login in ${seconds}s...`;

  const timer = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(timer);
      window.location.href = "/login/";
      return;
    }
    countdownEl.textContent = `Redirecting to login in ${seconds}s...`;
  }, 1000);
}

function showError(errorMsg) {
  if (spinnerEl) spinnerEl.hidden = true;
  iconEl.classList.add("is-error");
  iconEl.textContent = "";
  iconEl.appendChild(document.createTextNode("\u2715"));

  titleEl.textContent = "Confirmation failed";
  msgEl.textContent   = errorMsg || "Invalid or expired link. Please try signing up again.";

  btnRetry.hidden = false;
  btnLogin.hidden = false;
}

async function confirm() {
  const params     = new URLSearchParams(window.location.search);
  const token_hash = params.get("token_hash");
  const type       = params.get("type");

  if (token_hash && type) {
    try {
      const cfg = await loadConfig();
      if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) {
        showError("Missing Supabase configuration.");
        return;
      }

      const res = await fetch(`${cfg.supabaseUrl}/auth/v1/verify`, {
        method: "POST",
        headers: {
          apikey: cfg.supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token_hash, type }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showError(data?.error_description || data?.msg || data?.error || "Verification failed.");
      } else {
        showSuccess();
      }
    } catch (e) {
      showError(e?.message);
    }
    return;
  }

  if (window.location.hash && window.location.hash.includes("access_token")) {
    showError("This confirmation link format is no longer supported. Please request a new confirmation email.");
    return;
  }

  showError("Confirmation parameters not found.");
}

confirm();
