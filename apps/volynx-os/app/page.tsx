import { headers } from "next/headers"
import { DocumentLanguage } from "@/components/common/document-language"
import { SiteHeader } from "@/components/common/site-header"
import { SiteFooter } from "@/components/common/site-footer"
import { Hero } from "@/components/sections/hero"
import { LogoCloud } from "@/components/sections/logo-cloud"
import { LaunchOffer } from "@/components/sections/launch-offer"
import { MetricsBand } from "@/components/sections/metrics-band"
import { ProductKits } from "@/components/sections/product-kits"
import { ValueGrid } from "@/components/sections/value-grid"
import { FeatureSplit } from "@/components/sections/feature-split"
import { WorkflowSteps } from "@/components/sections/workflow-steps"
import { Testimonials } from "@/components/sections/testimonials"
import { Comparison } from "@/components/sections/comparison"
import { Pricing } from "@/components/sections/pricing"
import { FAQ } from "@/components/sections/faq"
import { FinalCTA } from "@/components/sections/final-cta"
import { getHomeContent } from "@/content/home"
import { resolveSiteLocale, documentLanguage } from "@/lib/site-locale"

type HomePageProps = {
  searchParams?: {
    lang?: string | string[]
  }
}

export default function HomePage({ searchParams }: HomePageProps) {
  const locale = resolveSiteLocale(searchParams?.lang, headers().get("accept-language"))
  const content = getHomeContent(locale)

  return (
    <>
      <DocumentLanguage lang={documentLanguage(locale)} />
      <SiteHeader locale={locale} showLanguageToggle languageHrefBase="/" />
      <main>
        <Hero
          variant="product"
          eyebrow={content.hero.eyebrow}
          brandCaption={content.hero.brandCaption}
          title={content.hero.title}
          subtitle={content.hero.subtitle}
          primaryCta={content.hero.primaryCta}
          primaryHref="https://volynx.world/products/"
          secondaryCta={content.hero.secondaryCta}
          secondaryHref="#kits"
        />
        <LogoCloud />
        <LaunchOffer items={content.launchOffer.items} ctaLabel={content.launchOffer.ctaLabel} />
        <ProductKits
          badge={content.productKits.badge}
          title={content.productKits.title}
          copy={content.productKits.copy}
          items={content.productKits.items}
          openLabel={content.productKits.openLabel}
        />
        <MetricsBand items={content.metrics} />
        <ValueGrid
          badge={content.valueGrid.badge}
          title={content.valueGrid.title}
          copy={content.valueGrid.copy}
          cards={content.valueGrid.cards}
        />
        <FeatureSplit
          badge={content.featureSplit.badge}
          title={content.featureSplit.title}
          copy={content.featureSplit.copy}
          points={content.featureSplit.points}
          stats={content.featureSplit.stats}
        />
        <WorkflowSteps
          badge={content.workflow.badge}
          title={content.workflow.title}
          copy={content.workflow.copy}
          items={content.workflow.items}
        />
        <Testimonials
          badge={content.testimonials.badge}
          title={content.testimonials.title}
          copy={content.testimonials.copy}
          items={content.testimonials.items}
        />
        <Comparison
          badge={content.comparison.badge}
          title={content.comparison.title}
          copy={content.comparison.copy}
          headers={content.comparison.headers}
          rows={content.comparison.rows}
        />
        <Pricing
          variant="tiered"
          titleOverride={content.pricing.title}
          copyOverride={content.pricing.copy}
          platformTiersOverride={content.pricing.tiers}
          labels={{
            badge: content.pricing.badge,
            choose: content.pricing.chooseLabel,
            get: content.pricing.getLabel,
            bestValue: content.pricing.bestValueLabel,
            comparisonFeature: content.pricing.comparisonFeatureLabel,
            upsellBadge: content.pricing.upsellBadge,
            comparePro: content.pricing.compareProLabel,
            upsellTitle: content.pricing.upsellTitle,
            upsellBody: content.pricing.upsellBody,
            annualLabel: content.pricing.annualLabel
          }}
        />
        <FAQ
          badge={content.faq.badge}
          title={content.faq.title}
          copy={content.faq.copy}
          items={content.faq.items}
        />
        <FinalCTA
          eyebrow={content.finalCta.eyebrow}
          title={content.finalCta.title}
          subtitle={content.finalCta.subtitle}
          primaryCta={content.finalCta.primaryCta}
          primaryHref="https://volynx.world/products/"
          secondaryCta={content.finalCta.secondaryCta}
          secondaryHref="/docs"
        />
      </main>
      <SiteFooter locale={locale} />
    </>
  )
}
