# PropertyFlow — Mudanças na página de vendas

Patches específicos pra aplicar em `/products/propertyflow/` antes do launch. Cobre: bugs identificados + alinhamento com a estratégia B+C (zero intervenção manual no White-Label).

---

## 🐛 Bugs pra consertar primeiro

### Bug 1: Duplicates nos 3 tiers

Cada tier tem o último bullet repetido duas vezes. Sintoma:

```
Starter:
  ...
  ✓ Static data mode
  ✓ Static data mode    ← remover

Professional:
  ...
  ✓ Deployment guide
  ✓ Deployment guide    ← remover

White-Label:
  ...
  ✓ Dedicated support channel
  ✓ Dedicated support channel    ← remover
```

Provavelmente um loop/template que renderiza o último item 2x. Achar e remover.

### Bug 2: CTA "Get Enterprise" no tier "White-Label"

Três nomes na mesma card. Decidir um:

**Opção A (recomendada):** Manter "White-Label" no header, mudar CTA pra "Get White-Label".
**Opção B:** Renomear tudo pra "Enterprise" (header + CTA + eyebrow).

Minha aposta: A. "White-Label" é mais descritivo e vendedor pro público-alvo (agências que querem revender).

---

## 📝 Atualização de copy dos 3 tiers

Baseado na estratégia B+C. Bullets automatizados (zero serviço manual) + 1-2 features de código reais pra justificar £897 vs £447.

### Starter — £187

**Copy atual:** mantém. Só remove o duplicate.

```
Starter
£187
One-time · Source code

✓ Full React source code
✓ Property catalogue + filters
✓ Bilingual interface (EN/PT)
✓ Responsive design
✓ Static data mode
✓ 3 grid templates

[Get Starter]
```

**Micro-update:** adicionar "3 grid templates" como último bullet. Cria diferenciação explícita com Pro (6) e White-Label (15).

---

### Professional — £447

**Remover duplicate "Deployment guide". Adicionar "6 grid templates".**

```
Professional                                    [Most popular]
£447
One-time · Full kit

✓ Everything in Starter
✓ Supabase backend integration
✓ Admin dashboard
✓ Image gallery + modals
✓ Enquiry capture system
✓ 6 grid templates (vs 3 in Starter)
✓ Full deployment guide
✓ Agency delivery license (1 client)

[Get Professional]
```

**Adicionado:** "6 grid templates" e "Agency delivery license" — dois bullets que justificam o salto pra £447 sem depender de serviço.

---

### White-Label — £897

**Aqui é onde mais muda.** Remove "Priority onboarding, Data migration support, Dedicated support channel" (serviços manuais). Substitui por versões automatizadas + adiciona features de código.

```
White-Label                                 [Premium]
£897
One-time · Agency delivery

✓ Everything in Professional
✓ 15 grid templates (vs 6 in Pro)
✓ Multi-tenant mode (1 install, unlimited clients)
✓ CRM integrations pack (HubSpot, Pipedrive, Salesforce)
✓ Advanced analytics (per-tenant, per-agent, trends)
✓ White-label rights (strip all VOLYNX attribution)
✓ Automated onboarding + self-serve migration toolkit
✓ Priority email queue (24h SLA · 12 months)
✓ Community Discord access

[Get White-Label]
```

**Mudanças explícitas por bullet:**

| Copy antiga | Copy nova | Por quê |
|---|---|---|
| "Custom branding + domain" | "White-label rights (strip all VOLYNX attribution)" | Mais técnico, claro que é código e não serviço |
| "Priority onboarding" | "Automated onboarding + self-serve migration toolkit" | Zero intervenção manual |
| "Data migration support" | (fundido no bullet acima) | Self-serve |
| "Dedicated support channel" | "Priority email queue (24h SLA · 12 months)" + "Community Discord access" | Queue automatizada + comunidade peer-to-peer |
| (novo) | "15 grid templates (vs 6 in Pro)" | Feature de código, diferencial forte |
| (novo) | "Multi-tenant mode (1 install, unlimited clients)" | Feature técnica premium real |
| (novo) | "CRM integrations pack" | 3 integrações prontas = dev work real |
| (novo) | "Advanced analytics" | Module adicional |

Eyebrow label: troca "Tailored to your agency" → "**Built for agencies at scale**" (remove a conotação de customização manual).

---

## 🎨 Ajustes visuais opcionais (mas recomendados)

### Grid templates section

Atualmente a seção mostra 6 templates com badge "Pro+" em 3. Recomendo:

```
Grid Templates
Pre-built layouts ready to plug into your site.

Row 1 (Starter — 3):  Classic Grid   Magazine   Compact List
Row 2 (Pro — 3 mais): Gallery Hero   Split View   Masonry       [badge: Pro+]
Row 3 (White-Label — 9 mais): Editorial, Minimalist, Card Stack, Timeline, Map-First, Grouped, Story Mode, Showroom, Catalog   [badge: White-Label only]

Total: 15 templates across 3 tiers.
```

Isso faz o buyer de Pro ver o que ele ganha sobre Starter E o que ainda falta pra ele ir pro White-Label. Cria desejo pra upgrade futuro.

### Comparison table

Atualmente os tiers estão em cards lado-a-lado. Considerar adicionar uma **tabela comparativa** abaixo das cards, igual Stripe/Linear/Vercel fazem. Formato sugerido:

```
Feature                    Starter  Professional  White-Label
─────────────────────────────────────────────────────────────
React source code             ✓          ✓             ✓
Property catalogue            ✓          ✓             ✓
Filters                       ✓          ✓             ✓
Bilingual EN/PT               ✓          ✓             ✓
Static data mode              ✓          ✓             ✓
Supabase backend              —          ✓             ✓
Admin dashboard               —          ✓             ✓
Image gallery + modals        —          ✓             ✓
Enquiry capture               —          ✓             ✓
Grid templates                3          6             15
Agency delivery license       —       1 client     unlimited
Multi-tenant mode             —          —             ✓
CRM integrations              —          —             ✓
Advanced analytics            —          —             ✓
White-label rights            —          —             ✓
Automated onboarding          —          —             ✓
Email support window        30 days    90 days     12 months
Email response SLA          48h        24h         24h (priority)
Free template updates         —          —          12 months
```

Essa tabela converte mais que bullets separados — people scanning pricing pages prefer tables for 3-col comparisons.

---

## 💷 Currency — USD missing

Currency toggle mostra **£ GBP / € EUR / R$ BRL**. **USD ausente.**

Maior mercado de template premium é americano. Sem USD, o buyer yankee:
- Calcula mental toda vez
- Percebe o preço como "caro" porque £ parece mais que $
- Abandona no checkout quando Stripe mostra o valor convertido

Adicionar USD como opção. Recomendo ordem: **$ USD · £ GBP · € EUR · R$ BRL**.

Preços em USD (aproximado, fixa anualmente):

| Tier | GBP | USD | EUR | BRL |
|---|---:|---:|---:|---:|
| Starter | £187 | $239 | €217 | R$1.290 |
| Professional | £447 | $569 | €519 | R$3.090 |
| White-Label | £897 | $1.149 | €1.039 | R$6.190 |

**Ordem dos tiers no currency:** GBP default pra UK, mas detectar `Accept-Language` do browser e mostrar USD por default pra `en-US`, BRL pra `pt-BR`.

---

## ✅ Checklist de mudanças

Antes do launch, conferir na página:

- [ ] Remove duplicate bullets (1 em cada tier, total 3)
- [ ] CTA "Get Enterprise" → "Get White-Label"
- [ ] Copy do White-Label reescrita (zero serviço manual)
- [ ] Bullets "15 grid templates", "Multi-tenant", "CRM integrations", "Advanced analytics" adicionados no White-Label
- [ ] Bullet "6 grid templates" + "Agency delivery" adicionados no Professional
- [ ] Bullet "3 grid templates" adicionado no Starter
- [ ] USD adicionado no currency toggle
- [ ] Comparison table adicionada abaixo dos 3 cards (opcional, mas recomendado)
- [ ] Grid templates section mostra 15 total (3 + 3 Pro+ + 9 White-Label-only)
- [ ] Eyebrow White-Label: "Built for agencies at scale" (no lugar de "Tailored to your agency")

---

## 📁 Arquivos do ZIP entregue pós-compra

Baseado no tier, o ZIP deve conter:

**Starter (`propertyflow-starter-v1.0.0.zip`):**
```
README.md                   (STARTER/README.md do bundle entregue)
LICENSE.md
src/
docs/
  SETUP.md
  CUSTOMIZATION.md
public/
package.json
.env.example
```

**Professional (`propertyflow-professional-v1.0.0.zip`):**
```
README.md                   (PROFESSIONAL/README.md)
LICENSE.md
src/                        (+ admin, + enquiries)
supabase/
docs/
  SETUP.md
  CUSTOMIZATION.md
  ADMIN.md
  SUPABASE.md
  ENQUIRIES.md
public/
package.json
.env.example
```

**White-Label (`propertyflow-white-label-v1.0.0.zip`):**
```
README.md                   (WHITE-LABEL/README.md)
LICENSE.md
src/                        (+ tenants, + analytics, + integrations)
supabase/
templates/                  (todos os 15)
tools/
  migrate/
  tenant-provisioner/
docs/
  SETUP.md
  CUSTOMIZATION.md
  ADMIN.md
  SUPABASE.md
  ENQUIRIES.md
  MULTI_TENANT.md
  MIGRATION_TOOLKIT.md
  INTEGRATIONS.md
  WHITE_LABEL.md
public/
package.json
.env.example
```

Single build pipeline, env var `PROPERTYFLOW_TIER` controla o que entra. Ver `TIER_CONFIG.md` para o setup CI.
