# VolynxOS Workspace

This is the internal operational workspace inside the main `VOLYNX` monorepo.

It is not the public storefront repo. Its job is to feed VOLYNX with:

- protected delivery routes
- ZIP payloads and entitlement checks
- product manifests and internal docs
- operational content that should not be exposed on the public sales surface

## Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Minimal dependencies

## Source Of Truth Rule

- Public selling, previews and customer-facing navigation belong to the root `VOLYNX` app.
- Operational delivery and protected product payloads belong in this workspace.
- If a product appears in both places, the public promise must match the operational files here.

## Quick start

From the repo root:

```bash
npm run dev:volynx-os
```

Or from this workspace directly:

```bash
npm install
npm run dev
```
