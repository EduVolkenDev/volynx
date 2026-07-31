# VOLYNX Core — Main Deep Reference

**Reference source:** `/Users/eduardovolkenair/Downloads/main-deep.html`  
**Status:** Reference accepted; production implementation not started  
**Date:** 2026-07-27

## Purpose

`main-deep.html` is the earliest clear visual record of the VOLYNX as a living, intelligent and impact-oriented universe. It should inform the new Core experience without becoming a literal production template.

The correct approach is **evolution, not restoration**:

- preserve the original emotional DNA;
- replace experimental implementation with a real product experience;
- connect the vision to the existing Dev Hub;
- keep all current products and flows available and untouched during exploration.

## What must be preserved

### Narrative DNA

- VOLYNX as a universe rather than a single tool;
- “Building a Smarter Future” as an early expression of the ambition;
- technology connected to social, environmental and human progress;
- future-facing projects such as Carbon Tracker, Safety Guardian and Precision Health;
- a sense of discovery before the user enters the tools.

### Visual DNA

- dark spatial atmosphere;
- restrained luminous accents;
- a central emblem or signal that can carry the identity;
- slow, deliberate motion;
- premium contrast and generous space;
- a clear transition from vision into action.

## What must not be copied literally

The original HTML is a strong reference but not a safe production surface yet:

- both primary links point to `#`;
- the referenced `assets/oficial-volynx-logo.png` and `assets/oficial-volynx-eye.png` are not current repository assets;
- there is no real navigation or Core-to-Dev-Hub flow;
- there is no onboarding, Impact Map, authentication state, consent flow or recovery state;
- there is no bilingual content system;
- there is no `prefers-reduced-motion` handling;
- all future products are presented as claims without status, evidence or safe boundaries;
- the page is not connected to current product routes or data;
- the eye is animated with CSS only and has no meaningful product interaction;
- the health copy makes high-stakes claims that cannot be treated as ordinary marketing copy.

## Evolution map

| Original element | Core evolution |
| --- | --- |
| Universe background | A lighter, layered environment that supports reading, navigation and product context without becoming visual noise |
| VOLYNX logo | Current approved VOLYNX mark with a deliberate Core treatment; no asset replacement until the direction is approved |
| Eye | Optional signature exploration; a premium static emblem is the baseline, interaction is earned rather than assumed |
| “Explore the universe” | Guided Core entry: describe an intention, explore an impact path or enter as an existing user |
| “Understand the vision” | Manifesto, principles, evidence and transparent explanation of how VOLYNX works |
| Future products | Clearly labelled research directions connected to real milestones, risks and status |
| Static product cards | Outcome-led pathways that hand off to Dev Hub capabilities |
| CSS-only fade-in | Accessible motion system with reduced-motion fallback, visible focus states and meaningful state transitions |

## Proposed Core first screen

This is a content direction, not final copy:

1. **Identity:** VOLYNX Core / intelligent technology for real progress.
2. **Promise:** help the user move from an intention to a responsible next action.
3. **Primary action:** start an Impact Map or describe what they are trying to change.
4. **Secondary action:** explore the vision and principles.
5. **Trust signal:** the user stays in control; existing tools become available when useful.
6. **Visual signal:** one calm, high-quality emblem or living system, not a collection of effects.

The first screen should communicate purpose and agency before exposing the full catalogue of Builder, Daily, Lab, products and pricing.

## Proposed first Core pathways

```text
I have an intention
  → Impact Map
  → recommended next action
  → Dev Hub handoff

I want to understand VOLYNX
  → Manifesto
  → principles, evidence and boundaries

I already use VOLYNX
  → Dev Hub
  → Builder, Daily, Lab, CVitae and existing work
```

## Additive implementation strategy

### Stage A — isolated preview

Create a new Core preview route and components. Do not replace `/`, `/platform/`, `/volynx-launch/` or any existing product route while the experience is being explored.

The preview must use:

- current repository assets unless a new asset is explicitly approved;
- `src/data/routes.ts` for all internal links;
- the existing bilingual and accessibility conventions;
- a small, composable component structure rather than another monolithic HTML file.

### Stage B — functional Core prototype

Add a first non-destructive Impact Map flow with local or controlled test data. It must prove:

- the Core can understand an intention;
- the user can edit or reject its interpretation;
- a useful next step can open in the Dev Hub;
- the flow handles empty, loading, error and recovery states;
- no current checkout, auth or product flow is changed.

### Stage C — route promotion

Only after visual and functional approval:

- make the new Core the root entrypoint;
- preserve `/platform/` as an explicit Dev Hub or compatibility surface;
- preserve `/volynx-launch/` unchanged;
- update route constants, sitemap, metadata and navigation deliberately;
- run desktop/mobile, accessibility, performance and route smoke tests.

## Acceptance criteria for the new main

- It feels recognisably related to `main-deep.html` without looking dated or amateur.
- It explains the new VOLYNX purpose before showing the product catalogue.
- It provides one meaningful action without requiring the user to understand the ecosystem first.
- It connects visibly to the Dev Hub without making the Dev Hub the main narrative.
- It works in PT and EN with equivalent meaning.
- It is usable with keyboard, touch, reduced motion and narrow screens.
- It contains no invented impact claims or unsupported health promises.
- It leaves every existing layer and production path intact.

**Current decision:** use `main-deep.html` as the visual/narrative ancestor of VOLYNX Core, develop the successor in an isolated preview, and promote it to `/` only after approval.

