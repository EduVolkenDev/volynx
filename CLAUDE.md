# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev        # Astro dev server → localhost:4321
npm run build      # Build static site → dist/
npm run preview    # Preview production build
```

No test suite exists. No linter configured. Validate changes manually.

The Express backend (`index.js` at repo root) handles Stripe checkout. It runs separately and requires `scripts/.env` with `STRIPE_SECRET_KEY`.

## Architecture

**Astro 5 static site** with Supabase auth, Stripe payments, and client-side i18n.

### Routing

All internal routes are centralized in `src/data/routes.ts` as the `ROUTES` constant. **Never hardcode paths** — always import from `ROUTES`. File-based routing via Astro pages mirrors the URL structure.

### Authentication

Client-side Supabase Auth (JWT). Session stored in localStorage keys prefixed `volynx_`. Login scripts live in `public/scripts/auth-login.js`. The Express backend validates tokens before creating Stripe sessions.

### Internationalization

Attribute-based client-side i18n:
- Translations: `public/js/translations.js` → `window.VX_TRANS`
- Language stored in `localStorage.volynx_lang` (default: `en`)
- HTML attributes: `data-i18n="key"` (textContent), `data-i18n-placeholder`, `data-i18n-aria`
- Applied by `public/js/i18n.js` on page load

### Pricing & Plans

Defined in `src/data/pricing.ts`. Token-based system (classes A–E, 1–20 tokens per action). Multi-currency: GBP, EUR, BRL at fixed commercial rates. Plans: Free → Launch → Pro → Studio → Teams. User plan source of truth: `public.profiles.plan` in Supabase.

### Layouts & Components

- `BaseLayout.astro` — standard page wrapper (SEO, CSS, PageWidgets)
- `HomeLayout.astro` — extends Base with home-specific preloads
- `LegalLayout.astro` — terms/privacy pages
- `PageWidgets.astro` — floating utilities (lang toggle, login btn, back-to-top, cookie banner)
- Components prefixed `Vx*` are VOLYNX-branded (VxHeader, VxFooter)

### Styling

Dark theme, no CSS framework. Feature-specific CSS files in `src/styles/`. Astro scoped `<style>` tags in components. System font stack. Glass/blur aesthetic with neon accents.

### Public Config

`config.json` at repo root serves Supabase URL and anon key to the frontend (safe to expose). Loaded via `fetch("/config.json")` in `src/lib/supabase-client.js`.

### Key Data Files

- `src/data/routes.ts` — all internal routes
- `src/data/pricing.ts` — plans, tokens, currencies, add-ons
- `config.json` — Supabase public config
- `scripts/.env` — Stripe secret key (not committed)

### Deployment

Static output to `dist/`. Netlify config via `_headers` and `_redirects` in `public/`. API at `api.volynx.world`.

## Conventions

- Trailing slashes on all internal routes
- Client-side auth only — no SSR middleware
- Portuguese (`pt`) and English (`en`) locales
- All pricing uses fixed commercial FX rates, not spot
