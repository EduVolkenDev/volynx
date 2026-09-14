export type PropertyFlowColorTokens = {
  primary: string;
  accent: string;
  ink: string;
  surface: string;
};

export type PropertyFlowFieldConfig = {
  visible: boolean;
  required: boolean;
};

export type PropertyFlowAdminConfig = {
  version: 1;
  brand: {
    name: string;
    tagline: string;
    logoUrl: string;
    mark: string;
    colors: PropertyFlowColorTokens;
    radius: "soft" | "rounded" | "sharp";
  };
  labels: {
    overview: string;
    properties: string;
    appearance: string;
    modules: string;
    newProperty: string;
    publish: string;
    archive: string;
  };
  modules: {
    overview: boolean;
    properties: boolean;
    appearance: boolean;
    modules: boolean;
  };
  propertyFields: Record<
    "category" | "price" | "location" | "summary" | "description" | "whatsapp",
    PropertyFlowFieldConfig
  >;
};

export const DEFAULT_PROPERTY_FLOW_ADMIN_CONFIG: PropertyFlowAdminConfig = {
  version: 1,
  brand: {
    name: "Property Flow",
    tagline: "Seu catálogo imobiliário, sob seu controle.",
    logoUrl: "",
    mark: "PF",
    colors: {
      primary: "#8de7d5",
      accent: "#a9a0ff",
      ink: "#f7f8fc",
      surface: "#0c111d",
    },
    radius: "rounded",
  },
  labels: {
    overview: "Visão geral",
    properties: "Imóveis",
    appearance: "Identidade",
    modules: "Módulos e campos",
    newProperty: "Novo imóvel",
    publish: "Publicar",
    archive: "Arquivar",
  },
  modules: {
    overview: true,
    properties: true,
    appearance: true,
    modules: true,
  },
  propertyFields: {
    category: { visible: true, required: false },
    price: { visible: true, required: false },
    location: { visible: true, required: false },
    summary: { visible: true, required: false },
    description: { visible: true, required: false },
    whatsapp: { visible: true, required: false },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeRecords<T extends Record<string, unknown>>(base: T, override: unknown): T {
  if (!isRecord(override)) return { ...base } as T;

  const next: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    next[key] = isRecord(next[key]) && isRecord(value)
      ? mergeRecords(next[key] as Record<string, unknown>, value)
      : value;
  }
  return next as T;
}

export function getPropertyFlowAdminConfig(
  siteSettings: unknown,
  siteTheme: unknown,
): PropertyFlowAdminConfig {
  const settings = isRecord(siteSettings) ? siteSettings : {};
  const theme = isRecord(siteTheme) ? siteTheme : {};
  const fromSettings = settings.property_flow_admin;
  const fromTheme = isRecord(theme.property_flow) ? theme.property_flow.admin : null;

  return mergeRecords(
    mergeRecords(DEFAULT_PROPERTY_FLOW_ADMIN_CONFIG as unknown as Record<string, unknown>, fromTheme),
    fromSettings,
  ) as unknown as PropertyFlowAdminConfig;
}

export function configForSitePersistence(config: PropertyFlowAdminConfig) {
  return {
    settings: {
      property_flow_admin: config,
    },
    theme: {
      property_flow: {
        brand: config.brand,
        admin: config,
      },
    },
  };
}
