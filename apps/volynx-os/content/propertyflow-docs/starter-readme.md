# PropertyFlow — Starter

Welcome. You bought the **Starter** tier of PropertyFlow — the fastest path to a premium property catalogue online.

Everything here runs on your machine and your host. No backend required. No database to configure. Drop your properties in a JSON file, deploy, and you're live.

When you outgrow static data (you will), upgrading to **Professional** unlocks Supabase integration, admin dashboard, image galleries and enquiry capture. Your Starter work carries over — nothing is wasted.

---

## 1. Quick start (10 minutes)

```bash
# 1. Unzip and enter
cd propertyflow-starter/

# 2. Install
npm install

# 3. Run dev server
npm run dev
# → open http://localhost:5173
```

First property loads from `src/data/properties.json` demo data. Open that file, replace with your listings, save — the site hot-reloads.

For deployment, jump to **[docs/SETUP.md](docs/SETUP.md)**.

---

## 2. What you have

```
propertyflow-starter/
├── src/
│   ├── components/        # PropertyCard, FilterBar, Modal, LangToggle
│   ├── pages/             # Home, PropertyDetail
│   ├── data/              # properties.json (your listings)
│   ├── i18n/              # en.json, pt.json
│   └── styles/            # tokens.css, globals.css
├── public/
│   └── images/            # Property photos go here
├── docs/
│   ├── SETUP.md           # Deploy guide
│   ├── CUSTOMIZATION.md   # Branding, content, locale
│   └── LICENSE.md         # Commercial license terms
├── vite.config.ts
└── package.json
```

---

## 3. What's included in Starter

- ✓ **Full React 19 + Vite 7 source code** — typed, modular, documented
- ✓ **Property catalogue** — grid view with cover images, filters
- ✓ **Live filters** — search by name, neighbourhood, city, type, purpose, price range
- ✓ **Bilingual interface (EN + PT-BR)** — language toggle, zero hardcoded strings
- ✓ **Premium visual system** — dark luxury aesthetic, glassmorphism, gold accents
- ✓ **Fully responsive** — mobile-first, tested across breakpoints
- ✓ **3 grid templates** — Classic Grid, Magazine, Compact List
- ✓ **Static data mode** — properties live in JSON, zero backend setup

---

## 4. What's NOT in Starter (but you can upgrade)

Starter is a showcase, not a management system. These require **Professional** (£447) or **White-Label** (£897):

- Supabase backend integration
- Admin dashboard (create/edit properties in a UI, no JSON editing)
- Image gallery + property detail modals
- Enquiry capture system with email routing
- Gallery Hero, Split View, Masonry templates (3 more)
- Multi-tenant mode, white-label rights, custom branding (Enterprise only)

Email **support@volynx.world** to upgrade at any time — we credit your Starter purchase against the next tier.

---

## 5. Your first hour

**Minute 0–15: Run locally**
- `npm install` → `npm run dev` → open localhost:5173
- Confirm the demo properties load and filters work

**Minute 15–30: Replace demo data**
- Open `src/data/properties.json`
- Replace the 8 demo properties with your own (keep the schema shape)
- Add your property photos to `public/images/`
- Save — the site re-renders

**Minute 30–45: Brand it**
- Open `src/config/brand.ts` — change name, colors, logo, contact info
- Open `src/i18n/en.json` + `pt.json` — adjust copy to your voice

**Minute 45–60: Deploy**
- Push to a private GitHub/GitLab repo
- Import to Vercel or Netlify → deploy
- Add your domain → you're live

Detailed steps: **[docs/SETUP.md](docs/SETUP.md)**.

---

## 6. Requirements

- Node.js 20+ (`node --version`)
- A git client + hosting account (Vercel, Netlify, Cloudflare Pages — all free tier)
- About 1 hour of attention

No database, no backend, no third-party services to configure. Pure frontend, pure static.

---

## 7. License

You bought PropertyFlow Starter: **one organization, one deployment, commercial use**. You can modify, rebrand and ship. You cannot resell or redistribute the source code.

Full terms: **[docs/LICENSE.md](docs/LICENSE.md)**.

---

## 8. Support

Included with Starter:

- Direct email support for 30 days from purchase (24-hour response on business days)
- Access to setup walkthrough videos (link in your delivery email)
- Re-download your kit from your VOLYNX dashboard anytime

Email **support@volynx.world** with your order ID for anything blocking you.

---

*Thanks for picking PropertyFlow. Now go make it yours.*

— The VOLYNX team
