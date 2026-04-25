import { ROUTES } from "./routes";

export type PreviewMetric = {
  value: string;
  label: string;
};

export type PreviewCard = {
  title: string;
  copy: string;
};

export type PreviewFaq = {
  question: string;
  answer: string;
};

export type KitPreview = {
  id: "portfolio" | "agency" | "saas";
  name: string;
  kicker: string;
  title: string;
  summary: string;
  art: string;
  route: string;
  productRoute: string;
  docsAnchor: string;
  metrics: PreviewMetric[];
  proofCards: PreviewCard[];
  docsPreview: string[];
  deliveryPreview: string[];
  steps: PreviewCard[];
  faq: PreviewFaq[];
};

export const kitPreviews: KitPreview[] = [
  {
    id: "portfolio",
    name: "Portfolio Pro Kit",
    kicker: "Portfolio preview",
    title: "Preview the premium surface before the full kit unlocks.",
    summary:
      "A public preview for the Portfolio Pro Kit that shows positioning, section logic and delivery value without exposing the premium files.",
    art: "/assets/newportfolio.webp",
    route: ROUTES.portfolioKitPreview,
    productRoute: ROUTES.portfolioKit,
    docsAnchor: "portfolio-kit",
    metrics: [
      { value: "Personal", label: "Brand system" },
      { value: "Case", label: "Study rhythm" },
      { value: "CV", label: "Career bridge" },
      { value: "Premium", label: "First impression" },
    ],
    proofCards: [
      {
        title: "Personal brand structure",
        copy: "The preview shows how the kit frames identity, proof and availability without dumping raw source or editable files.",
      },
      {
        title: "Case-study logic",
        copy: "Visitors can inspect the narrative rhythm of the portfolio system before the paid kit opens the complete section library.",
      },
      {
        title: "Commercial polish",
        copy: "Typography, hierarchy and conversion framing stay visible as proof of quality, while the delivery package remains gated.",
      },
    ],
    docsPreview: [
      "Section map for hero, projects, experience and contact.",
      "Motion and styling guidance previewed at a commercial level.",
      "Deployment and customization topics listed without exposing the full implementation notes.",
    ],
    deliveryPreview: [
      "Buyer flow from purchase to delivery area is explained before checkout.",
      "Support, recovery and update lanes are shown as product value, not unlocked files.",
      "Full source, editable assets and internal setup details stay behind the paid delivery layer.",
    ],
    steps: [
      {
        title: "Inspect the preview",
        copy: "Use the public preview to understand the visual language, the section stack and the positioning of the kit.",
      },
      {
        title: "Choose the right tier",
        copy: "The commercial page still leads the decision, with pricing and licensing kept separate from the gated delivery package.",
      },
      {
        title: "Unlock the operating layer",
        copy: "After purchase, the buyer gets the full docs, source and recovery path that are only previewed publicly here.",
      },
    ],
    faq: [
      {
        question: "Is this the full portfolio product?",
        answer: "No. This page is only the commercial preview surface. The shipped source, docs and delivery files stay locked after purchase.",
      },
      {
        question: "Why show a preview at all?",
        answer: "Because the preview proves the premium standard and what the buyer is paying for, without cannibalizing the product itself.",
      },
    ],
  },
  {
    id: "agency",
    name: "Agency Launch Kit",
    kicker: "Agency preview",
    title: "Show the closing system. Keep the full delivery gated.",
    summary:
      "A revenue-safe preview for the Agency Launch Kit that surfaces the offer quality, buyer flow and included value without giving away the deliverables.",
    art: "/assets/newlaunch.webp",
    route: ROUTES.agencyKitPreview,
    productRoute: ROUTES.agencyKit,
    docsAnchor: "agency-kit",
    metrics: [
      { value: "SOW", label: "Scope discipline" },
      { value: "Proposal", label: "Offer framing" },
      { value: "Onboarding", label: "Client flow" },
      { value: "Premium", label: "Agency surface" },
    ],
    proofCards: [
      {
        title: "Proposal path",
        copy: "The preview makes the offer and delivery logic visible, while the actual templates and operating docs remain premium.",
      },
      {
        title: "Scope clarity",
        copy: "Public visitors can understand how the kit reduces friction and scope creep before the internal files unlock.",
      },
      {
        title: "Sales-ready presence",
        copy: "The agency website, onboarding logic and close-flow are previewed as proof of value instead of being fully exposed.",
      },
    ],
    docsPreview: [
      "Overview of proposal, SOW and onboarding lanes included after purchase.",
      "Commercial summary of what the buyer receives in the launch operating layer.",
      "Preview of implementation topics without publishing the raw templates or files.",
    ],
    deliveryPreview: [
      "The post-purchase path is previewed so the buyer knows support and recovery are part of the product.",
      "Paid buyers unlock the actual delivery package and internal operating material after checkout.",
      "Public pages only communicate value and trust, never the full asset package.",
    ],
    steps: [
      {
        title: "See the close-flow preview",
        copy: "Review how the kit helps agencies position, quote and onboard with less friction.",
      },
      {
        title: "Buy from the product page",
        copy: "Pricing, licensing and product selection stay on the commercial page, keeping the sales path clean.",
      },
      {
        title: "Unlock delivery privately",
        copy: "Internal docs, templates and delivery materials only open after the customer moves through the proper purchase flow.",
      },
    ],
    faq: [
      {
        question: "Does the preview expose the templates?",
        answer: "No. It only previews the logic and the commercial promise. The actual proposal, SOW and onboarding assets remain locked.",
      },
      {
        question: "Why connect this preview to VOLYNX?",
        answer: "Because VOLYNX is the main surface. The preview lets the main product site sell what Volynx-OS powers without leaking the paid package.",
      },
    ],
  },
  {
    id: "saas",
    name: "SaaS Landing System",
    kicker: "SaaS preview",
    title: "Preview the conversion system without exposing the shipped kit.",
    summary:
      "A safe public preview for the SaaS Landing System that shows structure, section logic and premium positioning while keeping the full asset package protected.",
    art: "/assets/saasbig.webp",
    route: ROUTES.saasSystemPreview,
    productRoute: ROUTES.saasSystem,
    docsAnchor: "saas-system",
    metrics: [
      { value: "12", label: "Core sections" },
      { value: "3", label: "Pricing lanes" },
      { value: "SEO", label: "Ready structure" },
      { value: "Fast", label: "Launch window" },
    ],
    proofCards: [
      {
        title: "Section-first story",
        copy: "The preview shows how the landing logic builds conviction without exposing the full block library or shipped kit source.",
      },
      {
        title: "Speed-aware layout",
        copy: "Visitors can feel the premium standard, performance posture and hierarchy before the full system becomes available.",
      },
      {
        title: "Launch documentation value",
        copy: "The documentation is sold as part of the product value, but only previewed publicly so the premium material stays protected.",
      },
    ],
    docsPreview: [
      "Preview of the section map, launch checklist and deployment support included after purchase.",
      "Commercial summary of the copy framework and conversion structure.",
      "Gated implementation notes stay private until the SaaS system is purchased.",
    ],
    deliveryPreview: [
      "Public buyers can understand the delivery confidence before they pay.",
      "The actual shipped files, internal notes and recovery paths stay in the gated post-purchase layer.",
      "This preserves revenue while making the product feel more concrete before checkout.",
    ],
    steps: [
      {
        title: "Evaluate the landing logic",
        copy: "Inspect the narrative, pricing rhythm and premium positioning through the public preview surface.",
      },
      {
        title: "Pick the right tier",
        copy: "The product page stays responsible for pricing, checkout and commercial conversion.",
      },
      {
        title: "Unlock the private stack",
        copy: "After purchase, the buyer receives the docs, delivery flow and files that are only previewed here.",
      },
    ],
    faq: [
      {
        question: "Is the block library public now?",
        answer: "No. The preview only proves the quality and the promise. The editable system stays part of the paid delivery.",
      },
      {
        question: "What changes for the public buyer?",
        answer: "The buyer now sees what the SaaS system offers before paying, but the premium material still stays protected behind the product flow.",
      },
    ],
  },
];

export const kitPreviewById = {
  portfolio: kitPreviews[0],
  agency: kitPreviews[1],
  saas: kitPreviews[2],
} as const;
