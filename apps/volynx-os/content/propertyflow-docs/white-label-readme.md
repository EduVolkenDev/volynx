# PropertyFlow — White-Label

Welcome. You bought the **White-Label** tier — the top of the PropertyFlow line. You're not getting a template. You're getting a product you can ship under your own brand, to your own clients, at your own prices.

This document gets you started. Your onboarding email covers the rest.

---

## 1. What White-Label gets you

Everything from Professional, **plus**:

**Code-level features**
- ✓ **15 grid templates** (vs 6 in Pro) — including unique layouts not sold separately
- ✓ **Multi-tenant mode** — 1 install, multiple agency clients from the same codebase
- ✓ **Full white-label rights** — strip all VOLYNX attribution, rebrand as your own
- ✓ **Custom branding system** — per-tenant colors, logos, typography via config
- ✓ **Advanced analytics module** — per-property, per-agent, per-tenant metrics
- ✓ **CRM integration pack** — HubSpot, Pipedrive, Salesforce webhooks pre-wired

**Automated onboarding & support**
- ✓ **Automated 7-day onboarding sequence** — triggered at purchase, covers setup/deploy/customize/first client
- ✓ **Self-serve migration toolkit** — CLI importer + CSV template + Loom library for common platforms (Imovelweb, Vivareal, ZAP, custom)
- ✓ **Priority email queue** — 24-hour response SLA, 12 months from purchase
- ✓ **Community Discord** — shared with other White-Label customers, pinned resources, peer-to-peer

**Commercial rights**
- ✓ **Agency delivery license** — build and deliver PropertyFlow to clients as your own product
- ✓ **Sub-brand permitted** — you can sell your version under a distinct name
- ✓ **Template updates at 50% off** when new grid templates are released

---

## 2. Your first day

White-Label is a bigger commitment than Starter or Professional. Your onboarding is structured:

**Day 1 (today):**
- Download and unzip the kit
- Run the **brand setup wizard** (`npm run brand`) to generate your config
- Watch the **Day 1 walkthrough Loom** (link in your delivery email)

**Days 2–3:**
- Work through the **Setup guide** with your initial brand configured
- Deploy your first instance (Vercel or Netlify, 10 min)
- Test the admin, enquiry system, and multi-tenant toggle if needed

**Days 4–7:**
- Migrate data from your current system using the **migration toolkit**
- Onboard your first agency client (if reselling)
- Connect your CRM via the integrations pack

---

## 3. Multi-tenant or single-tenant?

You can run White-Label two ways:

**Single-tenant (simpler)** — one PropertyFlow install per agency. Deploy once for each client. Each site has its own database, domain, brand.

**Multi-tenant (scale play)** — one PropertyFlow install, many agency tenants. Domain-based or path-based tenancy. Shared infra, isolated data. Best if you're running this as a SaaS service.

**[docs/MULTI_TENANT.md](docs/MULTI_TENANT.md)** explains both, when to use each, and how to migrate between them.

---

## 4. Folder structure

```
propertyflow-whitelabel/
├── src/                           # Same as Pro, plus:
│   ├── tenants/                   # Per-tenant config (multi-tenant mode)
│   ├── analytics/                 # Advanced metrics module
│   └── integrations/              # HubSpot, Pipedrive, Salesforce
├── templates/                     # All 15 grid templates
├── docs/
│   ├── SETUP.md                   # Full deploy (single or multi-tenant)
│   ├── CUSTOMIZATION.md
│   ├── ADMIN.md
│   ├── SUPABASE.md
│   ├── ENQUIRIES.md
│   ├── MULTI_TENANT.md            # When and how to go multi-tenant
│   ├── MIGRATION_TOOLKIT.md       # Import from other systems
│   ├── INTEGRATIONS.md            # CRM setup, webhooks
│   ├── WHITE_LABEL.md             # Stripping attribution, legal
│   └── LICENSE.md                 # Commercial + agency delivery terms
├── tools/
│   ├── migrate/                   # Data import scripts
│   └── tenant-provisioner/        # CLI for spinning up new tenants
└── .env.example
```

---

## 5. Requirements

- Same as Professional, plus:
- If multi-tenant: a database with room to grow (Supabase Pro or equivalent)
- Email deliverability setup (dedicated domain, SPF/DKIM/DMARC) — the toolkit has templates

---

## 6. License

White-Label is the most permissive tier:

- ✓ Deploy for unlimited agency clients (as long as each is a legitimate deployment, not a template resale)
- ✓ Strip all VOLYNX branding from the deployed product
- ✓ Sell under your own sub-brand
- ✓ Multi-tenant deployments permitted
- ✗ You still cannot resell the **source code** as a template or kit

Full terms in **[docs/LICENSE.md](docs/LICENSE.md)** — specifically section 4 (White-Label tier) and section 5 (Agency delivery).

---

## 7. Support & community

- **Priority email queue** — your messages jump ahead. 24-hour SLA, 12 months from purchase.
- **Community Discord** — shared with other White-Label customers. Share patterns, ask questions, see what others are shipping. Pinned resources, searchable history.
- **Quarterly recap video** — every 3 months, a recorded walkthrough of new features, roadmap and top community patterns. Watch on your schedule.

Access links are in your delivery email. If you didn't get them, email **support@volynx.world** with your order ID.

---

*Thanks for going White-Label. You're betting on PropertyFlow as a business. We bet back.*

— The VOLYNX team
