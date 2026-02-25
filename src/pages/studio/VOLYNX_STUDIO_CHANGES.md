# Volynx Lab / Studio upgrade (MVP)

## What was added
- New Premium tool: `/volynx-lab/studio/` (Volynx Studio — Brand & Content Factory)
  - Local PRO gate (uses `localStorage.volynx_pro` + `localStorage.volynx_license`)
  - Brand Kit saved in `localStorage.volynx_brandkit` (logo + colors + font)
  - Export Packs (Social / Ads / Store) with:
    - cover/contain fitting
    - optional watermark logo (from Brand Kit)
    - per-output download buttons
    - manifest JSON download

## What was updated
- Lab home (`/volynx-lab/`) now shows:
  - QR Generator (FREE)
  - Volynx Studio (PRO)

- iMage Suite now supports Brand Watermark (PRO):
  - Uses Brand Kit logo from Studio
  - Auto-gated: requires PRO + logo configured

## Next integration targets (when you share full repo)
Some tools reference external JS not included in the zip (`/volynx-lab/app.js`, `/volynx-lab/image-scaler.js`, `/tools/qr/*`).
When the full repository is available, the same Brand Kit + preset export + batch queue can be integrated into:
- Converter (batch + watermark + manifest)
- Image Scaler (preset packs + watermark)
- QR Generator (Campaign manager + analytics)

## Notes
- License validation is intentionally simple in this MVP. Swap `Activate` logic in Studio for Stripe/Backend verification when ready.
