export const PROPERTYFLOW_BUCKET = "propertyflow";
export const PROPERTYFLOW_VERSION = "v1.1.0";
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
    filename: "propertyflow-starter-v1.1.0.zip",
    objectPath: "pf_starter/v1.1.0.zip",
    bytes: 535988,
    sha256: "986ea8894f3199580902a3b3eab45b60442fad9dc6f9db6bed04a9f13a48e588",
    templates: 3,
  },
  pf_professional: {
    addonId: "pf_professional",
    filename: "propertyflow-professional-v1.1.0.zip",
    objectPath: "pf_professional/v1.1.0.zip",
    bytes: 536078,
    sha256: "0ef15b7fbc46ccd1276394450e1b7f20bb82d5484ec727a887a836e9bedbd4a2",
    templates: 6,
  },
  pf_white_label: {
    addonId: "pf_white_label",
    filename: "propertyflow-white-label-v1.1.0.zip",
    objectPath: "pf_white_label/v1.1.0.zip",
    bytes: 536320,
    sha256: "64a926debf8ad86213bd722145a69296d6afe594134bb89c2b228ed692d665de",
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
