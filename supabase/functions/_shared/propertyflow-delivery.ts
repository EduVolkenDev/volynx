export const PROPERTYFLOW_BUCKET = "propertyflow";
export const PROPERTYFLOW_VERSION = "v1.1.1";
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
    filename: "propertyflow-starter-v1.1.1.zip",
    objectPath: "pf_starter/v1.1.1.zip",
    bytes: 536546,
    sha256: "1445fcea5deb8d3d4c7d649778e020ebca5263b787bf542588c54b5ef652b8f1",
    templates: 3,
  },
  pf_professional: {
    addonId: "pf_professional",
    filename: "propertyflow-professional-v1.1.1.zip",
    objectPath: "pf_professional/v1.1.1.zip",
    bytes: 536635,
    sha256: "49c8a7570ff0d745af0c88deccfea213364dace3dd5b01ffece6dedf902945e9",
    templates: 6,
  },
  pf_white_label: {
    addonId: "pf_white_label",
    filename: "propertyflow-white-label-v1.1.1.zip",
    objectPath: "pf_white_label/v1.1.1.zip",
    bytes: 536878,
    sha256: "616cd7e160089c864e1b7ec9a9b556e52a908c1ff5fb23f4c04a75322d1e57ae",
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
