# VOLYNX Daily Architecture Plan

## Phase 1 Goal

Map the current VolynxOS architecture, define the target architecture for VOLYNX Daily, show the gap between both states, list the expected files, and split the work into small commit-sized phases.

Runtime impact for this phase: none. This phase is documentation-first and exists to protect the current store, PropertyFlow, checkout, and delivery flows while the Daily product is added incrementally.

## Current Architecture

VolynxOS is currently a Next.js 14 App Router project focused on commercial product pages, product kits, checkout, and post-purchase delivery.

### Application Layer

- `app/page.tsx`: main VolynxOS commercial landing page assembled from reusable sections.
- `app/icons-store/page.tsx`: Icons Store page using the new product shelf component.
- `app/products/propertyflow/page.tsx`: PropertyFlow product page with pricing and interactive previews.
- `app/dashboard/purchases/*`: post-purchase delivery pages for Icons Store and PropertyFlow.
- `app/api/checkout/*`: Stripe Checkout route handlers.
- `app/api/downloads/*`: entitlement and ZIP delivery route handlers.
- `app/api/webhooks/stripe/route.ts`: Stripe webhook entry point.
- Legal/support/demo pages are static App Router pages.

### UI Layer

- `components/common/*`: shared shell, buttons, legal renderer, header, footer, banners, and theme switcher.
- `components/sections/*`: marketing sections used by the home page and product pages.
- `components/propertyflow/*`: PropertyFlow-specific pricing and showroom components.

### Content Layer

- `content/site.ts`: site-level URLs and shared metadata.
- `content/propertyflow.ts`: PropertyFlow tier, pricing, docs, and comparison content.
- `content/icon-packs.ts`: Icons Store pack catalog and preview paths.
- `content/icons-store.ts`: Icons Store source SVG icons and categories.
- `content/legal-pages.ts` and `content/propertyflow-docs/*`: static legal and delivery docs.

### Service And Integration Layer

- `lib/stripe.ts`: Stripe client and base URL helpers.
- `lib/propertyflow-commerce.ts`: PropertyFlow pricing, tier validation, ZIP metadata, and purchase verification.
- `lib/icons-commerce.ts`: Icons Store catalog lookup, ZIP metadata, and purchase verification.
- `lib/daily/ai-tools.ts`: VOLYNX AI bridge for Supabase Edge Functions, token deduction, lite mode, and remote tool calls.
- `lib/zip-stream.ts`: ZIP streaming for generated pack downloads.
- `lib/supabase.ts`: Supabase client factory, currently global and environment-dependent.
- `lib/utils.ts`, `lib/tokens.ts`, `lib/motion.ts`, `lib/volynx-public.ts`: shared helpers.

### Persistence And Data State

- Product data is mostly static TypeScript content.
- Paid delivery authorization depends on Stripe session verification.
- There is no VOLYNX Daily persistence layer yet.
- Supabase exists as a dependency, but Daily-specific tables, repositories, and fallback storage are not implemented.

### AI Layer

- VOLYNX Daily has local structured contracts and fallback engines in `lib/daily/*`.
- Summary, Writing, and Decision can call the VOLYNX Supabase Edge Function `ai-tools` through `lib/daily/ai-tools.ts`.
- The Edge Function lives in Supabase project `zdmpzrderifgqmqivjoy` at `https://zdmpzrderifgqmqivjoy.supabase.co/functions/v1/ai-tools`.
- Token-aware calls follow the existing VOLYNX pattern: `/deduct-tokens`, optional `/check-permission` lite mode, then `/ai-tools`.
- If no `volynx_access_token` is available or the remote call fails, the app keeps the user input and returns deterministic fallback output.

## Target Architecture

VOLYNX Daily should be added as an additive product surface, not as a rewrite of the existing VolynxOS commerce site.

### Target Folder Shape

```txt
app/
  daily/
    page.tsx
  api/
    daily/
      capture/route.ts
      summary/route.ts
      writing/route.ts
      tasks/route.ts
      decision/route.ts
components/
  daily/
    capture-bar.tsx
    my-day-panel.tsx
    summary-panel.tsx
    writing-panel.tsx
    tasks-panel.tsx
    vault-panel.tsx
lib/
  daily/
    contracts.ts
    fallback.ts
    storage.ts
    intent-engine.ts
    action-engine.ts
    context-engine.ts
    summary-engine.ts
    writing-engine.ts
    task-engine.ts
    search.ts
types/
  daily.ts
docs/
  VOLYNX-DAILY-ARCHITECTURE.md
```

### Target Domain Boundaries

- UI stays in `components/daily/*`.
- Route handlers stay in `app/api/daily/*`.
- Shared domain types stay in `types/daily.ts`.
- Runtime contracts for AI output stay in `lib/daily/contracts.ts`.
- AI adapters and fallbacks stay behind engine files in `lib/daily/*-engine.ts`.
- Storage access stays behind `lib/daily/storage.ts`.
- Search and relation logic stay behind `lib/daily/search.ts` and `lib/daily/context-engine.ts`.

### Target Data Model

The MVP model follows the PRD and should be represented first as TypeScript types, then storage adapters:

- `DailyItem`: raw input, clean content, inferred intent, type, status, timestamps.
- `Task`: title, status, due date, source item link.
- `Summary`: source item link, short summary, detailed summary, bullets.
- `Writing`: title, body, version, source item link, autosave metadata.
- `Entity`: typed extracted entity.
- `Relation`: item-to-item, item-to-entity, or task-to-source relationship.
- `Decision`: recommendation, reason, options, confidence.

### Target AI Contract Rules

Every AI-producing feature must return structured JSON and have a deterministic fallback:

- Intent: `{ "intent": "task|summary|writing|vault|decision|unknown", "confidence": number, "suggestedActions": [] }`
- Summary: `{ "summary": string, "bullets": string[], "detailed": string }`
- Writing: `{ "title": string, "body": string, "version": number }`
- Task extraction: `{ "tasks": [{ "title": string, "dueDate": string | null }] }`
- Decision: `{ "recommendation": string, "reason": string, "confidence": number }`

Fallback rule: user input is always saved before AI work starts. If AI fails, the saved item remains visible with a local heuristic classification and retry affordance.

## Architecture Diff

| Area | Current Architecture | Target VOLYNX Daily Architecture | Change Type |
| --- | --- | --- | --- |
| Product surface | Marketing, Icons Store, PropertyFlow | Adds `/daily` execution OS surface | Additive |
| Data source | Static TS content and Stripe sessions | User-generated items, tasks, summaries, writings, relations | New domain |
| Persistence | ZIP assets, static content, Stripe verification | Daily storage adapter with future Supabase backing and local fallback | New layer |
| AI | None | Intent, Summary, Writing, Task, Decision, Context engines | New layer |
| Types | Product-specific content types | Shared Daily domain and AI contract types | New files |
| UI | Marketing sections and product-specific components | Daily workspace panels and drawers | New components |
| APIs | Checkout and downloads | Daily capture/action APIs | New route handlers |
| Failure behavior | Checkout/download errors returned as JSON | Save-first workflow with deterministic fallback if AI fails | New rule |
| Search | No Daily search | Vault search plus context relation layer | New feature |

## Files To Create Or Edit By Phase

### Phase 1 - Architecture Audit

- Create `docs/VOLYNX-DAILY-ARCHITECTURE.md`.
- Add `.eslintrc.json` so the existing `npm run lint` command is non-interactive after the dependency install already performed during verification.
- No runtime product files should change in this phase.

### Phase 2 - Types, Entities, Schema

- Create `types/daily.ts`.
- Create `lib/daily/contracts.ts`.
- Create `lib/daily/fallback.ts`.
- Optionally create `docs/VOLYNX-DAILY-SCHEMA.md` if the schema needs a separate migration-ready view.

### Phase 3 - Capture Universal

- Create `app/daily/page.tsx`.
- Create `components/daily/capture-bar.tsx`.
- Create `lib/daily/storage.ts`.
- Create `lib/daily/intent-engine.ts`.
- Create `app/api/daily/capture/route.ts`.

### Phase 4 - My Day

- Create `components/daily/my-day-panel.tsx`.
- Extend `lib/daily/storage.ts`.
- Extend `app/daily/page.tsx`.

### Phase 5 - Summary

- Create `components/daily/summary-panel.tsx`.
- Create `lib/daily/summary-engine.ts`.
- Create `app/api/daily/summary/route.ts`.

### Phase 6 - Writing

- Create `components/daily/writing-panel.tsx`.
- Create `lib/daily/writing-engine.ts`.
- Create `app/api/daily/writing/route.ts`.

### Phase 7 - Tasks

- Create `components/daily/tasks-panel.tsx`.
- Create `lib/daily/task-engine.ts`.
- Create `app/api/daily/tasks/route.ts`.

### Phase 8 - Vault

- Create `components/daily/vault-panel.tsx`.
- Extend `lib/daily/storage.ts`.
- Add basic relation display through `lib/daily/context-engine.ts`.

### Phase 9 - Scanner

- Add file parsing boundaries without coupling parser logic directly to UI.
- Add scanner component and route only after capture accepts file metadata safely.

### Phase 10 - Decision

- Create `lib/daily/decision-engine.ts`.
- Create `app/api/daily/decision/route.ts`.
- Add a decision drawer or panel.

### Phase 11 - Search And Context Layer

- Create `lib/daily/search.ts`.
- Expand `lib/daily/context-engine.ts`.
- Add advanced Vault search UI.

### Phase 12 - UX, Performance, Export

- Refine responsive layout, loading states, autosave behavior, and export paths.
- Add targeted tests or contract checks where the implementation surface is stable.

## Proposed Commit Plan

1. `docs(daily): map architecture and phased delivery plan`
2. `feat(daily): add shared domain types and AI contracts`
3. `feat(daily): add universal capture with save-first fallback`
4. `feat(daily): add my day execution surface`
5. `feat(daily): add structured summary engine`
6. `feat(daily): add writing draft workflow`
7. `feat(daily): add task extraction and task panel`
8. `feat(daily): add vault storage and simple relations`
9. `feat(daily): add scanner boundary`
10. `feat(daily): add decision engine`
11. `feat(daily): add search and context layer`
12. `chore(daily): refine ux performance and export flows`

## Phase 1 Decisions

- Add VOLYNX Daily as a new product surface under `/daily`.
- Preserve all current commerce and product pages.
- Create shared types before feature logic.
- Keep AI contracts explicit and JSON-shaped.
- Save user input before AI processing.
- Keep all AI features behind engine modules with deterministic fallbacks.
- Use route handlers as feature boundaries rather than placing AI logic inside UI components.

## Phase 1 Pendencies

- The current project has many pre-existing modified and untracked commerce files from the Icons Store and PropertyFlow work. Daily implementation should avoid touching them unless a later phase explicitly needs shared shell changes.
- `npm install` for lint dependencies reported high-severity audit findings. Do not run `npm audit fix --force` automatically because it can introduce breaking dependency changes.
- Supabase usage needs a safer Daily-specific adapter before any user-generated Daily data is persisted remotely.
