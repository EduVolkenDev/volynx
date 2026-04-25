export const legalUpdated = "April 22, 2026"
export const supportEmail = "support@volynx.world"

export type LegalPageContent = {
  title: string
  description: string
  sections: {
    title: string
    body: string[]
  }[]
}

export const legalPages = {
  terms: {
    title: "Terms of Service",
    description: "The rules for using VolynxOS products, demos, documentation and digital downloads.",
    sections: [
      {
        title: "Digital products",
        body: [
          "VolynxOS sells digital kits, templates, icon packs, documentation and related commercial assets. Product pages describe what is included before purchase.",
          "Access is delivered digitally. You are responsible for keeping your download links, project files and license records secure."
        ]
      },
      {
        title: "Permitted use",
        body: [
          "You may use purchased VolynxOS products for your own commercial projects and for client work, subject to the License page.",
          "You may modify the source, copy, styling and assets for final websites, apps and marketing materials."
        ]
      },
      {
        title: "Restrictions",
        body: [
          "You may not resell, redistribute, publish or share VolynxOS source files, templates or icon packs as standalone products.",
          "You may not use VolynxOS products to create a competing template, icon, UI kit or asset marketplace."
        ]
      },
      {
        title: "Payments and delivery",
        body: [
          "Checkout, tax collection, receipts and payment processing may be handled by third-party providers such as Stripe.",
          "A test-mode checkout is not a valid production purchase. Public launch checkouts must use live payment sessions."
        ]
      },
      {
        title: "Liability",
        body: [
          "VolynxOS products are provided as digital launch assets. They do not guarantee revenue, conversions, search rankings or business outcomes.",
          "To the maximum extent allowed by law, liability is limited to the amount paid for the affected product."
        ]
      }
    ]
  },
  privacy: {
    title: "Privacy Policy",
    description: "How VolynxOS handles order, support and site usage information.",
    sections: [
      {
        title: "Information collected",
        body: [
          "VolynxOS may receive information needed to deliver products and support orders, such as name, email address, order details and support messages.",
          "Payment card details are handled by the checkout provider and are not stored in this codebase."
        ]
      },
      {
        title: "How information is used",
        body: [
          "Order information is used to deliver downloads, verify licenses, answer support requests and prevent abuse.",
          "Technical information may be used to maintain site performance, diagnose errors and improve the product experience."
        ]
      },
      {
        title: "Third parties",
        body: [
          "Checkout, analytics, hosting, email and support tools may process limited information required to operate the business.",
          "Those providers are expected to process information under their own security and privacy obligations."
        ]
      },
      {
        title: "Your choices",
        body: [
          "You can request correction or deletion of support records where retention is not required for legal, tax, fraud prevention or licensing reasons.",
          `For privacy questions, contact ${supportEmail}.`
        ]
      }
    ]
  },
  refund: {
    title: "Refund Policy",
    description: "Refund rules for VolynxOS digital kits, icon packs and launch assets.",
    sections: [
      {
        title: "7-day preview-match guarantee",
        body: [
          "If the delivered kit does not materially match the public previews or product description, request a refund within 7 days of purchase.",
          "Include the order email, product name, tier, and screenshots or notes showing the mismatch."
        ]
      },
      {
        title: "Delivery problems",
        body: [
          "Duplicate charges, failed delivery links, corrupted downloads or missing files will be fixed first. If the issue cannot be fixed quickly, a refund may be issued.",
          "If a download link expires, contact support from the purchase email so the order can be verified."
        ]
      },
      {
        title: "Non-refundable cases",
        body: [
          "Digital products are generally not refundable after access when the delivered files match the preview and product description.",
          "Refunds are not normally issued for change of mind, unsupported custom modifications, or incompatibility caused by third-party changes after download."
        ]
      },
      {
        title: "How to request",
        body: [
          `Email ${supportEmail} within 7 days using the purchase email when possible.`,
          "For launch safety, complete one low-value live purchase before public release to verify checkout, receipt, webhook delivery and ZIP contents."
        ]
      }
    ]
  },
  license: {
    title: "License",
    description: "Commercial usage rights for VolynxOS kits, source files and icon packs.",
    sections: [
      {
        title: "What you can do",
        body: [
          "A purchase grants a non-exclusive license to use the product in personal, commercial and client projects.",
          "You may modify, deploy and adapt the code, sections, copy, styling and included assets in final websites or applications."
        ]
      },
      {
        title: "Client work",
        body: [
          "You may deliver finished client projects built with VolynxOS products.",
          "Clients may use the finished project, but they do not receive the right to resell or redistribute the original VolynxOS product files."
        ]
      },
      {
        title: "Icon packs",
        body: [
          "Icon packs may be embedded in final designs, websites, apps, presentations and marketing assets.",
          "Icon packs may not be redistributed as raw files, bundled into another asset pack, or sold as standalone icons."
        ]
      },
      {
        title: "What you cannot do",
        body: [
          "You may not resell, sublicense, upload, share or publish the source package as a template, starter kit, UI kit, theme or icon pack.",
          "You may not use VolynxOS products to train, package or seed a competing asset library without written permission."
        ]
      }
    ]
  },
  cookies: {
    title: "Cookie Policy",
    description: "How cookies and local browser storage may be used on VolynxOS.",
    sections: [
      {
        title: "Essential storage",
        body: [
          "The site may use essential cookies or local storage for core behavior such as theme preferences, session continuity and checkout handoff.",
          "These are used to keep the site functional and consistent between visits."
        ]
      },
      {
        title: "Analytics and performance",
        body: [
          "If analytics are enabled, they should be used to understand page performance, errors and aggregate usage patterns.",
          "Analytics should not be used to collect payment card details or private project files."
        ]
      },
      {
        title: "Checkout providers",
        body: [
          "External checkout providers may set their own cookies or security storage when you open a payment page.",
          "Those cookies are controlled by the provider and are needed for fraud prevention and checkout completion."
        ]
      },
      {
        title: "Control",
        body: [
          "You can clear or block cookies in your browser settings, but some site or checkout features may stop working correctly."
        ]
      }
    ]
  },
  support: {
    title: "Support",
    description: "Help with downloads, product access, licensing and delivery issues.",
    sections: [
      {
        title: "What support covers",
        body: [
          "Support covers purchase verification, download access, missing files, corrupted ZIPs, license questions and product defects.",
          "Support does not include custom implementation work, full project builds or debugging unrelated third-party systems unless explicitly agreed."
        ]
      },
      {
        title: "Before contacting support",
        body: [
          "Include your order email, product name, tier, purchase date, browser and a short description of the issue.",
          "For file problems, include the ZIP name and the path of the missing or broken file."
        ]
      },
      {
        title: "Contact",
        body: [
          `Email ${supportEmail}. Use the purchase email when possible so the order can be verified faster.`,
          "For urgent launch issues, include URGENT in the subject and describe the public page or checkout affected."
        ]
      }
    ]
  },
  about: {
    title: "About VolynxOS",
    description: "VolynxOS is a premium launch operating system for commercial digital product kits.",
    sections: [
      {
        title: "What it is",
        body: [
          "VolynxOS packages reusable sections, premium visual language, pricing logic, documentation and commercial CTAs into launch-ready product lines.",
          "It is built for portfolio builders, agencies, SaaS teams and product operators who need a credible launch surface quickly."
        ]
      },
      {
        title: "How it is different",
        body: [
          "The system is organized around reusable product infrastructure rather than one-off pages.",
          "Content, kit offers, pricing and demo pages live in structured files so the platform can grow without losing coherence."
        ]
      }
    ]
  },
  contact: {
    title: "Contact",
    description: "Reach VolynxOS for support, licensing questions and commercial requests.",
    sections: [
      {
        title: "Support and orders",
        body: [
          `For product support, refunds, delivery issues or license questions, email ${supportEmail}.`,
          "Include your order email, product name, tier and a clear description of what you need."
        ]
      },
      {
        title: "Commercial requests",
        body: [
          "For partnerships, custom licensing or product-line questions, include the project context, expected use and launch timeline.",
          "Do not send payment card details or private credentials by email."
        ]
      }
    ]
  }
} satisfies Record<string, LegalPageContent>

export type LegalPageKey = keyof typeof legalPages
