import { ROUTES } from "./routes";

/**
 * VOLYNX kit previews — public buyer-facing copy.
 *
 * Every text field is bilingual (en / pt-BR). The previous shape (string-only)
 * was meta-internal copy ("revenue-safe preview", "Public visitors can
 * understand"...) — that confused buyers who arrived expecting to see what
 * they were paying for. The new shape lists concrete deliverables, ideal
 * buyer profile, and outcomes.
 */

export type LangPair = { en: string; pt: string };

export type PreviewMetric = {
  value: string;        // numeric/literal — typically not translated
  label: LangPair;
};

export type PreviewCard = {
  title: LangPair;
  copy: LangPair;
};

export type PreviewFaq = {
  question: LangPair;
  answer: LangPair;
};

export type KitPreview = {
  id: "portfolio" | "agency" | "saas";
  name: string;        // brand product name — kept untranslated
  kicker: LangPair;
  title: LangPair;
  summary: LangPair;
  art: string;
  route: string;
  productRoute: string;
  docsAnchor: string;
  metrics: PreviewMetric[];
  proofCards: PreviewCard[];
  /** Concrete deliverables the buyer receives — replaces old `docsPreview`. */
  whatYouGet: LangPair[];
  /** Buyer profile / ideal use cases — replaces old `deliveryPreview`. */
  whoItsFor: LangPair[];
  steps: PreviewCard[];
  faq: PreviewFaq[];
};

export const kitPreviews: KitPreview[] = [
  {
    id: "portfolio",
    name: "Portfolio Pro Kit",
    kicker: {
      en: "Portfolio kit",
      pt: "Kit de portfolio",
    },
    title: {
      en: "Make your portfolio look like you charge by the project, not the hour.",
      pt: "Deixe seu portfolio com cara de quem cobra por projeto, não por hora.",
    },
    summary: {
      en: "Hero, projects, experience, skills and a clear hire-me CTA — all sections pre-built, mobile-first and ready to publish to your VOLYNX subdomain.",
      pt: "Hero, projetos, experiência, skills e um CTA claro de contratação — todas as seções prontas, mobile-first e prontas para publicar no seu subdomínio VOLYNX.",
    },
    art: "/assets/newportfolio.webp",
    route: ROUTES.portfolioKitPreview,
    productRoute: ROUTES.portfolioKit,
    docsAnchor: "portfolio-kit",
    metrics: [
      { value: "9", label: { en: "Sections", pt: "Seções" } },
      { value: "3", label: { en: "Tiers", pt: "Tiers" } },
      { value: "100%", label: { en: "Responsive", pt: "Responsivo" } },
      { value: "SEO", label: { en: "Ready", pt: "Otimizado" } },
    ],
    proofCards: [
      {
        title: {
          en: "Premium first impression",
          pt: "Primeira impressão premium",
        },
        copy: {
          en: "Typography, spacing and motion calibrated so your portfolio reads as established work — even on day one.",
          pt: "Tipografia, espaçamento e motion calibrados para seu portfolio parecer trabalho consolidado — desde o dia um.",
        },
      },
      {
        title: {
          en: "Case-study rhythm",
          pt: "Ritmo de case study",
        },
        copy: {
          en: "Each project block has a built-in narrative arc: context → role → outcome. No more dumping screenshots and hoping for the best.",
          pt: "Cada bloco de projeto tem um arco narrativo: contexto → papel → resultado. Sem mais despejar screenshots e torcer.",
        },
      },
      {
        title: {
          en: "Hire-me CTA that converts",
          pt: "CTA de contratação que converte",
        },
        copy: {
          en: "Contact section is wired with availability badges, response-time copy and clear next-step buttons — not a generic 'send a message' form.",
          pt: "Seção de contato com badges de disponibilidade, copy de tempo de resposta e CTAs claros — não um formulário genérico de 'envie uma mensagem'.",
        },
      },
    ],
    whatYouGet: [
      {
        en: "9 polished sections — hero, about, projects grid, experience timeline, skills, testimonials, CTA, contact, footer.",
        pt: "9 seções polidas — hero, sobre, grid de projetos, timeline de experiência, skills, depoimentos, CTA, contato, footer.",
      },
      {
        en: "Loaded into Builder after purchase — ready to customise without a complicated setup.",
        pt: "Carregado no Builder após a compra — pronto para personalizar sem uma configuração complicada.",
      },
      {
        en: "Edit content inline — name, bio, projects, skills — without touching code.",
        pt: "Edite o conteúdo inline — nome, bio, projetos, skills — sem mexer no código.",
      },
      {
        en: "Swap colors, fonts and brand tokens through the Builder UI.",
        pt: "Troque cores, fontes e tokens de marca pela interface do Builder.",
      },
      {
        en: "Publish to your-name.volynx.world or upgrade to a custom domain on Pro+ plans.",
        pt: "Publique em seu-nome.volynx.world ou suba para domínio próprio nos planos Pro+.",
      },
    ],
    whoItsFor: [
      {
        en: "Developers presenting freelance work to higher-budget clients.",
        pt: "Desenvolvedores apresentando trabalho freelancer para clientes de orçamento maior.",
      },
      {
        en: "Designers who want their portfolio to match the quality of their case studies.",
        pt: "Designers que querem o portfolio na mesma qualidade dos seus case studies.",
      },
      {
        en: "Anyone replacing a Notion / Webflow / generic template that 'looks like everyone else'.",
        pt: "Quem está substituindo um Notion / Webflow / template genérico que 'parece igual a todo mundo'.",
      },
    ],
    steps: [
      {
        title: {
          en: "1. Choose a plan",
          pt: "1. Escolha um plano",
        },
        copy: {
          en: "Starter for personal use, Pro for client-facing freelance work, Studio for full case-study + dark/light mode coverage.",
          pt: "Starter para uso pessoal, Pro para trabalho freelancer com cliente, Studio com case-study completo + dark/light mode.",
        },
      },
      {
        title: {
          en: "2. Open in Builder",
          pt: "2. Abra no Builder",
        },
        copy: {
          en: "The kit shows up as a draft project. Every section is editable — replace placeholder text with your own.",
          pt: "O kit aparece como projeto draft. Cada seção é editável — substitua o texto placeholder pelo seu.",
        },
      },
      {
        title: {
          en: "3. Publish in one click",
          pt: "3. Publique em um clique",
        },
        copy: {
          en: "Hit publish and your portfolio is live at your-name.volynx.world. Add a custom domain anytime.",
          pt: "Clique em publicar e seu portfolio fica no ar em seu-nome.volynx.world. Adicione domínio próprio quando quiser.",
        },
      },
    ],
    faq: [
      {
        question: {
          en: "Can I use this for paid client work?",
          pt: "Posso usar para trabalho freelancer pago?",
        },
        answer: {
          en: "Yes on Pro and Studio plans. Starter is for personal use only — see the licence details on the product page.",
          pt: "Sim nos planos Pro e Studio. O Starter é apenas para uso pessoal — veja os detalhes da licença na página do produto.",
        },
      },
      {
        question: {
          en: "How customizable is it?",
          pt: "Quanto dá para customizar?",
        },
        answer: {
          en: "Every section, color, font and copy block is editable through the Builder UI. You can also swap layouts per section — no code required.",
          pt: "Cada seção, cor, fonte e bloco de copy é editável pela interface do Builder. Dá pra trocar layouts por seção também — sem precisar de código.",
        },
      },
      {
        question: {
          en: "What if I already have content somewhere else?",
          pt: "E se eu já tenho conteúdo em outro lugar?",
        },
        answer: {
          en: "Paste it in. The kit is content-shaped, not content-locked — your existing copy, projects and bio drop right into the editor fields.",
          pt: "Cole aqui. O kit tem forma de conteúdo, não está travado em conteúdo — seu copy, projetos e bio existentes entram direto nos campos do editor.",
        },
      },
    ],
  },
  {
    id: "agency",
    name: "Agency Launch Kit",
    kicker: {
      en: "Agency kit",
      pt: "Kit de agência",
    },
    title: {
      en: "The agency site + closing system that takes 30 minutes to launch.",
      pt: "O site de agência + sistema de fechamento que sobe em 30 minutos.",
    },
    summary: {
      en: "Site, proposal template, SOW with anti-scope-creep rules, onboarding checklist and base email templates — built to close clients faster and reduce the back-and-forth that kills margins.",
      pt: "Site, template de proposta, SOW com regras anti-scope-creep, checklist de onboarding e templates base de e-mail — feito pra fechar cliente mais rápido e reduzir vai-e-volta que mata margem.",
    },
    art: "/assets/newlaunch.webp",
    route: ROUTES.agencyKitPreview,
    productRoute: ROUTES.agencyKit,
    docsAnchor: "agency-kit",
    metrics: [
      { value: "13", label: { en: "Sections", pt: "Seções" } },
      { value: "3", label: { en: "Templates", pt: "Templates" } },
      { value: "1", label: { en: "Onboarding", pt: "Onboarding" } },
      { value: "Pro", label: { en: "Positioning", pt: "Posicionamento" } },
    ],
    proofCards: [
      {
        title: {
          en: "Positioning that closes",
          pt: "Posicionamento que fecha",
        },
        copy: {
          en: "Clear offer framing, services list and outcome-first headers. No walls of bullet points — every block is written to move the prospect to a yes.",
          pt: "Framing de oferta claro, lista de serviços e headers focados em resultado. Sem paredes de bullet points — cada bloco é escrito pra levar o prospect ao sim.",
        },
      },
      {
        title: {
          en: "Anti-scope-creep SOW",
          pt: "SOW anti-scope-creep",
        },
        copy: {
          en: "Scope, out-of-scope, revision rules and acceptance criteria all pre-written. Stop redoing scope conversations on every project.",
          pt: "Escopo, fora-de-escopo, regras de revisão e critérios de aceite já escritos. Pare de refazer conversa de escopo em cada projeto.",
        },
      },
      {
        title: {
          en: "Onboarding that doesn't leak",
          pt: "Onboarding que não vaza",
        },
        copy: {
          en: "Checklist + base emails for the first week with the client. Nothing falls through cracks while you're heads-down on delivery.",
          pt: "Checklist + e-mails base para a primeira semana com o cliente. Nada escapa enquanto você está focado em entrega.",
        },
      },
    ],
    whatYouGet: [
      {
        en: "13 polished agency-site sections — services, process, packages, case studies, testimonials, FAQ, contact.",
        pt: "13 seções polidas de site de agência — serviços, processo, pacotes, case studies, depoimentos, FAQ, contato.",
      },
      {
        en: "Copy-paste-ready proposal template (Markdown + Notion + PDF formats).",
        pt: "Template de proposta pronto pra copy-paste (Markdown + Notion + PDF).",
      },
      {
        en: "SOW template with scope, out-of-scope, revisions and acceptance criteria pre-written.",
        pt: "Template de SOW com escopo, fora-de-escopo, revisões e critérios de aceite pré-escritos.",
      },
      {
        en: "Onboarding checklist + 5 base email templates (kickoff, weekly update, blocker, handoff, wrap-up).",
        pt: "Checklist de onboarding + 5 templates base de e-mail (kickoff, update semanal, blocker, handoff, wrap-up).",
      },
      {
        en: "Loaded into Builder after purchase — your site can be live the same day.",
        pt: "Carregado no Builder após a compra — seu site pode estar no ar no mesmo dia.",
      },
    ],
    whoItsFor: [
      {
        en: "Indie agencies and freelance studios that want to look established without 3 months of brand work.",
        pt: "Agências indie e estúdios freelancer que querem parecer consolidados sem 3 meses de branding.",
      },
      {
        en: "Consultants who lose deals to scope conversations and want a closing system that does the heavy lifting.",
        pt: "Consultores que perdem deals em conversa de escopo e querem um sistema de fechamento que faz o trabalho pesado.",
      },
      {
        en: "Solo founders who want proposals, onboarding and client materials ready before the next pitch.",
        pt: "Profissionais solo que precisam dos 'docs chatos' (proposta, SOW, onboarding) prontos antes de ofertar o próximo cliente.",
      },
    ],
    steps: [
      {
        title: {
          en: "1. Pick the plan that fits",
          pt: "1. Escolha o plano certo",
        },
        copy: {
          en: "Starter for solo freelancers, Pro for client-delivery agencies, Studio for full case-study + proposal templates.",
          pt: "Starter para freelancer solo, Pro para agências que entregam pra cliente, Studio com case-study completo + templates de proposta.",
        },
      },
      {
        title: {
          en: "2. Edit positioning + services",
          pt: "2. Edite posicionamento + serviços",
        },
        copy: {
          en: "Replace the demo copy with your offer. Service blocks, packages and process steps drop into pre-built fields.",
          pt: "Substitua a copy de demo pela sua oferta. Blocos de serviço, pacotes e passos do processo entram em campos pré-construídos.",
        },
      },
      {
        title: {
          en: "3. Publish + send your first proposal",
          pt: "3. Publique + envie sua primeira proposta",
        },
        copy: {
          en: "Site live, proposal template ready, SOW pre-written. The pitch-to-close loop is faster from day one.",
          pt: "Site no ar, template de proposta pronto, SOW pré-escrito. O loop de pitch-to-close fica mais rápido desde o primeiro dia.",
        },
      },
    ],
    faq: [
      {
        question: {
          en: "Can I use this for client delivery work?",
          pt: "Posso usar para trabalho de entrega ao cliente?",
        },
        answer: {
          en: "Yes on Pro and Studio plans. Starter is for use by your own agency. Studio also includes the right to deliver client sites built with the kit.",
          pt: "Sim nos planos Pro e Studio. O Starter é para uso da sua própria agência. O Studio também inclui o direito de entregar sites de clientes construídos com o kit.",
        },
      },
      {
        question: {
          en: "Are the proposal and SOW templates legally binding?",
          pt: "Os templates de proposta e SOW têm validade jurídica?",
        },
        answer: {
          en: "They're clarity templates (scope / acceptance / revisions) — not legal contracts. For binding terms, run them past a lawyer in your jurisdiction.",
          pt: "São templates de clareza (escopo / aceite / revisões) — não contratos jurídicos. Para termos vinculantes, valide com um advogado da sua jurisdição.",
        },
      },
      {
        question: {
          en: "How niche-specific is the copy?",
          pt: "Quão específica de nicho é a copy?",
        },
        answer: {
          en: "Written generic enough for any service-business agency. You'll want to swap industry-specific words (your verticals, your stack) — that takes minutes, not hours.",
          pt: "Escrita genérica o suficiente para qualquer agência de serviços. Você vai querer trocar palavras específicas do nicho (verticais, stack) — leva minutos, não horas.",
        },
      },
    ],
  },
  {
    id: "saas",
    name: "SaaS Landing System",
    kicker: {
      en: "SaaS kit",
      pt: "Kit SaaS",
    },
    title: {
      en: "A landing page that sells your product, not its feature list.",
      pt: "Uma landing page que vende seu produto, não a lista de features.",
    },
    summary: {
      en: "Conversion-focused sections, a clear three-plan pricing area, FAQ, social proof and a copy framework you can fill in instead of writing from scratch — built for SaaS launches that need to convert visitors fast.",
      pt: "Seções focadas em conversão, uma área de preços com três planos, FAQ, prova social e um framework de copy para preencher em vez de escrever do zero — feito para lançamentos SaaS que precisam converter rápido.",
    },
    art: "/assets/saasbig.webp",
    route: ROUTES.saasSystemPreview,
    productRoute: ROUTES.saasSystem,
    docsAnchor: "saas-system",
    metrics: [
      { value: "12", label: { en: "Sections", pt: "Seções" } },
      { value: "3", label: { en: "Pricing plans", pt: "Planos de preço" } },
      { value: "Fast", label: { en: "Lighthouse", pt: "Lighthouse" } },
      { value: "SEO", label: { en: "Ready", pt: "Pronto" } },
    ],
    proofCards: [
      {
        title: {
          en: "Section-first storytelling",
          pt: "Storytelling section-first",
        },
        copy: {
          en: "Hero → proof → problem → product → pricing → FAQ → CTA. Every block does one job. No wall-of-features pages that confuse buyers.",
          pt: "Hero → prova → problema → produto → pricing → FAQ → CTA. Cada bloco faz uma coisa. Sem página-parede-de-features que confunde comprador.",
        },
      },
      {
        title: {
          en: "Pricing logic that doesn't shoot you in the foot",
          pt: "Lógica de pricing que não atira no próprio pé",
        },
        copy: {
        en: "Three-plan pricing with clear comparisons, a recommended option and a monthly/annual toggle — designed to make the right choice easier.",
        pt: "Preços em três planos, comparações claras, uma opção recomendada e toggle mensal/anual — pensado para facilitar a escolha.",
        },
      },
      {
        title: {
          en: "Speed and SEO baked in",
          pt: "Velocidade e SEO embutidos",
        },
        copy: {
          en: "Fast Lighthouse scores, meta tags, OG cards, structured headings — the boring SEO basics done so you can focus on the offer.",
          pt: "Scores de Lighthouse altos, meta tags, OG cards, hierarquia de headings — o básico chato de SEO já feito pra você focar na oferta.",
        },
      },
    ],
    whatYouGet: [
      {
        en: "12 conversion-focused sections — hero, social proof, problem, features, pricing, testimonials, FAQ, CTA, footer (and more on the Studio plan).",
        pt: "12 seções focadas em conversão — hero, prova social, problema, features, preços, depoimentos, FAQ, CTA, footer (e mais no plano Studio).",
      },
      {
        en: "Copy framework — fill-in-the-blanks for benefits, objections and proof, written to convert without sounding generic.",
        pt: "Framework de copy — preencher-os-vazios pra benefícios, objeções e prova, escrito pra converter sem soar genérico.",
      },
      {
        en: "Three-plan pricing component with a recommended option and monthly/annual toggle.",
        pt: "Componente de preços em três planos, com opção recomendada e toggle mensal/anual.",
      },
      {
        en: "FAQ section pre-loaded with the 5 questions every SaaS prospect asks before paying.",
        pt: "Seção de FAQ pré-carregada com as 5 perguntas que todo prospect SaaS faz antes de pagar.",
      },
      {
        en: "Loaded into Builder after purchase. Edit the copy and colours, publish, and your landing page is live.",
        pt: "Carregado no Builder após a compra. Edite o texto e as cores, publique e coloque sua landing page no ar.",
      },
    ],
    whoItsFor: [
      {
        en: "Solo founders launching a SaaS who don't want to spend 3 weeks on a landing page.",
        pt: "Founders solo lançando um SaaS que não querem gastar 3 semanas em uma landing page.",
      },
      {
        en: "Indie hackers tired of cookie-cutter Webflow templates that look like every other launch.",
        pt: "Indie hackers cansados de templates Webflow genéricos que parecem todo mundo.",
      },
      {
        en: "Product teams that want a launch-grade page now and time to iterate copy after, not before.",
        pt: "Times de produto que querem uma página de lançamento agora e tempo pra iterar copy depois, não antes.",
      },
    ],
    steps: [
      {
        title: {
          en: "1. Choose the plan you need",
          pt: "1. Escolha o plano de que precisa",
        },
        copy: {
          en: "Launch for lean MVPs, Growth for SaaS with traction, Scale for full SaaS with case studies and dark/light mode.",
          pt: "Launch para MVP enxuto, Growth para SaaS com tração, Scale para SaaS completo com case studies e dark/light mode.",
        },
      },
      {
        title: {
          en: "2. Drop your copy into the framework",
          pt: "2. Coloque sua copy no framework",
        },
        copy: {
        en: "Hero headline, problem statement, three features, pricing plans and FAQ — every field has starter copy you can replace.",
        pt: "Headline do hero, problema, três features, planos de preço e FAQ — cada campo tem um texto inicial que você pode substituir.",
        },
      },
      {
        title: {
          en: "3. Publish + start driving traffic",
          pt: "3. Publique + comece a trazer tráfego",
        },
        copy: {
          en: "Live at your-saas.volynx.world. Custom domain on Pro+. Iterate copy and pricing as you learn — no redeploy needed.",
          pt: "No ar em seu-saas.volynx.world. Domínio próprio nos planos Pro+. Itere copy e pricing conforme aprende — sem precisar fazer redeploy.",
        },
      },
    ],
    faq: [
      {
        question: {
          en: "Will this convert without paid traffic?",
          pt: "Isso converte sem tráfego pago?",
        },
        answer: {
          en: "Conversion is offer × audience × clarity — the kit nails clarity. Offer and audience are still your job. With the right traffic, the page will outperform a DIY landing built in a weekend.",
          pt: "Conversão é oferta × audiência × clareza — o kit mata a clareza. Oferta e audiência continuam sendo seu trabalho. Com o tráfego certo, a página supera uma landing DIY feita num final de semana.",
        },
      },
      {
        question: {
          en: "Can I publish on Cloudflare Pages or Vercel?",
          pt: "Posso publicar em Cloudflare Pages ou Vercel?",
        },
        answer: {
        en: "Yes. Publish in Builder to the volynx.world subdomain, or export the static HTML and host it anywhere on Pro+ plans.",
        pt: "Sim. Publique no Builder para o subdomínio volynx.world ou exporte o HTML estático e hospede onde quiser nos planos Pro+.",
        },
      },
      {
        question: {
          en: "Can I change colors, fonts and brand tokens?",
          pt: "Posso mudar cores, fontes e tokens de marca?",
        },
        answer: {
          en: "Yes — every brand token is editable through the Builder UI. No CSS knowledge required. The whole site updates instantly.",
          pt: "Sim — todo token de marca é editável pela interface do Builder. Sem precisar saber CSS. O site inteiro atualiza instantaneamente.",
        },
      },
    ],
  },
];

export const kitPreviewById = {
  portfolio: kitPreviews[0],
  agency: kitPreviews[1],
  saas: kitPreviews[2],
} as const;
