# VOLYNX — Auditoria de Monetização
**Data:** 21 de junho de 2026  
**Escopo:** fluxo completo de checkout, gating de planos, entrega de produto e UX de conversão  
**Objetivo:** identificar o que está vendável hoje, o que está quebrado e o que está bloqueando receita

---

## 1. Mapa de fluxo monetizável

```
Usuário clica CTA
  → /checkout/?lookup_key=X&currency=Y&next=Z
    → create-checkout-session (edge fn)
      → Stripe Checkout (card ou Pix)
        → success_url: /delivery/?payment=success
        → stripe-webhook
          → subscription: atualiza profiles.plan + builder_plan/daily_plan
          → one-time: credita tokens ou libera kit/PropertyFlow
          → email: send-purchase-email
```

---

## 2. Status por produto

### ✅ VENDÁVEL HOJE

| Produto | Lookup prefix | Preço (GBP) | Tipo |
|---|---|---|---|
| Builder Launch | `builder_launch` | £11/mês | Subscription |
| Builder Pro | `builder_pro` | £24/mês | Subscription |
| Builder Studio | `builder_studio` | £54/mês | Subscription |
| Builder Teams | `builder_teams` | £118/mês | Subscription |
| Daily Pro | `daily_pro` | £14/mês | Subscription |
| Daily Diamond | `daily_diamond` | £34/mês | Subscription |
| CVitae Business | `cvitae_business` | — | Subscription |
| Bundle Essential | `bundle_volynx_daily_pro` | £35/mês | Subscription |
| Bundle Complete | `bundle_volynx_daily_studio` | £82/mês | Subscription |
| VX Starter Pack | `tokens_starter` | £8.40 | One-time |
| VX Core Pack | `tokens_core` | £18 | One-time |
| VX Pro Pack | `tokens_pro` | £42 | One-time |
| VX Scale Pack | `tokens_scale` | £88 | One-time |
| PropertyFlow Starter | `pf_starter` | £187 | One-time |
| PropertyFlow Professional | `pf_professional` | £447 | One-time |
| PropertyFlow White-Label | `pf_white_label` | £897 | One-time |
| Kits (portfolio/agency/saas) | `kit_portfolio_*/agency_*/saas_*` | variável | One-time |

**O que confirma que está wired:**
- `checkoutHref()` utilitário centralizado — sem links hardcoded
- `PricingCard.astro` mapeia Builder e Daily corretamente para `/checkout/`
- Pricing page usa `checkoutHref("cvitae_business", ...)` e `checkoutHref(bundleLookupById[b.id], ...)` diretamente
- `stripe-webhook` suporta `builder_*` (legacy) e `volynx_*` (novo) — backward-compatible
- Token credit é atômico via `credit_token_purchase_atomic` RPC — sem double-credit
- Pix wired separado em `create-pix-checkout` + `check-pix-status` + `pix-webhook`
- Email dispatch em todos os eventos de compra

---

## 3. Gaps críticos (bloqueando receita)

### 🔴 CRÍTICO — QRGen pago não tem checkout wired

**O problema:** `pricing.ts` define 4 planos de QRGen (Free, Launch £11, Pro £24, Studio £54). A seção de QRGen na pricing page exibe os cards mas o `PricingCard.astro` só mapeia `builder_*` e `daily_*` para lookup keys — **não existe mapeamento para `qrgen_launch/pro/studio`**.

O CTA do plano Free vai para `/qrgen/` diretamente, mas os planos pagos não têm `ctaHref` wired para `/checkout/`. Resultado: usuário vê preço mas não consegue comprar.

**Fix necessário em `PricingCard.astro`:**
```ts
const planLookupPrefix = ({
  // ... existentes ...
  qrgen_launch: 'qrgen_launch',
  qrgen_pro: 'qrgen_pro',
  qrgen_studio: 'qrgen_studio',
} as Record<string, string>)[plan.id];
```

**E no stripe-webhook — adicionar ao `PLAN_PROFILE_MAP`:**
```ts
qrgen_launch:  { qrgen_plan: "launch", plan: "pro" },
qrgen_pro:     { qrgen_plan: "pro",    plan: "pro" },
qrgen_studio:  { qrgen_plan: "studio", plan: "pro" },
```

**E ao `PLAN_DOWNGRADE_MAP`:**
```ts
qrgen_launch:  { qrgen_plan: "free" },
qrgen_pro:     { qrgen_plan: "free" },
qrgen_studio:  { qrgen_plan: "free" },
```

---

### 🔴 CRÍTICO — Verificar lookup keys no Stripe Dashboard

O frontend envia `builder_launch_gbp`, `builder_pro_eur`, etc. O `create-checkout-session` busca esses lookup keys no Stripe via `stripe.prices.list({ lookup_keys: [...] })`. Se o Stripe Dashboard tiver os produtos cadastrados como `volynx_launch_gbp` (novo naming) mas o frontend manda `builder_launch_gbp`, o checkout falha com erro silencioso.

**Ação imediata:** confirmar no Stripe Dashboard (modo live) que existem prices com os lookup keys:
- `builder_launch_gbp`, `builder_launch_eur`, `builder_launch_brl`
- `builder_pro_gbp`, `builder_pro_eur`, `builder_pro_brl`
- `builder_studio_gbp`, `builder_studio_eur`, `builder_studio_brl`
- `builder_teams_gbp`, `builder_teams_eur`, `builder_teams_brl`
- `daily_pro_gbp/eur/brl`
- `daily_diamond_gbp/eur/brl`
- `cvitae_business_gbp/eur/brl`
- `bundle_volynx_daily_pro_gbp/eur/brl`
- `bundle_volynx_daily_studio_gbp/eur/brl`
- `tokens_starter_gbp/eur/brl`, `tokens_core_*`, `tokens_pro_*`, `tokens_scale_*`
- `pf_starter_gbp/eur/brl`, `pf_professional_*`, `pf_white_label_*`

---

### 🟡 MÉDIO — 5 Builder Add-ons bloqueados em `coming_soon`

| Add-on | Preço (GBP) | Status |
|---|---|---|
| Domain Setup | £15 | `manual` (wired via support, OK) |
| Template/Kit Premium | £28 | `coming_soon` (bloqueado) |
| HTML Export | £44 | `coming_soon` (bloqueado) |
| Extra Site Slot | £7/mês | `coming_soon` (bloqueado) |
| Bilingual Pack | £19 | `coming_soon` (bloqueado) |
| Icon Collection Pack | £18 | `coming_soon` (bloqueado) |

Potencial bloqueado: **£116–£135 por usuário** nos add-ons, sem contar recorrência.

O **Icon Collection Pack** (£18) é o mais rápido de desbloquear — o delivery de icons já existe (`icon-purchase-delivery` edge fn, `refresh-icons-url`). A única barreira é criar o produto no Stripe e mudar `coming_soon → active` em `pricing.ts`.

---

### 🟡 MÉDIO — Icons Store sem checkout visível na página de produto

`/products/volynx-icons-store/` e `/dashboard/purchases/icons/` existem. A edge function `icon-purchase-delivery` está deployada. Mas a página do produto precisa ter CTAs claros para `/checkout/?lookup_key=icons_*`.

---

### 🟡 MÉDIO — `recarregar.astro` defaulta para BRL

A página de recarga de VX (`/recarregar/`) faz `default currency = BRL`. Usuários GBP/EUR podem sair antes de converter. O seletor de moeda existe mas começa escondido em mobile.

**Sugestão:** detectar lang/locale para definir currency default (`pt` → BRL, `en` → GBP).

---

### 🟢 BAIXO — Nenhum upsell pós-checkout

O `success_url` vai para `/delivery/?payment=success`. A página de delivery faz o job de entrega mas não tem nenhum cross-sell ou upsell contextual (ex: "Você comprou Builder Pro — adicione VX para mais capacidade").

---

## 4. O que está bem construído (não mexer)

- **Token atomic credit** via `credit_token_purchase_atomic` RPC — race condition safe
- **Entitlement sync** em `syncUserSubscriptionEntitlements()` — relê TODAS as subscriptions ativas, nunca sobrescreve um plano maior com um menor
- **Session refresh** antes do checkout — tokens expirados não bloqueiam a compra
- **PIX separado** com status polling (`check-pix-status`) — correto para o mercado BR
- **Email dispatch** assíncrono via `email_log` — robusto a cold-start da edge fn
- **Multi-currency fixed** (GBP/EUR/BRL) — sem spot FX, experience consistente
- **FreeUsageCounter** no Lab — gating visível, upgrade prompt natural
- **LabUpgradeBanner** — CTA de upgrade contextual dentro das ferramentas
- **canAccess() / isPaid()** em `plans.ts` — single source of truth para gating

---

## 5. Plano de ação — prioridade hoje

### Prioridade 1 — Verificação (sem código, 30 min)
1. Abrir Stripe Dashboard (live) → Products → confirmar lookup keys existem para todos os planos Builder, Daily, CVitae, Bundles, Token Packs, PropertyFlow
2. Verificar edge functions deployadas: `create-checkout-session`, `stripe-webhook`, `create-pix-checkout`, `pix-webhook`, `icon-purchase-delivery`
3. Fazer um checkout de teste end-to-end (Builder Launch, BRL) em conta de teste

### Prioridade 2 — Wire QRGen pago (código, ~2h)
1. Criar produtos QRGen no Stripe com lookup keys `qrgen_launch_gbp/eur/brl`, `qrgen_pro_*`, `qrgen_studio_*`
2. Atualizar `PricingCard.astro` — adicionar `qrgen_launch`, `qrgen_pro`, `qrgen_studio` ao map
3. Atualizar `stripe-webhook` — adicionar `qrgen_*` ao PLAN_PROFILE_MAP e PLAN_DOWNGRADE_MAP
4. Adicionar `qrgen_plan` ao `syncUserSubscriptionEntitlements()` updates object

### Prioridade 3 — Icon Collection Pack ativo (código, ~1h)
1. Criar produto "Icon Collection Pack" no Stripe: `icons_collection_gbp/eur/brl`
2. Mudar `availability: 'coming_soon' → 'active'` em `pricing.ts` para `icons-addon`
3. Adicionar CTA wired em `AddonCard.astro` para o checkout

### Prioridade 4 — Cross-sell na delivery page (código, ~1h)
1. Detectar `?payment=success` + `?product=X` em `/delivery/`
2. Renderizar um strip de upsell contextual por produto comprado

---

## 6. Resumo executivo

**O que funciona e vende agora:** Builder, Daily, CVitae, Bundles, VX Packs, PropertyFlow, Kits. Checkout flow está bem construído — `checkoutHref()` centralizado, Stripe webhook com lifecycle completo, email dispatch, token atomic credit, PIX BR.

**O que está bloqueando receita hoje:** QRGen pago não tem checkout wired (planos existem mas CTA não chega no Stripe). Lookup keys no Stripe precisam ser confirmados — qualquer mismatch silencioso derruba o checkout.

**O que pode ser desbloqueado rapidamente:** Icon Collection Pack (entrega já existe), cross-sell no post-checkout, currency default por locale no recarregar.

**Risco maior:** não é o código — é o Stripe Dashboard. Toda a lógica do backend está correta; se os produtos/preços com os lookup keys certos não existirem no Stripe, o checkout falha antes de chegar no webhook.
