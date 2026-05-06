export const DEVJOURNEY_TIER_ORDER = {
  social: 0,
  pro: 1,
  bundle: 2,
};

export const DEVJOURNEY_DELIVERABLES = [
  {
    tier: "social",
    iconSrc: "/assets/devjourneyicon6.webp",
    badgeEn: "Free",
    badgePt: "Grátis",
    tierLabelEn: "Social Sprint",
    tierLabelPt: "Social Sprint",
    titleEn: "Social Sprint ZIP",
    titlePt: "ZIP Social Sprint",
    href: "/downloads/devjourney/devjourney-social.zip",
    fileName: "devjourney-social.zip",
    summaryEn: "Blocks 0-2 with updated Start Here guides, setup checklist, glossaries, starter projects and 2026 brand assets.",
    summaryPt: "Blocos 0-2 com Comece Aqui atualizado, checklist de setup, glossários, projetos starter e brand assets 2026.",
    noteEn: "Ready now for any logged-in student.",
    notePt: "Pronto agora para qualquer aluno logado.",
    ctaEn: "Download Social ZIP",
    ctaPt: "Baixar ZIP Social",
  },
  {
    tier: "pro",
    iconSrc: "/assets/devjourneyicon9.webp",
    badgeEn: "Pro",
    badgePt: "Pro",
    tierLabelEn: "Pro Track",
    tierLabelPt: "Trilha Pro",
    titleEn: "Pro Track ZIP",
    titlePt: "ZIP Trilha Pro",
    href: "/downloads/devjourney/devjourney-pro.zip",
    fileName: "devjourney-pro.zip",
    summaryEn: "Everything in Social plus Block 3, React/Vite starter, 2026 brand assets and updated review/certification guidance.",
    summaryPt: "Tudo do Social, mais Bloco 3, starter React/Vite, brand assets 2026 e orientação atualizada de revisão/certificação.",
    noteEn: "Unlocked automatically when your Dev Journey tier is upgraded to Pro.",
    notePt: "Liberado automaticamente quando seu tier do Dev Journey sobe para Pro.",
    ctaEn: "Download Pro ZIP",
    ctaPt: "Baixar ZIP Pro",
  },
  {
    tier: "bundle",
    iconSrc: "/assets/devjourneyicon19.webp",
    badgeEn: "Bundle",
    badgePt: "Bundle",
    tierLabelEn: "Bundle",
    tierLabelPt: "Bundle",
    titleEn: "Bundle ZIP",
    titlePt: "ZIP Bundle",
    href: "/downloads/devjourney/devjourney-bundle.zip",
    fileName: "devjourney-bundle.zip",
    summaryEn: "The full track: React, API, deploy workflow, 2026 brand assets, updated certification guidance and the Arsenal Kit.",
    summaryPt: "A trilha completa: React, API, workflow de deploy, brand assets 2026, orientação atualizada de certificação e Arsenal Kit.",
    noteEn: "Unlocked automatically when your Dev Journey tier is upgraded to Bundle.",
    notePt: "Liberado automaticamente quando seu tier do Dev Journey sobe para Bundle.",
    ctaEn: "Download Bundle ZIP",
    ctaPt: "Baixar ZIP Bundle",
  },
];

export function devJourneyTierRank(tier) {
  return DEVJOURNEY_TIER_ORDER[String(tier || "").toLowerCase()] ?? 0;
}

export function canAccessDevJourneyTier(userTier, requiredTier = "social") {
  return devJourneyTierRank(userTier) >= devJourneyTierRank(requiredTier);
}

export function getDevJourneyDeliverable(tier) {
  return DEVJOURNEY_DELIVERABLES.find((item) => item.tier === String(tier || "").toLowerCase()) || null;
}
