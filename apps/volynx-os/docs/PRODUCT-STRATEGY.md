# Product strategy

## Positioning
Do not market this as "another landing template".
Market it as:
- VolynxOS
- premium launch operating system
- commercial kit infrastructure

## Core differentiators
1. restrained premium aesthetics
2. section-first architecture
3. documentation and tokens
4. multi-archetype demos
5. themeable presentation presets
6. direct commercial product links
7. faster shipping and clearer sales positioning

## Pricing suggestion
- Portfolio Pro Kit: $49 / $109 / $209
- Agency Launch Kit: $69 / $149 / $289
- SaaS Landing System: $79 / $169 / $329
- Volynx Pro: $19/month or $179/year as the recurring upsell across all kit checkouts

## Offer logic
- Free trust products feed the paid shelf.
- One-time kit purchases create immediate revenue.
- Volynx Pro captures buyers who want every kit, every tier, Image Suite Pro and Daily unlimited.
- The 7-day preview-match guarantee keeps risk low because previews define the contract.
- BRL should be fixed annually from USD x 5.8, not spot converted in the front-end.

## Launch blockers
- Stripe Checkout must be in LIVE mode before public traffic. The checkout session URL should start with `cs_live_`, and deployed keys should use `pk_live_` and `sk_live_`.
- USD should be available as the default buyer currency before public launch. Add local currencies only after live Stripe prices exist for them.
- Run one low-value real purchase before launch and verify the receipt, webhook, delivery email and ZIP contents for the purchased tier.
- Legal routes required for paid digital products: `/terms`, `/privacy`, `/refund`, `/license`, `/cookies`, `/support`, `/about` and `/contact`.

## Target users
- web developers
- indie hackers
- founders
- agencies
- portfolio builders
