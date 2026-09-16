import {
  propertyFlowTemplates as VOLYNX_OS_TEMPLATES,
  propertyFlowTiers as VOLYNX_OS_TIERS,
  type PropertyFlowTemplateKey as PropertyFlowTemplateKeySource,
  type PropertyFlowTierId,
} from "../../apps/volynx-os/content/propertyflow";

export type PropertyFlowTier = PropertyFlowTierId | "unknown";
export type PropertyFlowTemplateKey = PropertyFlowTemplateKeySource;

export type PropertyFlowTemplate = {
  key: PropertyFlowTemplateKey;
  name: string;
  description: string;
  bestFor: string;
  minimumTier: Exclude<PropertyFlowTier, "unknown">;
};

const tierRank: Record<PropertyFlowTier, number> = { unknown: 0, starter: 1, professional: 2, "white-label": 3 };
const tierLabel: Record<Exclude<PropertyFlowTier, "unknown">, string> = { starter: "Starter", professional: "Professional", "white-label": "White-Label" };

function sourceTierToId(value: string): Exclude<PropertyFlowTier, "unknown"> {
  if (value === "Starter") return "starter";
  if (value === "Professional" || value === "Pro+") return "professional";
  return "white-label";
}

function sourceTier(id: Exclude<PropertyFlowTier, "unknown">) {
  return VOLYNX_OS_TIERS.find((tier) => tier.id === id);
}

export const PROPERTY_FLOW_TIERS = {
  starter: { label: tierLabel.starter, templateCount: sourceTier("starter")?.templateCount || 3, templateDescription: `${sourceTier("starter")?.templateCount || 3} layouts essenciais` },
  professional: { label: tierLabel.professional, templateCount: sourceTier("professional")?.templateCount || 6, templateDescription: `${sourceTier("professional")?.templateCount || 6} layouts para operação completa` },
  "white-label": { label: tierLabel["white-label"], templateCount: sourceTier("white-label")?.templateCount || 15, templateDescription: `${sourceTier("white-label")?.templateCount || 15} layouts e variações premium` },
  unknown: { label: "Tier não identificado", templateCount: 0, templateDescription: "Aguardando confirmação da compra" },
} as const satisfies Record<PropertyFlowTier, { label: string; templateCount: number; templateDescription: string }>;

export const PROPERTY_FLOW_TEMPLATES: readonly PropertyFlowTemplate[] = VOLYNX_OS_TEMPLATES.map((template) => ({
  key: template.key,
  name: template.name,
  description: template.description,
  bestFor: template.bestFor,
  minimumTier: sourceTierToId(template.tier),
}));

export function propertyFlowTier(value: unknown): PropertyFlowTier {
  const normalized = String(value || "").toLowerCase().replace(/_/g, "-");
  if (normalized === "starter" || normalized === "pf-starter") return "starter";
  if (normalized === "professional" || normalized === "professional+" || normalized === "pro" || normalized === "pf-professional") return "professional";
  if (normalized === "white-label" || normalized === "enterprise" || normalized === "pf-white-label" || normalized === "pf-enterprise") return "white-label";
  return "unknown";
}

export function propertyFlowTemplateAllowed(tier: PropertyFlowTier, template: PropertyFlowTemplate): boolean {
  return tier !== "unknown" && tierRank[tier] >= tierRank[template.minimumTier];
}

export function propertyFlowTemplatesForTier(tier: PropertyFlowTier): readonly PropertyFlowTemplate[] {
  return PROPERTY_FLOW_TEMPLATES.filter((template) => propertyFlowTemplateAllowed(tier, template));
}

export function propertyFlowTemplate(value: unknown): PropertyFlowTemplate | undefined {
  const legacyAliases: Record<string, PropertyFlowTemplateKey> = {
    "map-view": "map-first",
    "tabbed-categories": "grouped",
    "carousel-hero": "showroom",
  };
  const key = legacyAliases[String(value || "")] || String(value || "");
  return PROPERTY_FLOW_TEMPLATES.find((template) => template.key === key);
}
