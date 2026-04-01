# VOLYNX Platform

Premium ecosystem for developers, designers & businesses: launch kits, browser tools (Lab), production builder/studio, icons store, Stripe subscriptions.

Live: [volynx.world](https://volynx.world)

## 🏗️ Structure
```
.
├── public/           # Static assets, Netlify _headers/_redirects
├── src/              # Astro pages/components/layouts
├── index.js          # Express API (Stripe/Supabase auth)
├── supabase/         # DB migrations/functions
├── scripts/          # Utils (QR, auth)
└── TODO.md           # Current tasks
```

Frontend: Astro hybrid (static + API routes). Backend: Express API + Supabase.

## 🚀 Quick Start (Local)

1. **Clone & Install**:
   ```
   npm install
   ```

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
| `npm run api` | Express API |
| `npm run build` | Production build |
| `npm run start` | API prod |

## Next
See [TODO.md]. Contributions: Fork → PR.

---
Built with ❤️ by VOLYNX Team. Questions? [contact](https://volynx.world/contact)

