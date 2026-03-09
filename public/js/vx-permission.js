/**
 * vx-permission.js
 * Shared helper: checks tool usage permission against volynx-core API.
 * Returns { allowed, plan, remaining } or throws on network error.
 */
async function vxCheckPermission(toolName) {
  const cfg = await fetch('/config.json', { cache: 'no-store' }).then((r) => r.json());
  const apiBase = (cfg.apiBaseUrl || '').replace(/\/$/, '');
  if (!apiBase) throw new Error('apiBaseUrl não configurado em config.json');

  const token = localStorage.getItem('volynx_access_token') || '';

  const res = await fetch(`${apiBase}/api/check-permission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ tool: toolName }),
  });

  if (!res.ok) throw new Error(`check-permission falhou: ${res.status}`);
  return await res.json();
}
