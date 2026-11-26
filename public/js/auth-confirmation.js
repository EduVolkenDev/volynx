/*! Consume email-confirmation callbacks on product login pages. */
(function () {
  var query = new URLSearchParams(location.search);
  var hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('type') === 'recovery' || query.get('type') === 'recovery') return;
  var access = hash.get('access_token');
  var refresh = hash.get('refresh_token');
  var tokenHash = query.get('token_hash');
  var type = query.get('type');
  if (!((access && refresh) || (tokenHash && /^(signup|email)$/.test(type)))) return;
  ['token_hash', 'type'].forEach(function (key) { query.delete(key); });
  history.replaceState(null, '', location.pathname + (query.size ? '?' + query.toString() : ''));
  document.addEventListener('DOMContentLoaded', async function () {
    var message = document.getElementById('msg');
    var button = document.getElementById('submitBtn');
    var pt = (localStorage.getItem('volynx_lang') || document.documentElement.lang).startsWith('pt');
    if (button) button.disabled = true;
    if (message) message.textContent = pt ? 'Confirmando seu acesso…' : 'Confirming your access…';
    try {
      var configResponse = await fetch('/config.json', { cache: 'no-store' });
      if (!configResponse.ok) throw new Error('config');
      var cfg = await configResponse.json();
      var headers = { apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json' };
      if (access) headers.Authorization = 'Bearer ' + access;
      var response = await fetch(cfg.supabaseUrl + '/auth/v1/' + (tokenHash ? 'verify' : 'user'), {
        method: tokenHash ? 'POST' : 'GET', headers: headers,
        body: tokenHash ? JSON.stringify({ token_hash: tokenHash, type: type }) : undefined,
      });
      if (!response.ok) throw new Error('expired');
      var data = await response.json();
      var session = tokenHash ? (data.session || data) : { access_token: access, refresh_token: refresh, user: data };
      if (!session.access_token || !session.refresh_token) throw new Error('session');
      window.VxAuthBridge.persistSession(session);
      location.replace(window.VxReturn.consume());
    } catch (_) {
      if (message) { message.setAttribute('role', 'alert'); message.textContent = pt ? 'Link inválido ou expirado. Entre com sua senha ou peça um novo link.' : 'Invalid or expired link. Sign in with your password or request a new link.'; }
      if (button) button.disabled = false;
    }
  });
})();
