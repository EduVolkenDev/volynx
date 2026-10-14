export const PROPERTYFLOW_BUCKET = "propertyflow";
export const PROPERTYFLOW_VERSION = "v1.1.3";
export const PROPERTYFLOW_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export type PropertyFlowAddonId =
  | "pf_starter"
  | "pf_professional"
  | "pf_white_label";

export type PropertyFlowArtifact = {
  addonId: PropertyFlowAddonId;
  filename: string;
  objectPath: string;
  bytes: number;
  sha256: string;
  templates: number;
};

const ARTIFACTS: Record<PropertyFlowAddonId, PropertyFlowArtifact> = {
  pf_starter: {
    addonId: "pf_starter",
    filename: "propertyflow-starter-v1.1.3.zip",
    objectPath: "pf_starter/v1.1.3.zip",
    bytes: 5863291,
    sha256: "3c24b813da0e55933a35ec332f40356e2847d96602a613e65f8f6744d2a68964",
    templates: 3,
  },
  pf_professional: {
    addonId: "pf_professional",
    filename: "propertyflow-professional-v1.1.3.zip",
    objectPath: "pf_professional/v1.1.3.zip",
    bytes: 5863390,
    sha256: "873e4e4ac25ae2137a81cbbb718367eabed93bcc4176460a7df732ada589d04f",
    templates: 6,
  },
  pf_white_label: {
    addonId: "pf_white_label",
    filename: "propertyflow-white-label-v1.1.3.zip",
    objectPath: "pf_white_label/v1.1.3.zip",
    bytes: 5863630,
    sha256: "1be63a46fc0898f6456ec613ddf44931cc1aa70e172e9ded79a1ceec8825adbf",
    templates: 15,
  },
};

export function normalizePropertyFlowAddonId(value: unknown): PropertyFlowAddonId | null {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/_(gbp|eur|brl)$/i, "");
  const canonical = normalized === "pf_enterprise" ? "pf_white_label" : normalized;
  return canonical in ARTIFACTS ? canonical as PropertyFlowAddonId : null;
}

export function getPropertyFlowArtifact(value: unknown): PropertyFlowArtifact | null {
  const addonId = normalizePropertyFlowAddonId(value);
  return addonId ? ARTIFACTS[addonId] : null;
}

export function listPropertyFlowArtifacts(): PropertyFlowArtifact[] {
  return Object.values(ARTIFACTS);
}
