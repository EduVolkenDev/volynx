# VOLYNX Core Blueprint v0.1

**Status:** Draft for alignment  
**Date:** 2026-07-27  
**Owner:** Eduardo Volken  
**Scope:** New primary VOLYNX experience and its relationship with the existing Dev Hub

> This document is the working source of truth for the next VOLYNX product layer. It records what is decided, what is still a hypothesis, and what must be proven before implementation.

## 1. Strategic decision

The existing VOLYNX ecosystem becomes the **Dev Hub**: a secondary layer for building, operating, publishing, learning and delivering digital work.

The new **VOLYNX Core** becomes the primary experience: the layer that explains why VOLYNX exists, understands the user's intention, turns it into an actionable path and connects that path to the right capabilities in the ecosystem.

The existing products are not being discarded or renamed prematurely. Their role is being clarified.

## 2. North star

### Working promise

**VOLYNX transforms intention into executable impact.**

The promise must eventually become more specific after the first user research and MVP definition. For now, “impact” means a meaningful improvement that can be acted on and evidenced; it does not mean an inspirational claim without a measurable result.

### Product chain

```text
Real intention
  → clearer problem
  → responsible plan
  → tools and people
  → execution
  → evidence of outcome
  → reusable knowledge and network value
```

## 3. Product architecture

| Layer | Role | Current or planned surfaces |
| --- | --- | --- |
| **VOLYNX Core** | Orientation, intelligence, intent, impact planning and outcome visibility | New primary homepage, onboarding, Impact Studio, impact dashboard |
| **Dev Hub** | Build, operate, publish, learn and deliver digital work | Builder, Daily, Lab, CVitae, PropertyFlow, kits, Services, Dev Journey |
| **VOLYNX World** | People, opportunities, experts, organisations, resources and marketplace | World profiles, briefs, discovery and future matching |
| **Trust / Impact Layer** | Consent, privacy, evidence, metrics, provenance and responsible AI boundaries | Impact records, user controls, transparent measurement |

### Boundary rule

- Core answers: “What are you trying to accomplish, and what should happen next?”
- Dev Hub answers: “Which tools and production systems help you execute it?”
- World answers: “Who or what can help you extend the work?”
- Trust Layer answers: “What happened, how do we know, and what data was used?”

## 4. Initial product wedge

The first Core product should not attempt to solve every global problem. It should prove one complete, low-risk path from intention to measurable action.

### Working name: VOLYNX Impact Studio

Initial audience hypothesis:

- small social, educational or environmental projects;
- independent builders creating something useful for people or communities;
- small teams that have a mission but lack strategy, digital execution or operational clarity.

The first version should avoid medical diagnosis, clinical decisions, crisis intervention and other high-stakes claims. Those areas require domain experts, institutional review, stronger safety systems and human accountability.

### Core flow

1. The user describes a real objective in plain language.
2. VOLYNX asks only the questions needed to clarify the problem, audience, constraints and desired outcome.
3. VOLYNX produces an **Impact Map**: problem, audience, assumptions, proposed actions, risks and first metrics.
4. The user accepts, edits or rejects the map. The user remains the decision-maker.
5. VOLYNX opens the relevant Dev Hub workspace:
   - Builder for a public page or campaign;
   - Daily for tasks, routines and coordination;
   - Lab for local asset production;
   - Services for human-led implementation;
   - World for people, resources and opportunities.
6. The user records progress and evidence.
7. The Core shows what changed, what remains uncertain and what should happen next.

## 5. What the Core must feel like

The Core should feel:

- calm, intelligent and purposeful;
- premium without looking like a product catalogue;
- accessible to people who are not developers;
- transparent about uncertainty and AI involvement;
- useful before asking for payment;
- visually distinctive without depending on a gimmick.

The eye is **not** a Core requirement. A signature interaction may be explored later, but it must first pass these tests:

- looks premium as a still frame;
- works on touch, keyboard and reduced-motion settings;
- adds meaning rather than decoration;
- does not slow the first experience;
- remains unmistakably VOLYNX rather than looking like a generic sci-fi effect.

## 6. Impact model

Every Core initiative should define, before execution:

| Field | Question |
| --- | --- |
| Problem | What real friction or unmet need are we addressing? |
| Audience | Who specifically benefits? |
| Action | What will VOLYNX help the user do? |
| Outcome | What should be different afterwards? |
| Evidence | How will we know whether anything changed? |
| Risk | What could be misunderstood, abused or made worse? |
| Consent | What data is necessary, and what remains under user control? |

The first metrics should be modest and verifiable: completed actions, time saved, successful publication, people reached, resources connected, tasks completed or a documented improvement in the user's stated outcome. “Users generated” alone is not an impact metric.

## 7. Non-negotiable principles

1. **Useful before impressive.** A beautiful surface must lead to a real next step.
2. **Human agency.** AI suggests, structures and accelerates; the user decides.
3. **Evidence over aspiration.** Claims about impact need a visible basis.
4. **Privacy by default.** Collect the minimum data, explain its use and provide control.
5. **Accessibility by default.** Clear language, keyboard support, readable contrast and reduced motion are part of the product.
6. **Low-friction entry.** The first meaningful value should not require a paid plan.
7. **Progressive complexity.** The Core stays simple; advanced production complexity belongs in the Dev Hub.
8. **No premature globalism.** Start with one complete use case, then generalise what proves useful.
9. **Responsible ambition.** Global impact is the result of adoption, outcomes and networks—not a substitute for them.

## 8. Relationship with the existing VOLYNX repo

The current repository remains the public and operational source of truth for the existing platform. This phase does not delete or rewrite the current product surfaces.

Before changing routes or homepage code, we must:

- preserve existing product, checkout, delivery and authentication paths;
- decide whether `/platform/` becomes the Dev Hub landing surface or remains a compatibility alias;
- define the canonical Core route and update `src/data/routes.ts` deliberately;
- keep `/volynx-launch/` as a separate cinematic launch surface;
- preserve the existing `apps/volynx-os` operational boundary;
- make the Core-to-Dev-Hub handoff explicit in navigation and analytics.

### Proposed route model — not yet implemented

```text
/                    VOLYNX Core
/dev-hub/             Dev Hub landing surface
/platform/            Compatibility or redirect policy to decide
/world/               World network and marketplace
/manifesto/           Purpose, principles and transparency
/volynx-launch/       Preserved cinematic launch story
existing routes      Builder, Daily, Lab, CVitae, products, services, account
```

## 9. Delivery sequence

### Phase 0 — Alignment

- approve the Core promise;
- choose the first audience and non-medical problem wedge;
- define the minimum Impact Map;
- list existing Dev Hub capabilities that are genuinely ready to support it;
- write the privacy and safety boundaries before AI features.

### Phase 1 — Experience prototype

- create three Core information-architecture directions;
- test the first-run flow without production integration;
- explore a signature visual language, with and without an eye;
- validate the language with people outside the developer audience.

### Phase 2 — Functional MVP

- implement onboarding and Impact Map;
- connect one real Dev Hub workflow end to end;
- store user-owned goals, decisions and evidence safely;
- add loading, empty, error, consent and recovery states;
- measure completed outcomes, not only page views.

### Phase 3 — Network and proof

- add World discovery where it genuinely helps execution;
- add evidence and impact history;
- publish the first transparent case studies;
- only then expand toward APIs, organisations and broader global use cases.

## 10. Decisions still open

- Is “impact” initially social, environmental, professional or a carefully bounded combination?
- Who is the first paying customer: an individual builder, a small team, an NGO or a service partner?
- Is Impact Studio a standalone product, an orchestrator over the Dev Hub, or both?
- What data may be sent to external AI providers, and what must remain local or private?
- What is the first outcome we can prove within one complete user journey?
- Does World participate in the first MVP, or wait until the execution loop is validated?
- What pricing model supports free access for qualifying causes without creating an unmanageable promise?

## 11. Definition of “ready to build”

We should not redesign the homepage or implement the Core until we have:

- one approved promise;
- one initial audience;
- one concrete problem;
- one complete user journey;
- one measurable outcome;
- one explicit data and safety boundary;
- one confirmed Dev Hub handoff;
- one visual direction that survives desktop, mobile, accessibility and reduced-motion review.

**Current status:** the architecture is directionally approved; the audience, wedge, promise wording and first measurable outcome remain open decisions.

