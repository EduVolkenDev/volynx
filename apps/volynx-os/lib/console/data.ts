import type { CatalogEntry, SelectedContext, TenantContext } from './types'

export function contextPath(ctx: TenantContext, section = ''): string {
  const base = `/console/${encodeURIComponent(ctx.client)}/${encodeURIComponent(ctx.product)}/${encodeURIComponent(ctx.env)}`
  return section ? `${base}/${encodeURIComponent(section)}` : base
}

export function selectedContext(entry: CatalogEntry): SelectedContext {
  return {
    client: entry.client.id, product: entry.product.id, env: entry.environment.id,
    clientName: entry.client.name, productName: entry.product.name, environmentName: entry.environment.name
  }
}

export function contextLabel(ctx: SelectedContext): string {
  return `${ctx.clientName} · ${ctx.productName} · ${ctx.environmentName}`
}

/** Plain-language guidance authored by Muse in premium pass 364429d. */
export const MODULE_GUIDE: Record<
  string,
  { blurb: string; guidance: { title: string; body: string } }
> = {
  health: {
    blurb: "Is the product alive? Watches the app, database and storage — and says so in plain words.",
    guidance: {
      title: "No health checks yet",
      body: "Connect a monitoring source and this module will tell you whether each part of your product is working. Until then we show nothing rather than guess — unknown is not operational.",
    },
  },
  domain: {
    blurb: "Can customers reach you? Tracks your domain, DNS and certificate expiry.",
    guidance: {
      title: "No domain connected",
      body: "Point a domain at this product and we'll watch it for you: DNS resolving, certificate valid, CDN in front. One glance tells you if the front door is open.",
    },
  },
  deployments: {
    blurb: "What shipped, when, and whether it worked. Every release, with its story.",
    guidance: {
      title: "No deployment source",
      body: "Connect your repository or hosting provider and every release appears here — what changed, who shipped it, and whether it succeeded. Failed deploys show their reason, never silently.",
    },
  },
  backups: {
    blurb: "If everything broke tomorrow, could you come back? That's what this answers.",
    guidance: {
      title: "Backup capability unknown",
      body: "Tell us where backups live and how long they're kept. We track the last successful backup and whether a restore is actually possible. We never assume your git history counts as a backup.",
    },
  },
  security: {
    blurb: "Are the doors locked? Every protection claim shown with its evidence.",
    guidance: {
      title: "No security evidence yet",
      body: "HTTPS, WAF and DDoS protection appear here only when we can show you the technical evidence behind each claim. No evidence, no badge — that's the rule.",
    },
  },
  care: {
    blurb: "Who keeps this product healthy day to day — and what they're responsible for.",
    guidance: {
      title: "No care plan attached",
      body: "Attach a care plan to see what's covered: preventive maintenance, fixes, support channel and response times. Your product's safety net, spelled out.",
    },
  },
  incidents: {
    blurb: "When something breaks, this is the timeline. What happened, what's being done.",
    guidance: {
      title: "No incident tracking yet",
      body: "Active incidents and their full lifecycle — detected, investigating, mitigating, resolved — appear here once monitoring is connected. No news is not good news; it's unknown news.",
    },
  },
  products: {
    blurb: "Every product under this client, with its identity and status.",
    guidance: {
      title: "No products registered",
      body: "Products appear here once they're registered in the platform, each with its immutable Volynx ID.",
    },
  },
  resources: {
    blurb: "Every service this product runs on — databases and storage, when their providers are connected.",
    guidance: {
      title: "No providers connected",
      body: "Cloudflare, database and storage providers appear here once connected — with the resources each one manages.",
    },
  },
  support: {
    blurb: "Talk to the humans who keep your product alive.",
    guidance: {
      title: "Support isn't wired up yet",
      body: "Past requests and their status will live here once the ticketing integration exists.",
    },
  },
};
