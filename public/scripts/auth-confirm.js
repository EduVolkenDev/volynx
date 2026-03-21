import { getSupabaseClient } from "/src/lib/supabase-client.js";

const iconEl      = document.getElementById("confirmIcon");
const spinnerEl   = document.getElementById("confirmSpinner");
const titleEl     = document.getElementById("confirmTitle");
const msgEl       = document.getElementById("confirmMsg");
const countdownEl = document.getElementById("confirmCountdown");
const btnLogin    = document.getElementById("confirmBtn");
const btnRetry    = document.getElementById("confirmBtnRetry");

function showSuccess() {
  // Icon
  if (spinnerEl) spinnerEl.hidden = true;
  iconEl.classList.add("is-success");
  iconEl.textContent = "";
  const check = document.createTextNode("\u2713");
  iconEl.appendChild(check);

  // Text
  titleEl.textContent = "Email confirmed";
  msgEl.textContent   = "Your account is verified. You can now sign in.";

  // Login CTA
  btnLogin.hidden = false;

  // Countdown redirect
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
  // Icon
  if (spinnerEl) spinnerEl.hidden = true;
  iconEl.classList.add("is-error");
  iconEl.textContent = "";
  const x = document.createTextNode("\u2715");
  iconEl.appendChild(x);

  // Text
  titleEl.textContent = "Confirmation failed";
  msgEl.textContent   = errorMsg || "Invalid or expired link. Please try signing up again.";

  // Retry CTA (goes to signup)
  btnRetry.hidden = false;
  // Also show login as secondary option
  btnLogin.hidden = false;
}

async function confirm() {
  const params     = new URLSearchParams(window.location.search);
  const token_hash = params.get("token_hash");
  const type       = params.get("type");

  // PKCE flow (current Supabase default)
  if (token_hash && type) {
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (error) {
        showError(error.message);
      } else {
        showSuccess();
      }
    } catch (e) {
      showError(e?.message);
    }
    return;
  }

  // Legacy flow: tokens in hash (#access_token=...)
  const hash        = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hash.get("access_token");
  if (accessToken) {
    showSuccess();
    return;
  }

  showError("Confirmation parameters not found.");
}

confirm();
