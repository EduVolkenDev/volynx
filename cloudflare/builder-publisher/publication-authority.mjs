// The database owns admission and serialization; R2 operations stay in the Worker.
// Never expire/release an uncertain write automatically: reconcile storage first.
export async function executePublication(env, userId, projectId, operation, render) {
  const operationId = crypto.randomUUID();
  const rpc = async (name, payload) => {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('publication_database_unavailable');
    const result = await response.json();
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('publication_database_unavailable');
    return result;
  };
  const payload = { p_project_id: projectId, p_user_id: userId, p_operation_id: operationId };
  let admitted;
  try {
    admitted = await rpc('begin_builder_publication', { ...payload, p_operation: operation });
  } catch {
    return { error: 'publication_needs_review', status: 503 };
  }
  if (admitted.error) {
    const statuses = { project_not_found: 404, forbidden: 403, publish_limit_reached: 403,
      missing_slug: 400, invalid_operation: 400, project_deleted: 409, publication_busy: 409, slug_in_use: 409 };
    return { error: admitted.error, status: statuses[admitted.error] || 503 };
  }
  if (admitted.ok !== true || typeof admitted.slug !== 'string' || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(admitted.slug)) {
    return { error: 'publication_needs_review', status: 503 };
  }
  try {
    const key = `${admitted.slug}/index.html`;
    if (operation === 'publish') {
      await env.SITES.put(key, render(admitted.builder_data, admitted.slug), {
        httpMetadata: { contentType: 'text/html; charset=utf-8' },
      });
    } else if (operation === 'unpublish') {
      await env.SITES.delete(key);
    } else throw new Error('invalid_operation');
    const finished = await rpc('finish_builder_publication', payload);
    if (finished.ok !== true) throw new Error('publication_finalize_failed');
    return { ok: true, slug: admitted.slug, url: `https://${admitted.slug}.volynx.world/`, status: 200 };
  } catch {
    // A failed response does not prove a storage write failed. Keep its slot and lock.
    return { error: 'publication_needs_review', status: 503 };
  }
}
