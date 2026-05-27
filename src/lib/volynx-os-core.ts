import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type CoreSnapshot = {
  id?: string;
  site_id?: string;
  version?: number;
  published_at?: string;
  payload: CoreSnapshotPayload;
};

export type CoreSnapshotPayload = {
  site?: {
    id?: string;
    name?: string;
    slug?: string;
    language_default?: string;
    theme?: Record<string, any>;
    seo?: Record<string, any>;
  };
  pages?: CorePage[];
  forms?: CoreForm[];
  navigation?: CoreNavigationItem[];
};

export type CorePage = {
  id?: string;
  title?: string;
  slug?: string;
  path?: string;
  type?: string;
  seo?: Record<string, any>;
  settings?: Record<string, any>;
  sections?: CoreSection[];
};

export type CoreSection = {
  id?: string;
  section_key?: string;
  section_type?: string;
  variant?: string;
  content?: Record<string, any>;
  design?: Record<string, any>;
  behavior?: Record<string, any>;
  sort_order?: number;
};

export type CoreForm = {
  id?: string;
  name?: string;
  slug?: string;
  fields?: Array<Record<string, any>>;
  settings?: Record<string, any>;
};

export type CoreNavigationItem = {
  label?: string;
  href?: string;
  location?: string;
  is_external?: boolean;
  sort_order?: number;
};

export type LegacyBuilderPage = {
  brand: {
    name: string;
    colors: {
      primary: string;
      bg: string;
      fg: string;
      accent: string;
    };
  };
  meta: {
    title: string;
    description: string;
    language: string;
  };
  sections: Array<Record<string, any>>;
};

export const DEMO_CORE_SNAPSHOT: CoreSnapshot = {
  version: 0,
  published_at: new Date(0).toISOString(),
  payload: {
    site: {
      name: "VOLYNX OS Core Demo",
      slug: "core-demo",
      language_default: "pt",
      theme: {
        primaryColor: "#101010",
        accentColor: "#D6B36A",
        backgroundColor: "#070A12",
        textColor: "#E7EEF7",
      },
      seo: {
        title: "VOLYNX OS Core Demo",
        description: "Base universal para sites, seções, leads, SEO, mídia e publicação por snapshot.",
      },
    },
    pages: [
      {
        title: "Home",
        slug: "home",
        path: "/",
        type: "landing",
        seo: {
          title: "VOLYNX OS Core",
          description: "Renderer universal com páginas montadas por seções.",
        },
        sections: [
          {
            section_key: "hero",
            section_type: "hero",
            variant: "split-premium",
            sort_order: 0,
            content: {
              eyebrow: "VOLYNX OS Core",
              title: "Uma base universal para vender sites em escala",
              subtitle:
                "Páginas, seções, formulários, leads, mídia, SEO, integrações e publicação estável em um modelo multi-tenant.",
              primaryCta: { label: "Ver planos", href: "#pricing" },
              secondaryCta: { label: "Falar com VOLYNX", href: "#contact" },
            },
            design: { layout: "split" },
          },
          {
            section_key: "features",
            section_type: "features",
            variant: "grid",
            sort_order: 10,
            content: {
              title: "Tudo que um site de cliente precisa para nascer organizado",
              items: [
                { title: "Multi-tenant", text: "Cada cliente fica isolado por organization_id." },
                { title: "Seções reutilizáveis", text: "A mesma página pode mudar de template sem mudar de banco." },
                { title: "Leads universais", text: "Formulários diferentes caem na mesma base operacional." },
                { title: "Snapshots", text: "O publicado fica congelado, rápido e reversível." },
              ],
            },
          },
          {
            section_key: "pricing",
            section_type: "pricing",
            variant: "three-tier",
            sort_order: 20,
            content: {
              title: "Planos base para vender sites recorrentes",
              plans: [
                { name: "Launch", price: "9", currency: "GBP", features: ["1 site", "Subdomínio", "Leads básicos"] },
                { name: "Pro", price: "19", currency: "GBP", featured: true, features: ["3 sites", "Domínio próprio", "Snapshots e mídia"] },
                { name: "Studio", price: "39", currency: "GBP", features: ["10 sites", "Clientes múltiplos", "Integrações"] },
              ],
            },
          },
          {
            section_key: "faq",
            section_type: "faq",
            variant: "accordion",
            sort_order: 30,
            content: {
              title: "Perguntas frequentes",
              items: [
                { question: "Isso substitui o Builder?", answer: "Não. Isso é o núcleo de dados que permite o Builder criar e publicar sites." },
                { question: "O cliente vê o banco?", answer: "Não. O cliente vê uma interface simples: páginas, seções, leads, imagens, aparência e publicar." },
                { question: "Por que snapshots?", answer: "Para proteger o publicado enquanto o draft continua sendo editado." },
              ],
            },
          },
        ],
      },
    ],
  },
};

export async function createCoreClient(
  configUrl = "/config.json",
  override?: { supabaseUrl?: string; supabaseAnonKey?: string },
): Promise<SupabaseClient> {
  const res = await fetch(configUrl, { cache: "no-store" });
  if (!res.ok) throw new Error("config.json not found.");

  const cfg = await res.json();
  const supabaseUrl = override?.supabaseUrl || cfg.supabaseUrl;
  const supabaseAnonKey = override?.supabaseAnonKey || cfg.supabaseAnonKey;

  cfg.supabaseUrl = supabaseUrl;
  cfg.supabaseAnonKey = supabaseAnonKey;

  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) {
    throw new Error("Missing supabaseUrl or supabaseAnonKey in config.json.");
  }

  return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function fetchLatestPublishedSnapshot(
  supabase: SupabaseClient,
  siteSlug: string,
): Promise<CoreSnapshot | null> {
  const { data, error } = await supabase.rpc("get_latest_published_snapshot", {
    p_site_slug: siteSlug,
  });

  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as CoreSnapshot | null;
}

export function coreSnapshotToBuilderPage(
  snapshot: CoreSnapshot,
  path = "/",
): LegacyBuilderPage {
  const payload = snapshot.payload || {};
  const site = payload.site || {};
  const theme = site.theme || {};
  const seo = site.seo || {};
  const page = selectPage(payload.pages || [], path);

  return {
    brand: {
      name: site.name || "VOLYNX Site",
      colors: {
        primary: theme.primaryColor || "#7DD3FC",
        bg: theme.backgroundColor || "#070A12",
        fg: theme.textColor || "#E7EEF7",
        accent: theme.accentColor || "#34D399",
      },
    },
    meta: {
      title: page?.seo?.title || seo.title || site.name || "VOLYNX Site",
      description: page?.seo?.description || seo.description || "",
      language: site.language_default || "pt",
    },
    sections: (page?.sections || [])
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((section) => normalizeSection(section, payload.forms || []))
      .filter(Boolean) as Array<Record<string, any>>,
  };
}

function selectPage(pages: CorePage[], path: string): CorePage | undefined {
  const cleanPath = normalizePath(path);
  return (
    pages.find((page) => normalizePath(page.path || "/") === cleanPath) ||
    pages.find((page) => normalizePath(page.path || "/") === "/") ||
    pages[0]
  );
}

function normalizePath(path: string): string {
  if (!path) return "/";
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
}

function normalizeSection(section: CoreSection, forms: CoreForm[]): Record<string, any> | null {
  const type = section.section_type || "";
  const content = section.content || {};

  if (type === "hero") {
    return {
      ...section,
      type: "hero",
      variant: section.design?.layout === "split" ? "split" : section.variant || "centered",
      content: {
        ...content,
        badge: content.badge || content.eyebrow,
      },
    };
  }

  if (type === "features") {
    return {
      ...section,
      type: "valueGrid",
      content: {
        title: content.title,
        subtitle: content.subtitle,
        cards: (content.cards || content.items || []).map((item: Record<string, any>) => ({
          title: item.title,
          description: item.description || item.text,
        })),
      },
    };
  }

  if (type === "pricing") {
    return {
      ...section,
      type: "pricing",
      content: {
        title: content.title,
        subtitle: content.subtitle,
        tiers: (content.tiers || content.plans || []).map((plan: Record<string, any>) => ({
          name: plan.name,
          price: formatPrice(plan),
          period: plan.period || plan.billing_interval || "/month",
          description: plan.description,
          features: plan.features || [],
          highlight: Boolean(plan.highlight || plan.featured),
          cta: plan.cta || { label: "Get started", href: "#contact" },
        })),
      },
    };
  }

  if (type === "faq") {
    return { ...section, type: "faq", content };
  }

  if (type === "contact") {
    const form = forms.find((item) => item.slug === content.formSlug);
    return {
      ...section,
      type: "contactForm",
      content: {
        ...content,
        fields: form?.fields,
        submitLabel: content.submitLabel || form?.settings?.submitLabel || "Send message",
      },
    };
  }

  if (type === "cta") {
    return { ...section, type: "cta", content };
  }

  if (type === "testimonials") {
    return { ...section, type: "testimonial", content };
  }

  return null;
}

function formatPrice(plan: Record<string, any>): string {
  if (plan.price != null && plan.currency) return `${currencySymbol(plan.currency)}${plan.price}`;
  if (plan.price != null) return String(plan.price);
  if (plan.price_amount != null) return `${currencySymbol(plan.currency)}${Number(plan.price_amount) / 100}`;
  return "Custom";
}

function currencySymbol(currency = "GBP"): string {
  const normalized = String(currency).toUpperCase();
  if (normalized === "GBP") return "£";
  if (normalized === "EUR") return "€";
  if (normalized === "USD") return "$";
  return `${normalized} `;
}
