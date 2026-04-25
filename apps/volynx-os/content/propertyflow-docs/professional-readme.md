# PropertyFlow — Professional

Welcome. You bought the **Professional** tier — the full PropertyFlow experience. Showcase, admin, backend, enquiries — the complete kit an agency needs to run on.

Everything's wired. Supabase is set up with one command. The admin dashboard lets your team add properties, manage leads and curate the site without touching code. Deploy once, operate forever.

When you're ready to license this to clients or run multi-tenant, **White-Label** (£897) adds that on top.

---

## 1. Quick start (25 minutes)

```bash
# 1. Unzip and enter
cd propertyflow-pro/

# 2. Install dependencies
npm install

# 3. Copy env template
cp .env.example .env.local
# Edit .env.local with your Supabase credentials (see below)

# 4. Initialize Supabase
npm run db:setup

# 5. Run dev server
npm run dev
# → open http://localhost:5173
# → admin: http://localhost:5173/admin
```

Full walkthrough including Supabase setup: **[docs/SETUP.md](docs/SETUP.md)**.

---

## 2. What you have

```
propertyflow-pro/
├── src/
│   ├── components/              # PropertyCard, Filters, Gallery, Modal, EnquiryForm
│   ├── pages/                   # Home, PropertyDetail, Admin/*
│   ├── lib/
│   │   ├── supabase.ts          # DB client
│   │   ├── auth.ts              # Magic-link admin auth
│   │   └── enquiries.ts         # Lead routing + email
│   ├── admin/                   # Dashboard components
│   ├── i18n/                    # en.json, pt.json
│   └── styles/
├── supabase/
│   ├── migrations/              # Schema (properties, leads, admins)
│   └── seed.sql                 # Demo data
├── public/
├── docs/
│   ├── SETUP.md                 # Full deploy guide (Supabase + Vercel/Netlify)
│   ├── CUSTOMIZATION.md         # Brand, content, colors
│   ├── ADMIN.md                 # Dashboard walkthrough
│   ├── SUPABASE.md              # Backend setup, migrations, backups
│   ├── ENQUIRIES.md             # Lead capture, email routing, CRM integration
│   └── LICENSE.md               # Commercial license terms
└── .env.example
```

---

## 3. What's included in Professional

Everything from Starter, **plus**:

- ✓ **Supabase backend integration** — auth, database, storage, real-time
- ✓ **Admin dashboard** — properties CRUD, leads inbox, featured toggles, image upload
- ✓ **Image gallery + detail modals** — full-screen lightbox, zoom, swipe
- ✓ **Enquiry capture system** — contact forms, email notifications, CRM-ready webhooks
- ✓ **6 grid templates** — Classic Grid, Magazine, Compact List, Gallery Hero, Split View, Masonry
- ✓ **Full deployment guide** — Supabase setup, Vercel/Netlify, domain, HTTPS
- ✓ **Migration path** — Starter → Pro upgrade keeps your data

---

## 4. What's NOT in Professional (only in White-Label £897)

- Custom branding installation (we set it up for you, or self-serve via config)
- Priority onboarding (1:1 setup session)
- Data migration support (from your current system)
- Dedicated support channel
- 15 grid templates (vs 6 in Pro)
- Multi-tenant deployment rights
- White-label license (strip all VOLYNX attribution)

---

## 5. Your first hour

**Minute 0–15: Create Supabase project**
- Sign up at [supabase.com](https://supabase.com) (free tier works for dev)
- Create a new project → copy the URL and anon key
- Paste into `.env.local`

**Minute 15–30: Initialize database + local dev**
- `npm run db:setup` pushes the schema and seeds demo data
- `npm run dev` → confirm homepage loads with demo properties
- Visit `/admin`, use the magic-link login (first admin email set in `.env.local`)

**Minute 30–45: Deploy**
- Push to a private git repo
- Import to Vercel or Netlify
- Paste environment variables → deploy
- Add your domain → live

**Minute 45–60: Add real properties**
- Log into `/admin`
- Add your first real property, upload photos, publish
- Test the enquiry form from a public listing page

Detailed steps: **[docs/SETUP.md](docs/SETUP.md)** → **[docs/ADMIN.md](docs/ADMIN.md)**.

---

## 6. Requirements

- Node.js 20+
- A **free Supabase account** (or paid if you expect heavy traffic)
- A hosting account (Vercel, Netlify, Cloudflare Pages)
- Email provider for transactional emails (Resend recommended — free tier covers 100/day)
- A domain
- About 1–2 hours the first time

---

## 7. License

You bought PropertyFlow Professional: **one organization, commercial use, full features**. You can modify, deploy, operate as a business, and even re-sell *as a service* (deliver a hosted PropertyFlow site to clients). You **cannot** resell the source code itself as a template.

Full terms: **[docs/LICENSE.md](docs/LICENSE.md)**.

---

## 8. Support

Included with Professional:

- Direct email support for 90 days from purchase
- 24-hour response on business days, same-day on weekdays during business hours
- Setup walkthrough Loom library
- Free re-download of the current and next 2 minor versions

Email **support@volynx.world** with your order ID.

---

*Thanks for picking PropertyFlow Pro. This is where the real work begins — and ends quickly.*

— The VOLYNX team
