/*! Shared recovery flow. Recovery credentials remain in memory until confirmed. */
(function () {
  'use strict';
  var requestState = document.getElementById('requestState') || document.getElementById('recoverState');
  var requestForm = document.getElementById('recoverForm');
  var resetState = document.getElementById('passwordResetState');
  var resetForm = document.getElementById('passwordResetForm');
  if (!requestForm || !resetState || !resetForm) return;
  var status = document.getElementById('resetStatus');
  var retry = document.getElementById('resetRetry');
  var save = document.getElementById('savePasswordBtn');
  var continueLink = document.getElementById('resetContinue');
  var session = null;
  var configPromise;
  var pt = (localStorage.getItem('volynx_lang') || document.documentElement.lang || 'en').startsWith('pt');
  var phrases = Object.create(null);
  function text(en, br) {
    phrases[en] = phrases[br] = { en: en, pt: br };
    return pt ? br : en;
  }
  window.addEventListener('vx:lang-changed', function (event) {
    pt = String(event.detail?.lang || document.documentElement.lang || 'en').startsWith('pt');
    resetState.querySelectorAll('[data-reset-en]').forEach(function (el) { el.textContent = el.getAttribute(pt ? 'data-reset-pt' : 'data-reset-en'); });
    [status, document.getElementById('msg')].forEach(function (el) {
      var phrase = phrases[el.textContent];
      if (phrase) el.textContent = phrase[pt ? 'pt' : 'en'];
    });
  });
  resetState.querySelectorAll('[data-reset-en]').forEach(function (el) { el.textContent = el.getAttribute(pt ? 'data-reset-pt' : 'data-reset-en'); });
  function config() {
    if (!configPromise) configPromise = fetch('/config.json', { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('config');
      return r.json();
    }).then(function (cfg) {
      if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) throw new Error('config');
      return cfg;
    }).catch(function (error) { configPromise = null; throw error; });
    return configPromise;
  }
  async function api(path, method, body, token) {
    var cfg = await config();
    var headers = { apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(cfg.supabaseUrl + '/auth/v1' + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  function showStatus(message, error) { status.textContent = message; status.dataset.error = String(!!error); }
  function invalid() {
    session = null;
    resetForm.hidden = true;
    retry.hidden = false;
    showStatus(text('This reset link is invalid or has expired. Request a new link.', 'Este link é inválido ou expirou. Peça um novo link.'), true);
  }
  retry.addEventListener('click', function () {
    session = null;
    resetState.hidden = true;
    requestState.hidden = false;
    requestForm.querySelector('input[type="email"]').focus();
  });
  function handleCallback() {
  var query = new URLSearchParams(window.location.search);
  var hash = new URLSearchParams(window.location.hash.slice(1));
  var isRecovery = hash.get('type') === 'recovery' || query.get('type') === 'recovery';
  var hasError = hash.has('error') || query.has('error');
  var tokenHash = query.get('token_hash');
  var access = hash.get('access_token');
  var refresh = hash.get('refresh_token');
  if (isRecovery || hasError) {
    session = null;
    resetForm.hidden = true;
    retry.hidden = true;
    continueLink.hidden = true;
    requestState.hidden = true;
    resetState.hidden = false;
    // Strip credentials before any API request. Never send them to analytics.
    ['token_hash', 'type', 'error', 'error_code', 'error_description', 'code'].forEach(function (key) { query.delete(key); });
    history.replaceState(null, '', window.location.pathname + (query.size ? '?' + query.toString() : ''));
    showStatus(text('Checking your reset link…', 'Verificando seu link…'));
    (async function () {
      try {
        if (hasError || !isRecovery) throw new Error('invalid');
        if (tokenHash) {
          var verification = await api('/verify', 'POST', { token_hash: tokenHash, type: 'recovery' });
          if (!verification.ok) throw new Error('invalid');
          var verified = await verification.json();
          session = verified.session || verified;
        } else if (access && refresh) {
          var userResponse = await api('/user', 'GET', null, access);
          if (!userResponse.ok) throw new Error('invalid');
          session = { access_token: access, refresh_token: refresh, user: await userResponse.json() };
        }
        if (!session?.access_token || !session.refresh_token) throw new Error('invalid');
        resetForm.hidden = false;
        showStatus(text('Your link is valid. Set a new password below.', 'Link válido. Defina sua nova senha abaixo.'));
        document.getElementById('newPassword').focus();
      } catch (_) { invalid(); }
    })();
  }
  }
  handleCallback();
  window.addEventListener('hashchange', handleCallback);
  requestForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    var email = document.getElementById('email').value.trim();
    if (!email) return;
    var btn = document.getElementById('submitBtn');
    var msg = document.getElementById('msg');
    btn.disabled = true;
    msg.setAttribute('role', 'status');
    msg.textContent = text('Sending recovery link…', 'Enviando link de recuperação…');
    try {
      var next = window.VxReturn ? window.VxReturn.remember(window.VxReturn.authContextPath()) : '/';
      var callback = window.location.origin + window.location.pathname + '?next=' + encodeURIComponent(next);
      var response = await api('/recover?redirect_to=' + encodeURIComponent(callback), 'POST', { email: email });
      if (!response.ok) throw new Error(response.status === 429 ? 'rate' : 'request');
      requestState.hidden = true;
      document.getElementById('sentState').hidden = false;
      var sent = document.getElementById('sentEmail');
      if (sent) sent.textContent = email;
    } catch (error) {
      msg.textContent = error.message === 'rate'
        ? text('Too many attempts. Wait a minute and try again.', 'Muitas tentativas. Aguarde um minuto e tente novamente.')
        : text('Could not send the link. Please try again.', 'Não foi possível enviar o link. Tente novamente.');
    } finally { btn.disabled = false; }
  });
  resetForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!session || save.disabled) return;
    var password = document.getElementById('newPassword').value;
    if (password.length < 8 || password !== document.getElementById('confirmPassword').value) {
      showStatus(text('Passwords must match and contain at least 8 characters.', 'As senhas devem ser iguais e ter pelo menos 8 caracteres.'), true);
      return;
    }
    save.disabled = true;
    showStatus(text('Saving your password…', 'Salvando sua senha…'));
    try {
      var response = await api('/user', 'PUT', { password: password }, session.access_token);
      if (response.status === 401 || response.status === 403) { invalid(); return; }
      if (!response.ok) {
        showStatus(text('Password not accepted. Use a stronger, different password and try again.', 'Senha não aceita. Use uma senha mais forte e diferente e tente novamente.'), true);
        return;
      }
      session.user = await response.json();
      var saved = false;
      try {
        if (window.VxAuthBridge?.persistSession) {
          window.VxAuthBridge.persistSession(session);
          saved = true;
        }
      } catch (_) { /* The password was saved even if this device cannot store a session. */ }
      resetForm.reset();
      resetForm.hidden = true;
      var destination = window.VxReturn ? window.VxReturn.consume() : '/';
      continueLink.href = saved ? destination : (window.VxReturn ? window.VxReturn.loginUrl(destination) : '/login/');
      continueLink.hidden = false;
      session = null;
      showStatus(saved
        ? text('Password updated. You can return to your task.', 'Senha atualizada. Você já pode voltar à sua tarefa.')
        : text('Password updated. Sign in with your new password to continue.', 'Senha atualizada. Entre com sua nova senha para continuar.'));
    } catch (_) { showStatus(text('Connection failed. Try saving again.', 'Falha de conexão. Tente salvar novamente.'), true); }
    finally { save.disabled = false; }
  });
})();
