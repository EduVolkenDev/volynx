# PropertyFlow — Pacote completo de entrega

Abre este arquivo primeiro pra entender o que tem aqui. **Pacote 100% completo** — tudo que você precisa pra vender, entregar, e operar o PropertyFlow sem intervenção manual.

---

## Estrutura do pacote

```
propertyflow-complete/
├── README-primeiro.md                    ← você está aqui
├── propertyflow-delivery-page.html       ← página pós-compra (pro Codex implementar)
├── propertyflow-product-page-updates.md  ← patches pra /products/propertyflow/
└── zip-contents/                          ← ISSO é o que vai dentro do ZIP que o buyer baixa
    ├── LICENSE.md                        (license comercial dos 3 tiers)
    ├── TIER_CONFIG.md                    (spec técnica pro Codex: feature flags, CI, etc)
    ├── STARTER/README.md                 (pros buyers de Starter £187)
    ├── PROFESSIONAL/README.md            (pros buyers de Professional £447)
    ├── WHITE-LABEL/README.md             (pros buyers de White-Label £897)
    └── docs/                              (compartilhado por todos os tiers)
        ├── SETUP.md                      (instalação passo-a-passo nível mamão com açúcar)
        ├── CUSTOMIZATION.md              (brand, cores, logo sem código)
        ├── ADMIN.md                      (painel admin — Pro e White-Label)
        ├── SUPABASE.md                   (backend — Pro e White-Label)
        ├── MULTI_TENANT.md               ← White-Label (1 install, múltiplos clientes)
        ├── MIGRATION_TOOLKIT.md          ← White-Label (importar dados de outros sistemas)
        ├── INTEGRATIONS.md               ← White-Label (HubSpot, Pipedrive, Salesforce)
        └── WHITE_LABEL.md                ← White-Label (apresentar como teu produto)
```

Total: **13 documentos prontos** pra implementação e entrega.

---

## Fluxo de implementação sugerido pro Codex

### Fase 1 — Infraestrutura de entrega (P0, bloqueia launch)

1. Implementar a `delivery-page.html` como rota `/dashboard/purchases/propertyflow/`
2. Conectar com `addons_purchased` (access control por login + tier)
3. Implementar download via signed URL (TTL 15min, logging de cada download)
4. Seguir o `TIER_CONFIG.md` pra feature flags por tier e build pipeline CI

### Fase 2 — Packaging por tier

Cada tier gera um ZIP separado com conteúdo diferente:

**propertyflow-starter-v1.0.0.zip:**
- STARTER/README.md → raiz do zip (como README.md)
- LICENSE.md
- docs/SETUP.md, CUSTOMIZATION.md (só os 2 relevantes pra Starter)
- código-fonte React+Vite (sem Supabase, sem admin, 3 templates)

**propertyflow-professional-v1.0.0.zip:**
- PROFESSIONAL/README.md → raiz como README.md
- LICENSE.md
- docs/SETUP.md, CUSTOMIZATION.md, ADMIN.md, SUPABASE.md
- código-fonte completo (com Supabase, admin, enquiries, 6 templates)

**propertyflow-white-label-v1.0.0.zip:**
- WHITE-LABEL/README.md → raiz como README.md
- LICENSE.md
- docs/ completo (todos os 8 arquivos)
- código-fonte completo + multi-tenant + integrations + 15 templates
- tools/ (migrate, tenant-provisioner)

CI matrix builda os 3 conforme `TIER_CONFIG.md` seção 5.

### Fase 3 — Página de vendas (P1, melhora conversão)

Aplicar patches do `propertyflow-product-page-updates.md`:
- Bugs: duplicate bullets, CTA "Get Enterprise" errado
- Copy atualizada dos 3 tiers (zero serviço manual no White-Label)
- USD no currency selector
- Tabela comparativa dos 3 tiers (template no mesmo arquivo)
- 15 templates em vez de 6 na grid

---

## Decisões já tomadas (pra não reabrir)

- **3 tiers:** Starter £187 · Professional £447 · White-Label £897
- **Naming oficial:** Starter / Professional / White-Label (não Enterprise)
- **Stack:** React 19 + Vite 7 + Supabase (confirmado pela página)
- **White-Label:** zero serviços manuais — tudo automatizado via:
  - Automated 7-day onboarding sequence
  - Self-serve migration toolkit
  - Priority email queue (24h SLA, 12 meses)
  - Community Discord (peer-to-peer)
- **Diferencial £897 vs £447:** 15 templates, multi-tenant, CRM integrations, advanced analytics, white-label rights

---

## Guia de uso dos documentos (quem lê o quê)

### Pros teus buyers (o que vai dentro do ZIP)

| Tier | Arquivos relevantes |
|---|---|
| **Starter** (£187) | README (do STARTER/), LICENSE, docs/SETUP.md, docs/CUSTOMIZATION.md |
| **Professional** (£447) | README (do PROFESSIONAL/), LICENSE, docs/SETUP, CUSTOMIZATION, ADMIN, SUPABASE |
| **White-Label** (£897) | README (do WHITE-LABEL/), LICENSE, TIER_CONFIG (opcional pra devs técnicos), **todos** os docs/* |

### Pra ti (operação, Codex, vendas)

- **TIER_CONFIG.md** — spec técnica de como implementar feature flags e build por tier
- **propertyflow-delivery-page.html** — template da delivery page
- **propertyflow-product-page-updates.md** — todas as mudanças na página pública

---

## Escopo de cada doc (pra escolher o que ler primeiro)

### Comuns aos 3 tiers

**SETUP.md** (10 passos numerados)
- Ponto 0: "não precisa saber programar"
- Instala Node.js do zero, explica terminal pra não-dev
- Deploy pra Vercel / Cloudflare / self-hosted
- ~50 min pra novato, 15 min pra quem já tem experiência

**CUSTOMIZATION.md**
- Toda customização em `config/brand.ts` (1 arquivo)
- Trocar logo, cores, fontes, contato, SEO sem tocar código
- Textos bilíngues (JSON)
- Checklist pré-lançamento

### Professional e White-Label

**ADMIN.md**
- Tour do painel (Visão Geral, Imóveis, Leads, Corretores)
- Criar 1ª propriedade em 4 abas
- Dicas de fotos e copy que convertem
- Multi-agent, notificações, analytics
- Fluxo diário/semanal/mensal

**SUPABASE.md**
- Explica o que é Supabase em português plain
- Backup mensal (CLI e painel)
- Ver/editar dados direto
- Row Level Security e isolamento
- Quando pagar, limites do free tier

### White-Label only

**MULTI_TENANT.md**
- Subdomínio vs path mode
- CLI pra criar tenant
- Painel master pra gerenciar todos
- Feature flags por tenant
- Isolamento de dados

**MIGRATION_TOOLKIT.md**
- Converter de Imovelweb, VivaReal (DOMUS), ZAP, Aglow, planilhas
- Template CSV do PropertyFlow
- 3 estratégias pra fotos
- Import com dry-run, rollback

**INTEGRATIONS.md**
- HubSpot (15 min setup)
- Pipedrive (15 min)
- Salesforce (45min-2h)
- Webhook genérico pra qualquer CRM
- Integrações BR: RD Station, Kommo, Bitrix24

**WHITE_LABEL.md**
- Remover toda menção a Volynx do código público
- Hospedar docs próprios
- Contrato com teus clientes finais
- Pricing sugerido pra revenda (SaaS recorrente)
- LGPD e marca registrada

---

## O que a Volynx cobra de ti (pra referência)

| Tier | Preço | Support window | Pra que serve |
|---|---|---|---|
| Starter | £187 | 30 dias, 48h SLA | Corretor solo, showcase simples |
| Professional | £447 | 90 dias, 24h SLA | Imobiliária pequena/média rodando sozinha |
| White-Label | £897 | 12 meses, 24h SLA priority + Discord | Agência revendendo, grupo com várias bandeiras |

---

## O que você pode cobrar do teu cliente final (White-Label)

Referência do mercado brasileiro (adapta conforme tua estratégia):

| Plano | Preço mensal | Pra quem |
|---|---|---|
| Starter | R$ 297 | Corretor autônomo <20 imóveis |
| Pro | R$ 597 | Imobiliária pequena |
| Enterprise | R$ 1.497 | Imobiliária média/grande |

Setup fee: R$ 997 one-time pra migração + onboarding.

**Matemática rápida:** 20 clientes no plano Pro = R$ 12k/mês recorrente. White-Label (£897 ≈ R$ 6k) paga em **2 semanas**.

---

## Precisou de ajuda pra implementar?

**Email:** support@volynx.world
**Priority queue pra White-Label buyers:** 24h úteis.

Boa venda. Agora é correr.

— Claude
