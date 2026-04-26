# VOLYNX Platform

Premium ecosystem for developers, designers & businesses: launch kits, browser tools (Lab), production builder/studio, icons store, Stripe subscriptions.

Live: [volynx.world](https://volynx.world)

## Source Of Truth

`VOLYNX` is the main repo and source of truth for the platform.

- `src/`, `public/`, `supabase/` and `index.js` own the public storefront, API surfaces and customer-facing product flows.
- `apps/volynx-os` is the internal operational workspace that feeds VOLYNX with manifests, delivery rules, protected docs and ZIP payloads.
- The old standalone `Volynx-OS` repo should be treated as a legacy copy during migration, not as the primary repo for new work.

## 🏗️ Structure
```
.
├── apps/volynx-os/   # Internal operational workspace (delivery, manifests, protected docs)
├── public/           # Static assets, Netlify _headers/_redirects
├── src/              # Astro pages/components/layouts for volynx.world
├── index.js          # Express API fallback / compat server
├── supabase/         # DB migrations/functions
├── scripts/          # Utils (QR, auth, Stripe catalog)
└── TODO.md           # Current tasks
```

Frontend: Astro hybrid (static + API routes). Backend: Express API + Supabase.

## 🚀 Quick Start (Local)

1. **Clone & Install**:
   ```
   npm install
   ```

   This root install also wires the `apps/volynx-os` workspace.

2. **Env Setup** (`.env`):
   ```
   SUPABASE_URL=https://zdmpzrderifgqmqivjoy.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_ID=price_...
   FRONTEND_ORIGIN=http://localhost:4321
   PORT=3000
   ```

3. **DB**:
   ```
   cd supabase/migrations
   supabase db push
   ```

4. **Dev**:
   - Frontend: `npm run dev` → http://localhost:4321
   - API: `npm run api` → http://localhost:3000/health
   - Internal workspace: `npm run dev:volynx-os`

5. **Build/Preview**:
   ```
   npm run build
   npm run preview
   ```

## ☁️ Deploy
- **Frontend (Netlify)**: Connect repo, `astro build` → `/dist` to `public/`.
- **API**: Vercel/Render/DigitalOcean (`node index.js`).
- **Supabase**: Link project, run migrations.

## 🔧 Features
- Subscriptions: Stripe checkout w/ Supabase auth.
- Schema: Profiles/plans/tokens/projects (RLS).
- Tools: Image converter/scaler/QR (Lab).
- Pro: Builder, Studio, premium kits/icons.

## Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Astro dev server |
| `npm run dev:volynx-os` | Next dev server for the internal VolynxOS workspace |
| `npm run api` | Express API |
| `npm run build` | Production build |
| `npm run build:volynx-os` | Build the internal VolynxOS workspace |
| `npm run lint:volynx-os` | Lint the internal VolynxOS workspace |
| `npm run start` | API prod |

## Next
See [TODO.md]. Contributions: Fork → PR.

---
Built with ❤️ by VOLYNX Team. Questions? [contact](https://volynx.world/contact)
