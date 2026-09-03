/**
 * vx-permission.js
 * Shared helper: checks tool usage permission against volynx-core API.
 * Returns { allowed, plan, remaining } or throws on network error.
 */
async function vxCheckPermission(toolName) {
  const FREE = { allowed: true, plan: 'free', remaining: null };
  const token = localStorage.getItem('volynx_access_token') || '';
  const FAIL_CLOSED = { allowed: false, plan: 'unknown', remaining: 0, limit: 0, source: 'error', error: 'permission_unavailable' };

  let cfg;
  try {
    cfg = await fetch('/config.json', { cache: 'no-store' }).then((r) => r.json());
  } catch (_) {
    console.warn('[vx-permission] config.json unavailable, defaulting to free');
    return token ? FAIL_CLOSED : FREE;
  }

  const apiBase = (cfg.functionsUrl || cfg.apiBaseUrl || '').replace(/\/$/, '');
  if (!apiBase) {
    // No billing backend configured — allow as free tier
    return token ? FAIL_CLOSED : FREE;
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${apiBase}/check-permission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ tool: toolName }),
      signal: ctrl.signal,
    });
    clearTimeout(t);

    if (!res.ok) {
      console.warn(`[vx-permission] check-permission HTTP ${res.status}, failing closed for authenticated usage`);
      return token ? FAIL_CLOSED : FREE;
    }
    return await res.json();
  } catch (err) {
    console.warn('[vx-permission] check-permission failed, failing closed for authenticated usage:', err.message);
    return token ? FAIL_CLOSED : FREE;
  }
}
