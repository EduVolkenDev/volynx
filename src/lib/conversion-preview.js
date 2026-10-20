export function buildConversionPreview(input) {
  const name = String(input.name || '').trim().slice(0, 160);
  const email = String(input.email || '').trim().slice(0, 220);
  const goal = String(input.goal || '').trim().slice(0, 1800);
  const site = new URL(String(input.siteUrl || '').trim());
  if (!['http:', 'https:'].includes(site.protocol) || !site.hostname || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || goal.length < 10) {
    throw new Error('invalid-preview');
  }
  return {
    name,
    email,
    project_type: 'conversion-fix',
    budget: '',
    timeline: '48h',
    brief: `Website URL: ${site.href}\nBusiness goal: ${goal}`,
    // The backend reserves `website` for its honeypot, not the visitor's URL.
    website: String(input.website || '').trim().slice(0, 250),
    source_path: String(input.sourcePath || '/services/conversion-fix/').slice(0, 500),
    referrer: String(input.referrer || '').slice(0, 500),
    locale: input.locale === 'pt' ? 'pt' : 'en',
  };
}

export async function submitConversionPreview(input, { fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  const payload = buildConversionPreview(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const configResponse = await fetchImpl('/config.json', { cache: 'no-store', signal: controller.signal });
    if (!configResponse.ok) throw new Error('config-unavailable');
    const config = await configResponse.json();
    const apiBase = String(config.functionsUrl || config.apiBaseUrl || '').replace(/\/$/, '');
    if (!apiBase) throw new Error('config-unavailable');
    const response = await fetchImpl(`${apiBase}/contact-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error('submission-failed');
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

export function conversionPreviewMailto(input) {
  const subject = 'Website Conversion Fix — preview request';
  const body = `Name: ${input.name}\nEmail: ${input.email}\nWebsite URL: ${input.siteUrl}\nBusiness goal: ${input.goal}`;
  return `mailto:hello@volynx.world?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
