export const OPPORTUNITY_KINDS = ['freelance', 'contract', 'part_time', 'full_time'] as const;
export const OPPORTUNITY_CATEGORIES = ['development', 'design', 'marketing', 'content', 'other'] as const;
export const APPLICATION_STATES = ['saved', 'preparing', 'applied', 'interview', 'offer', 'closed'] as const;
export const LABELS: Record<string, [string, string]> = {
  hour: ['Hour', 'Hora'], month: ['Month', 'Mês'], year: ['Year', 'Ano'], project: ['Project', 'Projeto'],
  freelance: ['Freelance', 'Freelance'], contract: ['Contract', 'Contrato'], part_time: ['Part-time', 'Meio período'], full_time: ['Full-time', 'Tempo integral'],
  development: ['Development', 'Desenvolvimento'], design: ['Design', 'Design'], marketing: ['Marketing', 'Marketing'], content: ['Content', 'Conteúdo'], other: ['Other', 'Outros'],
  remote: ['Remote', 'Remoto'], hybrid: ['Hybrid', 'Híbrido'], onsite: ['On-site', 'Presencial'],
  saved: ['Saved', 'Salva'], preparing: ['Preparing', 'Preparando'], applied: ['Applied', 'Candidatura enviada'], interview: ['Interview', 'Entrevista'], offer: ['Offer', 'Proposta recebida'], closed: ['Closed', 'Encerrada'],
  draft: ['Draft', 'Rascunho'], published: ['Published', 'Publicada'], archived: ['Archived', 'Arquivada'],
};
export function safeExternalUrl(value: unknown): string | null {
  try { const url = new URL(String(value)); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function isOpportunityOpen(item: { status: string; expires_at: string }, now = Date.now()) {
  return item.status === 'published' && Date.parse(item.expires_at) > now;
}
export function salaryLabel(item: { salary_min: number | null; salary_max: number | null; currency: string; salary_period: string }, locale = 'en-GB') {
  if (item.salary_min == null && item.salary_max == null) return locale.startsWith('pt') ? 'Remuneração não informada' : 'Compensation not disclosed';
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: item.currency, maximumFractionDigits: 0 }).format(n / 100);
  const range = item.salary_min != null && item.salary_max != null ? `${fmt(item.salary_min)} – ${fmt(item.salary_max)}` : item.salary_min != null ? `${locale.startsWith('pt') ? 'A partir de' : 'From'} ${fmt(item.salary_min)}` : `${locale.startsWith('pt') ? 'Até' : 'Up to'} ${fmt(item.salary_max!)}`;
  const periods: Record<string, string[]> = { hour: ['hour', 'hora'], month: ['month', 'mês'], year: ['year', 'ano'], project: ['project', 'projeto'] };
  return `${range} / ${periods[item.salary_period]?.[locale.startsWith('pt') ? 1 : 0] || item.salary_period}`;
}
