export const tokens = {
  brand: {
    name: "VolynxOS",
    tagline: "Premium launch operating system for commercial product kits."
  },
  spacing: {
    section: "section-space",
    container: "container-shell"
  },
  typography: {
    hero: "text-hero-sm md:text-hero-md lg:text-hero-lg font-semibold tracking-[-0.06em]",
    title: "section-title",
    copy: "section-copy"
  },
  radius: {
    lg: "rounded-[28px]",
    xl: "rounded-[36px]"
  }
} as const

export const heroVariants = ["centered", "split", "minimal", "product"] as const
export const ctaVariants = ["inline", "card", "banner"] as const
export const pricingVariants = ["single", "tiered", "comparison"] as const
