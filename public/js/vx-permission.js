/**
 * vx-permission.js
 * Shared helper: checks tool usage permission against volynx-core API.
 * Returns { allowed, plan, remaining } or throws on network error.
 */
async function vxCheckPermission(toolName) {
  const FREE = { allowed: true, plan: 'free', remaining: null };

  let cfg;
  try {
    cfg = await fetch('/config.json', { cache: 'no-store' }).then((r) => r.json());
  } catch (_) {
    console.warn('[vx-permission] config.json unavailable, defaulting to free');
    return FREE;
  }

  const apiBase = (cfg.apiBaseUrl || '').replace(/\/$/, '');
  if (!apiBase) {
    // No billing backend configured — allow as free tier
    return FREE;
  }

  const token = localStorage.getItem('volynx_access_token') || '';

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${apiBase}/api/check-permission`, {
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
      console.warn(`[vx-permission] check-permission HTTP ${res.status}, defaulting to free`);
      return FREE;
    }
    return await res.json();
  } catch (err) {
    console.warn('[vx-permission] check-permission failed, defaulting to free:', err.message);
    return FREE;
  }
}
