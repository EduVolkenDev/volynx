import { propertyFlowUrl, storeUrl } from "@/content/site"
import { type SiteLocale } from "@/lib/site-locale"

type HomeContent = {
  hero: {
    eyebrow: string
    brandCaption: string
    title: string
    subtitle: string
    primaryCta: string
    secondaryCta: string
  }
  launchOffer: {
    items: string[]
    ctaLabel: string
  }
  productKits: {
    badge: string
    title: string
    copy: string
    openLabel: string
    items: Array<{
      name: string
      label: string
      href: string
      description: string
      points: string[]
    }>
  }
  metrics: Array<{ label: string; value: string }>
  valueGrid: {
    badge: string
    title: string
    copy: string
    cards: Array<{ title: string; description: string }>
  }
  featureSplit: {
    badge: string
    title: string
    copy: string
    points: string[]
    stats: Array<{ label: string; value: string; copy: string }>
  }
  workflow: {
    badge: string
    title: string
    copy: string
    items: Array<{ step: string; title: string; copy: string }>
  }
  testimonials: {
    badge: string
    title: string
    copy: string
    items: Array<{ quote: string; name: string; role: string }>
  }
  comparison: {
    badge: string
    title: string
    copy: string
    headers: {
      decisionPoint: string
      templatePack: string
      volynx: string
    }
    rows: Array<{ feature: string; templatePack: string; volynx: string }>
  }
    pricing: {
      badge: string
      title: string
      copy: string
    tiers: Array<{
      name: string
      price: string
      description: string
      features: string[]
      highlight?: boolean
      href?: string
    }>
    chooseLabel: string
    getLabel: string
    bestValueLabel: string
      comparisonFeatureLabel: string
      upsellBadge: string
      compareProLabel: string
      upsellTitle: string
      upsellBody: string
      annualLabel: string
    }
  faq: {
    badge: string
    title: string
    copy: string
    items: Array<{ question: string; answer: string }>
  }
  finalCta: {
    eyebrow: string
    title: string
    subtitle: string
    primaryCta: string
    secondaryCta: string
  }
}

const homeContent: Record<SiteLocale, HomeContent> = {
  en: {
    hero: {
      eyebrow: "VolynxOS, not one-offs",
      brandCaption: "VX signature",
      title: "VolynxOS turns premium kits into launch-ready product lines.",
      subtitle:
        "A commercial operating system for portfolio, agency, SaaS and property products. Built to look premium, explain the offer fast and send buyers to the next step today.",
      primaryCta: "Get VolynxOS",
      secondaryCta: "Explore kits"
    },
    launchOffer: {
      items: ["Premium kit ecosystem", "Commercial-ready structure", "Launchable today"],
      ctaLabel: "Open product store"
    },
    productKits: {
      badge: "Kits",
      title: "Four product lines ready to sell from the same operating system.",
      copy: "VolynxOS turns portfolio, agency, SaaS and property products into a coherent commercial platform with clear use cases and direct buying paths.",
      openLabel: "Open kit",
      items: [
        {
          name: "Portfolio Pro Kit",
          label: "Flagship kit",
          href: "https://volynx.world/products/portfolio-pro-kit/",
          description: "Launch fast, feel premium and give your personal brand a real operating system.",
          points: ["Starts at $49", "You are the work", "5 to 12+ sections"]
        },
        {
          name: "Agency Launch Kit",
          label: "For agencies",
          href: "https://volynx.world/products/agency-launch-kit/",
          description: "Proposal, SOW and premium website structure built to close with less friction.",
          points: ["Starts at $69", "You sell others' work", "6 to 13+ sections"]
        },
        {
          name: "SaaS Landing System",
          label: "For SaaS",
          href: "https://volynx.world/products/saas-landing-system/",
          description: "Section-first, speed-aware and ready to turn product value into conviction.",
          points: ["Starts at $79", "You sell product clarity", "6 to 14+ sections"]
        },
        {
          name: "PropertyFlow",
          label: "Real estate SaaS",
          href: propertyFlowUrl,
          description: "Bilingual real-estate SaaS kit with tiered delivery, docs and white-label upgrade logic.",
          points: ["Starts at $239", "15 templates", "White-label tier"]
        }
      ]
    },
    metrics: [
      { label: "Core kits", value: "4" },
      { label: "Sections", value: "39+" },
      { label: "Launch time", value: "< 1 day" },
      { label: "Pro upsell", value: "$19/mo" }
    ],
    valueGrid: {
      badge: "System",
      title: "Designed around clarity, speed and structured shipping.",
      copy: "The best premium landing pages do not feel crowded. They feel inevitable.",
      cards: [
        {
          title: "Section-first architecture",
          description: "Compose product pages by swapping opinionated blocks instead of rebuilding launch surfaces from zero."
        },
        {
          title: "Monetization-first copy",
          description: "Every block has a commercial job: clarify the offer, reduce doubt and move buyers toward action."
        },
        {
          title: "Launch fast by default",
          description: "Lean components, restrained effects and performance-conscious styling keep the platform ready to ship."
        },
        {
          title: "VolynxOS tokens",
          description: "Type, spacing, containers and surfaces stay coherent across every kit, demo and product line."
        }
      ]
    },
    featureSplit: {
      badge: "Feature split",
      title: "Built as launch infrastructure you can actually scale.",
      copy: "The goal is not to impress with noise. The goal is to help each VolynxOS product line feel premium and launch faster.",
      points: [
        "Hero, social proof, pricing, FAQ, CTA and footer variants",
        "Design tokens for type, spacing, surfaces and containers",
        "Three launch-ready demo pages for SaaS, agency and portfolio",
        "Documentation and copywriting foundations included"
      ],
      stats: [
        {
          label: "Layouts",
          value: "12 core",
          copy: "Opinionated enough to feel premium, flexible enough to fit multiple categories."
        },
        {
          label: "Components",
          value: "24+",
          copy: "Drop-in sections with coherent visual hierarchy and copy structure."
        },
        {
          label: "Positioning",
          value: "Premium by restraint",
          copy: "Large type, precise spacing, controlled contrast and fewer competing elements create trust faster than ornamental complexity."
        }
      ]
    },
    workflow: {
      badge: "Workflow",
      title: "A repeatable launch process, not a gallery of disconnected pages.",
      copy: "Use VolynxOS the same way serious studios operate: pick the product line, attach the right blocks, then ship with documentation and speed.",
      items: [
        { step: "01", title: "Choose the product line", copy: "Portfolio, agency, SaaS or property." },
        { step: "02", title: "Attach the selling blocks", copy: "Hero, proof, pricing, FAQ and final CTA." },
        { step: "03", title: "Ship into revenue", copy: "Docs, tokens and product links keep execution clean." }
      ]
    },
    testimonials: {
      badge: "Proof",
      title: "Built for teams that sell clarity before decoration.",
      copy: "VolynxOS is shaped around the work that happens after the first pretty screen: reuse, positioning and faster delivery.",
      items: [
        {
          quote: "The sections gave our launch page enough structure to feel deliberate without slowing the team down.",
          name: "Mara Chen",
          role: "Founder, Northstar Labs"
        },
        {
          quote: "We used the agency demo as a base, swapped the content layer and shipped a client-ready first pass the same day.",
          name: "Eli Ramos",
          role: "Creative director, Forma Studio"
        },
        {
          quote: "It feels like launch infrastructure, not a template. That distinction matters when you sell premium work.",
          name: "Noah Patel",
          role: "Independent product builder"
        }
      ]
    },
    comparison: {
      badge: "Comparison",
      title: "VolynxOS beats a folder of attractive pages.",
      copy: "The platform is structured for repeatable launches, client delivery and product pages that keep their premium shape as the scope grows.",
      headers: {
        decisionPoint: "Decision point",
        templatePack: "Template pack",
        volynx: "VolynxOS"
      },
      rows: [
        {
          feature: "Page composition",
          templatePack: "Fixed pages that need manual rewiring.",
          volynx: "VolynxOS sections with reusable variants."
        },
        {
          feature: "Positioning",
          templatePack: "Generic copy and visual novelty.",
          volynx: "Commercial copy structure and restrained premium cues."
        },
        {
          feature: "Scaling",
          templatePack: "New product often means a new template.",
          volynx: "Shared tokens, demos and content data across product lines."
        },
        {
          feature: "Developer workflow",
          templatePack: "Pretty start, messy handoff.",
          volynx: "Next.js components, Tailwind utilities, docs and launch CTAs."
        }
      ]
    },
    pricing: {
      badge: "Pricing",
      title: "Price VolynxOS like launch infrastructure, not disposable templates.",
      copy: "Every tier points toward commercial use: premium perception, reusable architecture and product packaging that can start selling today.",
      tiers: [
        {
          name: "Kit Starter",
          price: "from $49",
          description: "For buyers who need one premium launch surface now.",
          features: ["Portfolio from $49", "Agency from $69", "SaaS from $79", "Commercial use"],
          href: storeUrl
        },
        {
          name: "Volynx Pro",
          price: "$19/mo",
          description: "For buyers who should get every kit, every tier and the full tool layer.",
          features: ["All 3 kits", "All tiers", "Image Suite Pro", "Daily unlimited"],
          highlight: true,
          href: "https://volynx.world/pricing/"
        },
        {
          name: "Studio / Scale",
          price: "from $209",
          description: "For studios and serious launches that need pages, modes and expansion assets.",
          features: ["Extra pages", "Dark/light mode", "Comparison pricing", "Premium expansion"],
          href: storeUrl
        }
      ],
      chooseLabel: "Choose",
      getLabel: "Get",
      bestValueLabel: "Best value",
      comparisonFeatureLabel: "Feature",
      upsellBadge: "Upsell central",
      compareProLabel: "Compare Pro",
      upsellTitle: "Volynx Pro at $19/mo",
      upsellBody: "All kits, all tiers and the full tool layer for buyers who should move from one-time intent into recurring value.",
      annualLabel: "Annual option"
    },
    faq: {
      badge: "FAQ",
      title: "The practical questions buyers ask before they convert.",
      copy: "Answering these clearly reduces friction, support load and trust gaps.",
      items: [
        {
          question: "Is this a UI kit or a template pack?",
          answer: "It is VolynxOS: reusable sections, structured variants, tokens and launch-ready product pages."
        },
        {
          question: "Can I use it for client work?",
          answer: "Yes. VolynxOS is built for commercial launches, your own products and client delivery."
        },
        {
          question: "How fast can I launch?",
          answer: "The demo pages are ready to edit. Many products can be adapted and shipped in a single day."
        }
      ]
    },
    finalCta: {
      eyebrow: "Launch today",
      title: "Stop polishing in private. Put VolynxOS in front of buyers.",
      subtitle: "The platform has the product lines, pricing logic, documentation and commercial CTAs it needs to start monetizing now.",
      primaryCta: "Open product store",
      secondaryCta: "Read docs"
    }
  },
  pt: {
    hero: {
      eyebrow: "VolynxOS, não peças soltas",
      brandCaption: "assinatura VX",
      title: "VolynxOS transforma kits premium em linhas de produto prontas para lançar.",
      subtitle:
        "Um sistema operacional comercial para produtos de portfólio, agência, SaaS e mercado imobiliário. Feito para parecer premium, explicar a oferta rápido e levar o comprador ao próximo passo hoje.",
      primaryCta: "Quero VolynxOS",
      secondaryCta: "Explorar kits"
    },
    launchOffer: {
      items: ["Ecossistema premium de kits", "Estrutura pronta para vender", "Lançável hoje"],
      ctaLabel: "Abrir loja de produtos"
    },
    productKits: {
      badge: "Kits",
      title: "Quatro linhas de produto prontas para vender no mesmo sistema operacional.",
      copy: "O VolynxOS organiza portfólio, agência, SaaS e property em uma plataforma comercial coerente, com casos de uso claros e caminhos diretos para compra.",
      openLabel: "Abrir kit",
      items: [
        {
          name: "Portfolio Pro Kit",
          label: "Kit flagship",
          href: "https://volynx.world/products/portfolio-pro-kit/",
          description: "Lance rápido, pareça premium e dê à sua marca pessoal um sistema operacional de verdade.",
          points: ["A partir de $49", "Você é o produto", "5 a 12+ seções"]
        },
        {
          name: "Agency Launch Kit",
          label: "Para agências",
          href: "https://volynx.world/products/agency-launch-kit/",
          description: "Proposta, SOW e estrutura premium de site pensadas para fechar com menos atrito.",
          points: ["A partir de $69", "Você vende o trabalho dos outros", "6 a 13+ seções"]
        },
        {
          name: "SaaS Landing System",
          label: "Para SaaS",
          href: "https://volynx.world/products/saas-landing-system/",
          description: "Orientado por seções, rápido e pronto para transformar valor de produto em convicção.",
          points: ["A partir de $79", "Você vende clareza de produto", "6 a 14+ seções"]
        },
        {
          name: "PropertyFlow",
          label: "SaaS imobiliário",
          href: propertyFlowUrl,
          description: "Kit SaaS imobiliário bilíngue com entrega por tiers, docs e lógica white-label.",
          points: ["A partir de $239", "15 templates", "Tier white-label"]
        }
      ]
    },
    metrics: [
      { label: "Kits centrais", value: "4" },
      { label: "Seções", value: "39+" },
      { label: "Tempo de launch", value: "< 1 dia" },
      { label: "Upsell Pro", value: "$19/mês" }
    ],
    valueGrid: {
      badge: "Sistema",
      title: "Desenhado para clareza, velocidade e entrega estruturada.",
      copy: "As melhores páginas premium não parecem lotadas. Elas parecem inevitáveis.",
      cards: [
        {
          title: "Arquitetura orientada por seções",
          description: "Monte páginas de produto trocando blocos opinados em vez de reconstruir superfícies de launch do zero."
        },
        {
          title: "Copy orientada à monetização",
          description: "Cada bloco tem um trabalho comercial: esclarecer a oferta, reduzir dúvida e empurrar o comprador para a ação."
        },
        {
          title: "Lançamento rápido por padrão",
          description: "Componentes enxutos, efeitos contidos e styling consciente de performance deixam a plataforma pronta para ir ao ar."
        },
        {
          title: "Tokens VolynxOS",
          description: "Tipografia, espaçamento, containers e superfícies permanecem coerentes em cada kit, demo e linha de produto."
        }
      ]
    },
    featureSplit: {
      badge: "Feature split",
      title: "Construído como infraestrutura de launch que realmente escala.",
      copy: "O objetivo não é impressionar com ruído. O objetivo é ajudar cada linha de produto do VolynxOS a parecer premium e lançar mais rápido.",
      points: [
        "Variações de hero, prova social, pricing, FAQ, CTA e footer",
        "Tokens de design para tipografia, espaçamento, superfícies e containers",
        "Três demos prontas para lançamento em SaaS, agência e portfólio",
        "Documentação e base de copywriting incluídas"
      ],
      stats: [
        {
          label: "Layouts",
          value: "12 centrais",
          copy: "Opiniados o suficiente para parecer premium e flexíveis o suficiente para várias categorias."
        },
        {
          label: "Componentes",
          value: "24+",
          copy: "Seções plug-and-play com hierarquia visual coerente e estrutura de copy consistente."
        },
        {
          label: "Posicionamento",
          value: "Premium por contenção",
          copy: "Tipografia grande, espaçamento preciso, contraste controlado e menos elementos concorrendo criam confiança mais rápido."
        }
      ]
    },
    workflow: {
      badge: "Workflow",
      title: "Um processo repetível de launch, não uma galeria de páginas desconectadas.",
      copy: "Use o VolynxOS como estúdios sérios operam: escolha a linha de produto, encaixe os blocos certos e publique com documentação e velocidade.",
      items: [
        { step: "01", title: "Escolha a linha de produto", copy: "Portfólio, agência, SaaS ou property." },
        { step: "02", title: "Anexe os blocos que vendem", copy: "Hero, prova, pricing, FAQ e CTA final." },
        { step: "03", title: "Publique em direção à receita", copy: "Docs, tokens e links de produto mantêm a execução limpa." }
      ]
    },
    testimonials: {
      badge: "Prova",
      title: "Feito para times que vendem clareza antes de decoração.",
      copy: "O VolynxOS é moldado em torno do que acontece depois da primeira tela bonita: reuso, posicionamento e entrega mais rápida.",
      items: [
        {
          quote: "As seções deram estrutura suficiente para a página de launch parecer deliberada sem desacelerar o time.",
          name: "Mara Chen",
          role: "Founder, Northstar Labs"
        },
        {
          quote: "Usamos a demo de agência como base, trocamos a camada de conteúdo e enviamos uma primeira versão pronta para cliente no mesmo dia.",
          name: "Eli Ramos",
          role: "Creative director, Forma Studio"
        },
        {
          quote: "Parece infraestrutura de launch, não template. Essa distinção importa quando você vende trabalho premium.",
          name: "Noah Patel",
          role: "Independent product builder"
        }
      ]
    },
    comparison: {
      badge: "Comparação",
      title: "VolynxOS supera uma pasta de páginas atraentes.",
      copy: "A plataforma foi estruturada para launches repetíveis, entrega para clientes e páginas de produto que mantêm forma premium à medida que o escopo cresce.",
      headers: {
        decisionPoint: "Ponto de decisão",
        templatePack: "Pacote de template",
        volynx: "VolynxOS"
      },
      rows: [
        {
          feature: "Composição de página",
          templatePack: "Páginas fixas que exigem rewire manual.",
          volynx: "Seções do VolynxOS com variantes reutilizáveis."
        },
        {
          feature: "Posicionamento",
          templatePack: "Copy genérica e novidade visual.",
          volynx: "Estrutura de copy comercial e sinais premium mais contidos."
        },
        {
          feature: "Escala",
          templatePack: "Novo produto quase sempre significa novo template.",
          volynx: "Tokens, demos e dados de conteúdo compartilhados entre linhas de produto."
        },
        {
          feature: "Workflow de dev",
          templatePack: "Começo bonito, handoff confuso.",
          volynx: "Componentes em Next.js, utilitários Tailwind, docs e CTAs de launch."
        }
      ]
    },
    pricing: {
      badge: "Pricing",
      title: "Precifique o VolynxOS como infraestrutura de launch, não como template descartável.",
      copy: "Cada tier aponta para uso comercial: percepção premium, arquitetura reutilizável e empacotamento de produto que pode começar a vender hoje.",
      tiers: [
        {
          name: "Kit Starter",
          price: "a partir de $49",
          description: "Para quem precisa de uma superfície premium de launch agora.",
          features: ["Portfolio a partir de $49", "Agency a partir de $69", "SaaS a partir de $79", "Uso comercial"],
          href: storeUrl
        },
        {
          name: "Volynx Pro",
          price: "$19/mês",
          description: "Para quem deve levar todos os kits, todos os tiers e toda a camada de ferramentas.",
          features: ["Todos os 3 kits", "Todos os tiers", "Image Suite Pro", "Daily ilimitado"],
          highlight: true,
          href: "https://volynx.world/pricing/"
        },
        {
          name: "Studio / Scale",
          price: "a partir de $209",
          description: "Para estúdios e launches sérios que precisam de páginas, modos e ativos de expansão.",
          features: ["Páginas extras", "Modo dark/light", "Pricing comparativo", "Expansão premium"],
          href: storeUrl
        }
      ],
      chooseLabel: "Escolher",
      getLabel: "Quero",
      bestValueLabel: "Melhor valor",
      comparisonFeatureLabel: "Recurso",
      upsellBadge: "Central de upsell",
      compareProLabel: "Comparar Pro",
      upsellTitle: "Volynx Pro por $19/mês",
      upsellBody: "Todos os kits, todos os tiers e toda a camada de ferramentas para quem deve sair da intenção pontual e entrar em valor recorrente.",
      annualLabel: "Opção anual"
    },
    faq: {
      badge: "FAQ",
      title: "As perguntas práticas que compradores fazem antes de converter.",
      copy: "Responder isso com clareza reduz atrito, carga de suporte e lacunas de confiança.",
      items: [
        {
          question: "Isso é um UI kit ou um pacote de templates?",
          answer: "É VolynxOS: seções reutilizáveis, variantes estruturadas, tokens e páginas de produto prontas para launch."
        },
        {
          question: "Posso usar em trabalho para clientes?",
          answer: "Sim. O VolynxOS foi construído para launches comerciais, seus próprios produtos e entrega para clientes."
        },
        {
          question: "Quão rápido eu consigo lançar?",
          answer: "As páginas demo já estão prontas para edição. Muitos produtos podem ser adaptados e publicados em um único dia."
        }
      ]
    },
    finalCta: {
      eyebrow: "Lance hoje",
      title: "Pare de polir em privado. Coloque o VolynxOS na frente dos compradores.",
      subtitle: "A plataforma já tem linhas de produto, lógica de pricing, documentação e CTAs comerciais para começar a monetizar agora.",
      primaryCta: "Abrir loja de produtos",
      secondaryCta: "Ler docs"
    }
  }
}

export function getHomeContent(locale: SiteLocale) {
  return homeContent[locale]
}
