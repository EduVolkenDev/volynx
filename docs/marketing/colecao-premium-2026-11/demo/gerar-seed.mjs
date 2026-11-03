#!/usr/bin/env node
/**
 * Gera o SQL de seed da demo do PropertyFlow a partir de demo-listings.json.
 *
 * Uso:
 *   node gerar-seed.mjs                      # alvo padrão: subdomínio aurora-demo
 *   node gerar-seed.mjs --site aurora-demo   # alvo explícito
 *   node gerar-seed.mjs --upsert             # atualiza linhas existentes
 *
 * Saídas (na mesma pasta):
 *   seed-demo-listings.sql   -> colar no SQL editor do Supabase
 *   demo-listings.csv        -> conferência em planilha
 *   demo-listings-en.csv     -> campos EN (não existem no schema; uso em legenda/export)
 *
 * Segurança: o SQL só insere se encontrar um site PropertyFlow publicado com o
 * subdomínio informado, e recusa o site se ele tiver domínio próprio apontado.
 * Nunca semeia tenant de cliente por acidente.
 *
 * Imagens NÃO são inseridas: property_listing_images exige storage_path de um
 * arquivo real no bucket. Suba as fotos pelo painel do PropertyFlow.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// ---------- argumentos ----------
const argv = process.argv.slice(2);
function argValue(name, fallback) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
}
const targetSite = argValue("--site", "aurora-demo");
const upsert = argv.includes("--upsert");

if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(targetSite)) {
  console.error(`Subdomínio inválido: "${targetSite}". Use apenas a-z, 0-9 e hífen.`);
  process.exit(1);
}

// ---------- dados ----------
const dataset = JSON.parse(readFileSync(join(here, "demo-listings.json"), "utf8"));
const meta = dataset.meta ?? {};
const listings = dataset.listings ?? [];

if (!Array.isArray(listings) || listings.length < 12) {
  console.error(`Esperado ao menos 12 anúncios; encontrado ${listings.length}.`);
  process.exit(1);
}
if (listings.length > 20) {
  console.error(`Máximo de 20 anúncios para a demo; encontrado ${listings.length}.`);
  process.exit(1);
}

// ---------- validação ----------
const LISTING_TYPES = new Set(["sale", "rent", "sale_and_rent"]);
const REQUIRED = ["slug", "title", "category", "listing_type", "summary", "description", "price_label", "location", "features"];
const errors = [];
const slugs = new Set();
const sortOrders = new Set();

listings.forEach((item, index) => {
  const where = `listing[${index}] ${item.slug ?? "(sem slug)"}`;
  for (const field of REQUIRED) {
    if (item[field] === undefined || item[field] === null || item[field] === "") {
      errors.push(`${where}: campo obrigatório ausente -> ${field}`);
    }
  }
  if (item.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) {
    errors.push(`${where}: slug deve ser kebab-case`);
  }
  if (slugs.has(item.slug)) errors.push(`${where}: slug duplicado`);
  slugs.add(item.slug);
  if (item.listing_type && !LISTING_TYPES.has(item.listing_type)) {
    errors.push(`${where}: listing_type inválido -> ${item.listing_type}`);
  }
  if (typeof item.price_amount !== "number" || !Number.isFinite(item.price_amount) || item.price_amount <= 0) {
    errors.push(`${where}: price_amount deve ser número positivo`);
  }
  if (item.location && (typeof item.location !== "object" || Array.isArray(item.location))) {
    errors.push(`${where}: location deve ser objeto`);
  }
  if (item.features && !Array.isArray(item.features)) {
    errors.push(`${where}: features deve ser array`);
  }
  if (sortOrders.has(item.sort_order)) errors.push(`${where}: sort_order duplicado (${item.sort_order})`);
  sortOrders.add(item.sort_order);
});

if (errors.length) {
  console.error("Dataset inválido:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

// ---------- helpers de escape ----------
function sqlText(value) {
  if (value === undefined || value === null) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}
function sqlJson(value) {
  return `${sqlText(JSON.stringify(value))}::jsonb`;
}
function sqlNumber(value) {
  return Number(value).toFixed(2);
}
function csvCell(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function csv(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

// ---------- SQL ----------
const columns = [
  "organization_id",
  "site_id",
  "slug",
  "title",
  "category",
  "listing_type",
  "status",
  "summary",
  "description",
  "price_amount",
  "price_currency",
  "price_label",
  "location",
  "features",
  "whatsapp_message",
  "is_featured",
  "sort_order",
  "published_at",
];

const updateAssignments = columns
  .filter((column) => !["organization_id", "site_id", "published_at"].includes(column))
  .map((column) => `    ${column} = excluded.${column}`)
  .join(",\n");

const valueRows = listings
  .slice()
  .sort((a, b) => a.sort_order - b.sort_order)
  .map((item) => {
    const currency = item.price_currency ?? meta.currency ?? "BRL";
    return `    (v_org_id, v_site_id, ${[
      sqlText(item.slug),
      sqlText(item.title),
      sqlText(item.category),
      sqlText(item.listing_type),
      sqlText("published"),
      sqlText(item.summary),
      sqlText(item.description),
      `${sqlNumber(item.price_amount)}`,
      sqlText(currency),
      sqlText(item.price_label),
      sqlJson(item.location),
      sqlJson(item.features),
      sqlText(item.whatsapp_message ?? null),
      item.is_featured ? "true" : "false",
      String(item.sort_order),
      "now()",
    ].join(", ")})`;
  })
  .join(",\n");

const sql = `-- Demo PropertyFlow · ${meta.brand ?? "marca fictícia"}
-- Gerado por gerar-seed.mjs em ${new Date().toISOString()}
-- ${meta.disclaimer ?? "Demonstração com dados fictícios"}
--
-- Alvo: tenant PropertyFlow com subdomínio "${targetSite}"
-- Modo: ${upsert ? "upsert (atualiza linhas existentes)" : "insert-only (ignora linhas existentes)"}
--
-- NÃO rode isto em tenant de cliente. O bloco recusa site com domínio próprio.
-- O DO abaixo é atômico: ou insere tudo, ou não insere nada.
-- Sem begin/commit explícito para não deixar a sessão em transação abortada
-- quando uma das guardas dispara.

do $$
declare
  v_target_subdomain text := ${sqlText(targetSite)};
  v_site_id          uuid;
  v_org_id           uuid;
  v_domain           text;
  v_template         text;
  v_matches          integer;
  v_inserted         integer := 0;
begin
  select count(*) into v_matches
  from public.sites s
  where lower(coalesce(s.subdomain, '')) = lower(v_target_subdomain);

  if v_matches > 1 then
    raise exception 'Mais de um site usa o subdomínio % (% ocorrências). Renomeie antes de rodar o seed.', v_target_subdomain, v_matches;
  end if;

  select s.id, s.organization_id, s.domain, s.template_key
    into v_site_id, v_org_id, v_domain, v_template
  from public.sites s
  where lower(coalesce(s.subdomain, '')) = lower(v_target_subdomain)
  order by s.updated_at desc
  limit 1;

  if v_site_id is null then
    raise exception 'Tenant PropertyFlow com subdomínio % não encontrado. Crie o tenant da demo antes de rodar o seed.', v_target_subdomain;
  end if;

  if v_template is distinct from 'property-flow' then
    raise exception 'O site % não é um tenant PropertyFlow (template_key = %).', v_target_subdomain, coalesce(v_template, 'null');
  end if;

  if v_org_id is null then
    raise exception 'O site % não tem organization_id. Corrija o cadastro antes do seed.', v_target_subdomain;
  end if;

  if coalesce(trim(v_domain), '') <> '' then
    raise exception 'O site % tem domínio próprio (%). Este seed é só para demo. Abortado.', v_target_subdomain, v_domain;
  end if;

  insert into public.property_listings (
    ${columns.join(",\n    ")}
  ) values
${valueRows}
  on conflict (site_id, slug) do ${upsert
    ? `update set
${updateAssignments},
    published_at = coalesce(public.property_listings.published_at, now())`
    : "nothing"};

  get diagnostics v_inserted = row_count;

  raise notice 'Seed concluído no tenant %: % linha(s) inserida(s)/atualizada(s) de um total de % anúncio(s).',
    v_target_subdomain, v_inserted, ${listings.length};
end $$;

select id, slug, title, status, price_label, is_featured, sort_order
from public.property_listings
where site_id = (
  select id from public.sites
  where lower(coalesce(subdomain, '')) = lower(${sqlText(targetSite)})
  order by updated_at desc
  limit 1
)
order by sort_order;
`;

writeFileSync(join(here, "seed-demo-listings.sql"), sql, "utf8");

// ---------- CSV de conferência ----------
const csvHeader = [
  "slug",
  "title",
  "category",
  "listing_type",
  "status",
  "price_amount",
  "price_currency",
  "price_label",
  "neighborhood",
  "is_featured",
  "sort_order",
  "features",
  "photo_files",
  "whatsapp_message",
];
const csvRows = [csvHeader];
for (const item of listings.slice().sort((a, b) => a.sort_order - b.sort_order)) {
  csvRows.push([
    item.slug,
    item.title,
    item.category,
    item.listing_type,
    "published",
    item.price_amount,
    item.price_currency ?? meta.currency ?? "BRL",
    item.price_label,
    item.location?.neighborhood ?? "",
    item.is_featured ? "true" : "false",
    item.sort_order,
    item.features.join(" | "),
    (item.photo_files ?? []).join(" | "),
    item.whatsapp_message ?? "",
  ]);
}
writeFileSync(join(here, "demo-listings.csv"), csv(csvRows), "utf8");

// ---------- CSV EN ----------
const enRows = [["slug", "title_en", "summary_en", "description_en"]];
for (const item of listings.slice().sort((a, b) => a.sort_order - b.sort_order)) {
  enRows.push([item.slug, item.title_en ?? "", item.summary_en ?? "", item.description_en ?? ""]);
}
writeFileSync(join(here, "demo-listings-en.csv"), csv(enRows), "utf8");

// ---------- resumo ----------
const withEn = listings.filter((item) => item.title_en && item.summary_en && item.description_en).length;
console.log(`seed-demo-listings.sql gerado para o tenant "${targetSite}" (${upsert ? "upsert" : "insert-only"}).`);
console.log(`  anúncios: ${listings.length}`);
console.log(`  destaques: ${listings.filter((item) => item.is_featured).length}`);
console.log(`  venda: ${listings.filter((item) => item.listing_type === "sale").length} · aluguel: ${listings.filter((item) => item.listing_type === "rent").length}`);
console.log(`  com texto EN completo: ${withEn}/${listings.length}`);
console.log(`  fotos previstas: ${listings.reduce((sum, item) => sum + (item.photo_files?.length ?? 0), 0)}`);
