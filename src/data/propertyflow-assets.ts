/**
 * PropertyFlow's visual vocabulary.
 *
 * Keep these paths semantic: pages should ask for the idea they need, not
 * know the source asset's numeric filename or delivery folder.
 */
export const propertyFlowAssets = {
  editorial: {
    signatureEntrance: "/assets/propertyflow/visuals/editorial/22-signature-entrance.webp",
    ownership: "/assets/propertyflow/visuals/editorial/23-property-ownership.webp",
    locationIntelligence: "/assets/propertyflow/visuals/editorial/24-location-intelligence.webp",
    architecturalPrestige: "/assets/propertyflow/visuals/editorial/25-architectural-prestige.webp",
    viewLifestyle: "/assets/propertyflow/visuals/editorial/26-view-lifestyle.webp",
    investmentValue: "/assets/propertyflow/visuals/editorial/27-investment-value.webp",
    smartProperty: "/assets/propertyflow/visuals/editorial/28-smart-property.webp",
    privateLiving: "/assets/propertyflow/visuals/editorial/29-private-living.webp",
    globalProperty: "/assets/propertyflow/visuals/editorial/30-global-property.webp",
    materialDetail: "/assets/propertyflow/visuals/editorial/32-material-detail.webp",
    interiorEvening: "/assets/propertyflow/visuals/editorial/33-interior-evening.webp",
    propertyDiscovery: "/assets/propertyflow/visuals/editorial/34-property-discovery.webp",
    neighborhood: "/assets/propertyflow/visuals/editorial/35-neighborhood.webp",
    architectureNature: "/assets/propertyflow/visuals/editorial/36-architecture-nature.webp",
    propertyData: "/assets/propertyflow/visuals/editorial/39-property-data.webp",
    propertyPortfolio: "/assets/propertyflow/visuals/editorial/40-property-portfolio.webp",
    propertyFlowFuture: "/assets/propertyflow/visuals/editorial/41-propertyflow-future.webp",
  },
  feature: {
    architecture: "/assets/propertyflow/visuals/feature/02-apartment-building.webp",
    luxuryResidence: "/assets/propertyflow/visuals/feature/03-luxury-residence.webp",
    propertyKey: "/assets/propertyflow/visuals/feature/04-property-key.webp",
    location: "/assets/propertyflow/visuals/feature/05-location.webp",
    floorPlan: "/assets/propertyflow/visuals/feature/06-floor-plan.webp",
    propertySearch: "/assets/propertyflow/visuals/feature/07-property-search.webp",
    soldRented: "/assets/propertyflow/visuals/feature/08-sold-rented.webp",
    emptyState: "/assets/propertyflow/visuals/feature/09-no-results.webp",
    publish: "/assets/propertyflow/visuals/feature/10-publish.webp",
    neighborhood: "/assets/propertyflow/visuals/feature/11-neighborhood.webp",
  },
} as const;

export type PropertyFlowAsset =
  | (typeof propertyFlowAssets.editorial)[keyof typeof propertyFlowAssets.editorial]
  | (typeof propertyFlowAssets.feature)[keyof typeof propertyFlowAssets.feature];
