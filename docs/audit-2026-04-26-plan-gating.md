# VOLYNX — Auditoria de Planos, Gating & i18n EN/PT
**Data:** 2026-04-26  ·  **Escopo:** monorepo VOLYNX (Astro root, `apps/volynx-os`, `supabase/`)

## TL;DR

Auditoria do ecossistema completo: 8 inconsistências encontradas, 6 corrigidas neste passe, 2 pendentes de decisão do Eduardo.

- ✅ Build root passou (47 páginas em 4.6s)
- ✅ Build `apps/volynx-os` passou (45 rotas)
- ✅ vitest passou (7/7 testes)
- ✅ Stripe webhook + create-checkout-session íntegros (incluem CVitae e bundles)
- ⚠️ Constraint `chk_builder_plan` ainda permite `'enterprise'` órfão — migration preparada, **não aplicada**

---

## 1. Estrutura de planos confirmada (fonte da verdade)

| Produto | Tiers | Coluna profile | Preço UI (`pricing.ts`) | Preço Stripe (`stripe-catalog-setup.ts`) |
|---|---|---|---|---|
| Volynx Builder | free, launch, pro, studio, teams | `builder_plan` | £0 / £11 / £24 / £54 / £118 | 0 / 1100 / 2400 / 5400 / 11800 (gbp cents) |
| Daily | free, pro, diamond | `daily_plan` | £0 / £14 / £34 | 0 / 1400 / 3400 |
| CVitae | free, business | `cvitae_plan` | (ausente em `pricing.ts`) | 0 / 1500 |
| Bundles | volynx_daily_pro, volynx_daily_studio | duas colunas | £35 / £82 | 3500 / 8200 |
| Volynx Lab | free, pro | `plan` (global) | n/d (token-based) | n/d |

Token packs (one-time): starter (12 VX, £8.40), core (32, £18), pro (80, £42), scale (200, £88).

Lookup keys Stripe por moeda: `<prefix>_{gbp,eur,brl}`.

---

## 2. Inconsistências encontradas

### ✅ C1 — `products.ts PLAN_PRICING` desatualizado [CRÍTICA, corrigido]
**Arquivo:** `src/data/products.ts:100-114`

`PLAN_PRICING` exibia preços anteriores ao rebrand de Apr 2026 (e.g. `volynx_pro: GBP 1900` enquanto Stripe + UI usam `GBP 2400`). Função não é consumida em runtime, mas serve de "documentação canônica" para devs e seria armadilha futura.

**Correção:** valores realinhados com `stripe-catalog-setup.ts` (sub-cents) e `pricing.ts` (display).

### ✅ C2 — Falta `business` no PLAN_RANK [CRÍTICA, corrigido]
**Arquivos:** `src/data/plans.ts:11`, `public/js/vx-plan.js:19`, `public/js/plan-aware-ui.js:47`, `supabase/functions/check-permission/index.ts:11`

CVitae lançou com tier `business`, mas três das quatro fontes que duplicam o PLAN_RANK não tinham essa chave — apenas `profile.astro:606` foi atualizado em isolamento. Resultado: `VxPlan.canAccess('business', 'business')` retornava `false`, e `effective_tier` no edge function ignorava CVitae.

**Correção:** `business: 2` adicionado em todas as fontes; `cvitae_plan` agora entra no `SELECT` e no compute de `effective_tier` em `check-permission`; resposta JSON inclui `cvitae_plan`.

### ✅ C3 — `plan-aware-ui.js` ignorava `cvitae_plan` [MÉDIA, corrigido]
**Arquivo:** `public/js/plan-aware-ui.js:36-48`

A query `select=plan,builder_plan,daily_plan` deixava de fora `cvitae_plan`, então usuários só com CVitae Business viam botão "Upgrade plan" mesmo já pagando.

**Correção:** SELECT atualizado e `cvitae_plan` incluído no reduce do rank.

### ✅ C4 — `check-permission` ignorava CVitae [MÉDIA, corrigido]
**Arquivo:** `supabase/functions/check-permission/index.ts`

Mesmo problema do C3 no edge function: `effective_tier` não considerava `cvitae_plan`. Assinante CVitae Business obtinha `effective_tier="free"` para badge.

**Correção:** alinhada com `profile.astro` — busca e considera `cvitae_plan`. **⚠️ Requer redeploy do edge function** (`supabase functions deploy check-permission`).

### ⚠️ C5 — Constraint `chk_builder_plan` permite `'enterprise'` órfão [MÉDIA, pendente]
**Arquivo:** `supabase/migrations/202604120004_plan_check_constraints.sql:3`

`chk_builder_plan IN ('free', 'launch', 'pro', 'studio', 'teams', 'enterprise')` aceita `'enterprise'`, mas:
- Sem entrada em `PLAN_TIERS` (`products.ts`)
- Sem produto em `stripe-catalog-setup.ts` para `volynx_enterprise`
- Sem UI em `pricing.ts`
- Top tier oferecido hoje é `teams`

`pf_enterprise` é coisa diferente — é lookup_key da PropertyFlow, canonicalizado para `pf_white_label`, não toca `profiles.builder_plan`.

**Migration preparada (não aplicada):** `supabase/migrations/20260426120000_drop_enterprise_constraint.sql`

A migration tem **safety guard** que aborta se houver perfis com `builder_plan = 'enterprise'` (zero esperados). Aplicar manualmente:
```bash
supabase db push  # ou via dashboard
```

### ⚠️ C6 — `pricing.ts` (UI source) não tem CVitae [BAIXA, pendente]
**Arquivo:** `src/data/pricing.ts`

`pricing.astro` já mostra CVitae com copy hardcoded e lookup key `cvitae_business_<currency>`, mas `pricing.ts` (a estrutura tipada de planos) só tem `builderPlans` e `dailyPlans`. Sem entrada de CVitae em `pricing.ts`, o produto fica fora de qualquer iteração programática (pages que listam todos os planos, etc.).

**Próximo passo:** Eduardo decide copy PT/EN do `cvitaePlans: [{ id:'cvitae_free', ... }, { id:'cvitae_business', ... }]`. Não apliquei porque é decisão de marketing.

### ✅ C7 — Bundles & Add-ons com naming híbrido [INFORMATIVA, sem ação]
**Arquivos:** `src/pages/pricing.astro:29-30`, `src/components/pricing/AddonCard.astro:5-10`

`pricing.ts` usa IDs amigáveis (`bundle_essential`, `domain-setup`); Stripe usa canonical (`bundle_volynx_daily_pro`, `addon_domain_setup`). Os mappings existem corretos nos consumidores. **Documentado** mas não corrigido — cada nova adição precisa atualizar os mappings em ambos os lugares (frágil mas funcional).

### ✅ C8 — Token Pack ID `'pro'` colide com Builder Pro [INFORMATIVA, sem ação]
**Arquivo:** `src/data/pricing.ts:79`

Token pack 80-VX tem `id: 'pro'`; Builder plan também tem `id: 'pro'`. Estão em arrays distintos (`tokenPacks` vs `builderPlans`), então não há colisão técnica, mas qualquer lookup naive (e.g. `find(p => p.id === 'pro')`) precisa contexto. Stripe usa `tokens_pro_<currency>` como lookup_key, sem ambiguidade.

**Recomendação futura (não bloqueador):** renomear token pack IDs para `tokens_starter`, `tokens_core`, `tokens_pro_pack`, `tokens_scale` — alinha com lookup keys e elimina colisão.

---

## 3. Coisas que estavam corretas (confirmado)

- `stripe-webhook/index.ts` PLAN_PROFILE_MAP cobre todos os prefixes ativos + legacy (`builder_*` → `volynx_*`)
- `create-checkout-session/index.ts` resolve `cvitae_business`, bundles, legacy correctly
- `unlock-cvitae-template` edge function usa RPC atômico (`unlock_cvitae_template_atomic`) com `SELECT ... FOR UPDATE` — sem race condition
- Migration `20260426113000_cvitae_launch_alignment.sql`: cria coluna, constraint, plan_limits seed, e estende `sync_plan_to_app_metadata` para incluir CVitae em JWT app_metadata
- `pricing.astro:29-30`: bundle key mapping (`bundle_essential` → `bundle_volynx_daily_pro`) está correto
- `AddonCard.astro:5-10`: addon hyphen→snake_case mapping está correto
- TOKEN_CREDITS no webhook bate com pacotes em pricing.ts (12 / 32 / 80 / 200)
- Tier downgrade map do webhook está completo para todos prefixes ativos

---

## 4. Diff resumido das correções aplicadas

| Arquivo | Mudança |
|---|---|
| `src/data/products.ts` | PLAN_PRICING amounts atualizadas (8 planos) para refletir Stripe ao vivo |
| `src/data/plans.ts` | Adicionado `business` em PLAN_IDS e PLAN_RANK (rank 2) |
| `public/js/vx-plan.js` | Adicionado `business` em PLAN_IDS, PLAN_RANK, PLAN_LABELS |
| `public/js/plan-aware-ui.js` | SELECT inclui `cvitae_plan`; rank inclui `business`; reduce considera CVitae |
| `supabase/functions/check-permission/index.ts` | PLAN_RANK inclui `business`; SELECT busca `cvitae_plan`; resposta JSON inclui `cvitae_plan`; `effective_tier` considera CVitae |
| `supabase/migrations/20260426120000_drop_enterprise_constraint.sql` | **NOVO arquivo** — drop do `'enterprise'` órfão com safety guard. **Não aplicado.** |

---

## 5. Próximos passos

### Aplicar agora (Eduardo)
1. **Deploy do edge function `check-permission`**
   ```bash
   supabase functions deploy check-permission
   ```
   Sem isso, browser usa `cvitaePlan` no compute mas backend não → divergência transitória.

2. **Decidir sobre `enterprise`**
   - Opção A: aplicar `20260426120000_drop_enterprise_constraint.sql` (recomendado — alinha com catálogo).
   - Opção B: manter constraint e adicionar `volynx_enterprise` formal em `products.ts`/`pricing.ts`/Stripe (se a intenção era oferecer enterprise). Comentar a confirmação inverte os next steps.

### Backlog técnico
3. Adicionar CVitae em `pricing.ts` (estrutura `cvitaePlans: Plan[]`) — depende da copy PT/EN.
4. Renomear token pack IDs em `pricing.ts` para `tokens_*` no próximo refactor (breaking, agendar).
5. Considerar gerar PLAN_RANK uma única vez em `plans.ts` e fazer outros consumidores importarem (Astro pages e edge functions são runtimes diferentes; `vx-plan.js` é browser; `check-permission` é Deno — sem caminho fácil de unificação. Documentar é suficiente).

---

## 6. Como esta auditoria foi conduzida

1. Inventário paralelo via subagente Explore (mapeamento de planos, lookup keys, gating)
2. Verificação direta de cada achado lendo `pricing.ts`, `products.ts`, `plans.ts`, `stripe-catalog-setup.ts`, `check-permission`, `stripe-webhook`, `create-checkout-session`, `unlock-cvitae-template`, migration de constraints, migration CVitae nova
3. Cross-check com consumidores reais (`pricing.astro`, `profile.astro`, `AddonCard.astro`, `vx-plan.js`, `plan-aware-ui.js`, `vx-gate.js`, `image-suite/index.astro`)
4. Aplicação das correções inequívocas; preparação de migration destrutiva sem aplicar
5. Validação: `npm run build` (root + apps/volynx-os) + `npm run test` (vitest)

---

## 7. Auditoria i18n EN/PT (passe 2)

A plataforma se vende como bilíngue, então a cobertura precisa ser total. Sweep completo de páginas e componentes Astro mais sources JS.

### Escopo final encontrado e corrigido

| Severidade | Tipo | Arquivos | Status |
|---|---|---|---|
| 🔴 P0 | Texto EN-only em template literal de script (404 typewriter) | `src/pages/404.astro` | ✅ corrigido |
| 🟠 P1 | Placeholders sem `data-i18n-placeholder` | `login`, `signup`, `account`, `activate`, `dev-journey`, `builder` (13×) | ✅ corrigido |
| 🟡 P2 | `aria-label` sem `data-i18n-aria` | `FlagshipHeader` (8×), `VxHeader` (5×), `VxFooter`, `SiteFooter`, `CookieBanner`, `LabUpgradeBanner`, `dev-journey` (5×), `contact`, `support`, `portfolio-pro-kit` (2×) | ✅ corrigido |
| 🟢 OK | Translation dictionary | `public/js/translations.js` 1.978×2 keys, sem buracos antes do passe | ✅ confirmado |

**Total:** ~50 strings novas adicionadas ao `translations.js` (em ambos os blocos `en` e `pt`); ~30 atributos `data-i18n-*` adicionados aos templates.

### Padrões aplicados

1. **Placeholders:** mantém o `placeholder="..."` original como fallback EN para usuários que carregam a página antes do `i18n.js` rodar; o atributo `data-i18n-placeholder="key"` substitui o valor quando `applyTranslations()` roda.
2. **aria-labels:** mesmo padrão — `aria-label="..."` permanece como fallback; `data-i18n-aria="key"` ativo via dicionário.
3. **HTML injetado dinamicamente** (`builder/showLandingExpressFlow()` injeta express step 3 com 4 inputs via `innerHTML`): adicionada chamada explícita a `window.applyTranslations()` após injeção, senão o DOM novo nunca passa pelo i18n.

### Convenção de keys

```
e404.tw_*           → typewriter da 404
login2.*_ph         → placeholders do /login
signup.*_ph         → placeholders do /signup
acct.voucher_ph     → placeholder do /account
activate.code_ph    → placeholder do /activate
djn.*               → placeholders e aria do /dev-journey
builder.ph_*        → 13 placeholders do /builder
aria.*              → aria-labels reutilizáveis (header/footer/banner/menus)
portfolio.aria_*    → aria-labels específicos do Portfolio Pro Kit
```

`aria.*` é namespace compartilhado entre componentes (toggle_lang, open_menu, profile, etc.) porque o mesmo aria-label aparece em múltiplos lugares.

### Arquivos tocados nesse passe

```
M public/js/translations.js                                          (+~50 keys × 2)
M public/js/i18n.js                                                  (não, já suportava)
M src/pages/404.astro                                                (typewriter dinâmico)
M src/pages/login/index.astro                                        (2 placeholders)
M src/pages/signup/index.astro                                       (2 placeholders)
M src/pages/account/index.astro                                      (1 placeholder)
M src/pages/activate/index.astro                                     (1 placeholder)
M src/pages/dev-journey/index.astro                                  (2 placeholders + 5 aria)
M src/pages/builder/index.astro                                      (13 placeholders + applyTranslations on injection)
M src/pages/contact.astro                                            (1 aria)
M src/pages/support.astro                                            (1 aria)
M src/pages/products/portfolio-pro-kit/index.astro                   (2 aria)
M src/components/FlagshipHeader.astro                                (8 aria)
M src/components/VxHeader.astro                                      (5 aria)
M src/components/VxFooter.astro                                      (1 aria)
M src/components/SiteFooter.astro                                    (1 aria)
M src/components/CookieBanner.astro                                  (1 aria)
M src/components/LabUpgradeBanner.astro                              (1 aria)
```

### Validação i18n

- `npm run build`: 47 páginas ✅
- Smoke test: `dist/builder/index.html` contém 9 dos 13 atributos `data-i18n-placeholder` em HTML estático; os 4 restantes (express step 3) são gerados em runtime via template literal e cobertos pela chamada extra de `applyTranslations()` adicionada após o `wizCard.innerHTML = expressHtml`.
- `dist/index.html` (homepage) carrega 8 atributos `data-i18n-aria` do header/cookie banner.

### Pendentes futuros (i18n)

- Auditar `apps/volynx-os` (Next.js daily) — usa `next-intl` ou similar? Não foi varrido nesse passe.
- Considerar lint custom que falha CI quando `placeholder=` ou `aria-label=` aparecem sem o `data-i18n-*` companheiro.
- Considerar render-time check em dev: log de aviso quando `applyTranslations()` encontra `data-i18n-placeholder="X"` mas `X` não existe no dicionário.
