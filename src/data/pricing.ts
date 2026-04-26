export type Locale = 'pt' | 'en';
export type Currency = 'GBP' | 'EUR' | 'BRL';

type MoneyMap = Record<Currency, string>;

type ToolTier = {
  id: string;
  label: Record<Locale, string>;
  tokens: string;
  price: MoneyMap;
  examples: Record<Locale, string[]>;
};

type Plan = {
  id: string;
  badge?: Record<Locale, string>;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  price: MoneyMap;
  billing: Record<Locale, string>;
  cta: Record<Locale, string>;
  featured?: boolean;
  features: Record<Locale, string[]>;
  image?: string;
};

type TokenPack = {
  id: string;
  amount: number;
  price: MoneyMap;
  badge?: Record<Locale, string>;
  description?: Record<Locale, string>;
};

type BuilderAddon = {
  id: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  price: MoneyMap;
  comingSoon?: boolean;
};

type PropertyFlowTier = {
  id: string;
  name: Record<Locale, string>;
  badge?: Record<Locale, string>;
  featured?: boolean;
  description: Record<Locale, string>;
  price: MoneyMap;
  billing: Record<Locale, string>;
  features: Record<Locale, string[]>;
  cta: Record<Locale, string>;
};

export const sitePricing = {
  currencies: {
    GBP: { symbol: '£', label: 'GBP' },
    EUR: { symbol: '€', label: 'EUR' },
    BRL: { symbol: 'R$', label: 'BRL' }
  },
  fxDisclaimer: {
    pt: 'Valores comerciais fixos para experiência estável em PT/EN. Não use conversão spot no front-end.',
    en: 'Commercial fixed prices for a stable PT/EN experience. Do not use spot FX conversion on the front-end.'
  },
  tokenUnitPrice: {
    GBP: 'from £0.44',
    EUR: 'from €0.51',
    BRL: 'from R$2.95'
  },
  tokenPacks: [
    {
      id: 'starter',
      amount: 12,
      price: { GBP: '£8.40', EUR: '€9.80', BRL: 'R$54' },
      badge: { pt: 'Starter', en: 'Starter' },
      description: {
        pt: 'Ideal para uso leve e ações pontuais.',
        en: 'Ideal for light usage and one-off premium actions.'
      }
    },
    {
      id: 'core',
      amount: 32,
      price: { GBP: '£18', EUR: '€21', BRL: 'R$119' },
      badge: { pt: 'Core · Mais popular', en: 'Core · Most popular' },
      description: {
        pt: 'O melhor equilíbrio entre valor e capacidade.',
        en: 'The best balance between value and premium capacity.'
      }
    },
    {
      id: 'pro',
      amount: 80,
      price: { GBP: '£42', EUR: '€49', BRL: 'R$279' },
      badge: { pt: 'Pro · Melhor custo', en: 'Pro · Best value' },
      description: {
        pt: 'Para usuários frequentes e fluxos mais exigentes.',
        en: 'For frequent users and more demanding workflows.'
      }
    },
    {
      id: 'scale',
      amount: 200,
      price: { GBP: '£88', EUR: '€102', BRL: 'R$589' },
      badge: { pt: 'Elite', en: 'Elite' },
      description: {
        pt: 'Capacidade máxima para uso intensivo e operações maiores.',
        en: 'Maximum capacity for heavy usage and larger operations.'
      }
    }
  ] satisfies TokenPack[],
  toolUsage: [
    {
      id: 'light',
      label: { pt: 'Classe A — ação leve', en: 'Class A — light action' },
      tokens: '1 token',
      price: { GBP: 'from £0.44', EUR: 'from €0.51', BRL: 'from R$2.95' },
      examples: {
        pt: ['converter 1 arquivo', 'resize simples', 'QR básico com download padrão'],
        en: ['convert 1 file', 'simple resize', 'basic QR with standard download']
      }
    },
    {
      id: 'medium',
      label: { pt: 'Classe B — ação média', en: 'Class B — medium action' },
      tokens: '2 tokens',
      price: { GBP: 'from £0.88', EUR: 'from €1.02', BRL: 'from R$5.90' },
      examples: {
        pt: ['upscale simples', 'QR com branding', 'lote pequeno'],
        en: ['simple upscale', 'branded QR', 'small batch']
      }
    },
    {
      id: 'pro',
      label: { pt: 'Classe C — ação pro', en: 'Class C — pro action' },
      tokens: '4 tokens',
      price: { GBP: 'from £1.76', EUR: 'from €2.04', BRL: 'from R$11.80' },
      examples: {
        pt: ['image suite completa', 'upscale melhor', 'lote médio'],
        en: ['full image suite', 'better upscale', 'mid-size batch']
      }
    },
    {
      id: 'batch',
      label: { pt: 'Classe D — batch / valor comercial', en: 'Class D — batch / commercial value' },
      tokens: '8 tokens',
      price: { GBP: 'from £3.52', EUR: 'from €4.08', BRL: 'from R$23.60' },
      examples: {
        pt: ['batch grande', 'export premium', 'ação com impacto comercial'],
        en: ['large batch', 'premium export', 'commercial-impact action']
      }
    },
    {
      id: 'premium',
      label: { pt: 'Classe E — premium / business action', en: 'Class E — premium / business action' },
      tokens: '12–20 tokens',
      price: { GBP: 'from £5.28–£8.80', EUR: 'from €6.12–€10.20', BRL: 'from R$35.40–R$59' },
      examples: {
        pt: ['HTML export', 'custom domain setup premium', 'template premium'],
        en: ['HTML export', 'premium custom domain setup', 'premium template']
      }
    }
  ] satisfies ToolTier[],
  builderPlans: [
    {
      id: 'free',
      image: '/assets/builderfree.webp',
      name: { pt: 'Builder Free', en: 'Builder Free' },
      description: {
        pt: 'Para testar o fluxo, montar drafts e começar sem fricção.',
        en: 'For testing the flow, creating drafts, and starting without friction.'
      },
      price: { GBP: '£0', EUR: '€0', BRL: 'R$0' },
      billing: { pt: 'sem custo', en: 'no cost' },
      cta: { pt: 'Começar grátis', en: 'Start free' },
      features: {
        pt: ['1 draft', 'editor completo', 'preview', 'branding Volynx visível'],
        en: ['1 draft', 'full editor', 'preview', 'visible Volynx branding']
      }
    },
    {
      id: 'launch',
      image: '/assets/builderlaunch.webp',
      name: { pt: 'Builder Launch', en: 'Builder Launch' },
      description: {
        pt: 'Para lançar páginas enxutas com velocidade e presença profissional.',
        en: 'For launching lean pages with speed and professional presence.'
      },
      price: { GBP: '£11', EUR: '€13', BRL: 'R$69' },
      billing: { pt: '/mês', en: '/month' },
      cta: { pt: 'Assinar Launch', en: 'Get Launch' },
      features: {
        pt: ['1 site publicado', 'subdomínio volynx.world', 'kits básicos', 'analytics básico', 'forms básicos'],
        en: ['1 published site', 'volynx.world subdomain', 'basic kits', 'basic analytics', 'basic forms']
      }
    },
    {
      id: 'pro',
      image: '/assets/builderpro.webp',
      badge: { pt: 'Mais popular', en: 'Most popular' },
      featured: true,
      name: { pt: 'Builder Pro', en: 'Builder Pro' },
      description: {
        pt: 'Para quem precisa publicar com domínio próprio, remover branding e operar com mais credibilidade.',
        en: 'For users who need custom domains, no branding, and more credibility in production.'
      },
      price: { GBP: '£24', EUR: '€28', BRL: 'R$149' },
      billing: { pt: '/mês', en: '/month' },
      cta: { pt: 'Ir de Pro', en: 'Go Pro' },
      features: {
        pt: ['até 3 sites publicados', 'custom domain', 'remove branding Volynx', 'kits premium selecionados', '1 bônus leve de icons por mês', 'prioridade de publish'],
        en: ['up to 3 published sites', 'custom domain', 'remove Volynx branding', 'selected premium kits', '1 light icons bonus per month', 'publish priority']
      }
    },
    {
      id: 'studio',
      image: '/assets/builderstudio.webp',
      name: { pt: 'Builder Studio', en: 'Builder Studio' },
      description: {
        pt: 'Para creators, freelancers e pequenos estúdios que publicam com frequência e precisam de kits completos.',
        en: 'For creators, freelancers, and small studios publishing frequently with full premium kits.'
      },
      price: { GBP: '£54', EUR: '€63', BRL: 'R$349' },
      billing: { pt: '/mês', en: '/month' },
      cta: { pt: 'Assinar Studio', en: 'Get Studio' },
      features: {
        pt: ['até 10 sites', 'múltiplos custom domains', 'kits premium completos', 'desconto em export package', 'analytics melhorados', 'icons perks maiores'],
        en: ['up to 10 sites', 'multiple custom domains', 'full premium kits', 'discount on export package', 'improved analytics', 'bigger icons perks']
      }
    },
    {
      id: 'teams',
      image: '/assets/builderteams.webp',
      name: { pt: 'Builder Teams', en: 'Builder Teams' },
      description: {
        pt: 'Para operações em equipe com billing central, ativos compartilhados e escala real.',
        en: 'For team operations with central billing, shared assets, and real scale.'
      },
      price: { GBP: '£118', EUR: '€138', BRL: 'R$749' },
      billing: { pt: '/mês', en: '/month' },
      cta: { pt: 'Falar com a Volynx', en: 'Talk to Volynx' },
      features: {
        pt: ['25 sites', 'workspace', 'billing central', 'shared assets', 'shared icons pool', 'suporte prioritário'],
        en: ['25 sites', 'workspace', 'central billing', 'shared assets', 'shared icons pool', 'priority support']
      }
    }
  ] satisfies Plan[],
  dailyPlans: [
    {
      id: 'daily_free',
      name: { pt: 'Daily Free', en: 'Daily Free' },
      description: { pt: 'As ferramentas essenciais para começar com limites diários e simplicidade local.', en: 'Essential tools to start with daily limits and local simplicity.' },
      price: { GBP: '£0', EUR: '€0', BRL: 'R$0' },
      billing: { pt: 'sem custo', en: 'no cost' },
      cta: { pt: 'Começar grátis', en: 'Start free' },
      features: {
        pt: ['6 ferramentas com limites diários', 'armazenamento local', 'processamento básico'],
        en: ['6 tools with daily limits', 'local storage', 'basic processing']
      }
    },
    {
      id: 'daily_pro',
      badge: { pt: 'Mais popular', en: 'Most popular' },
      featured: true,
      name: { pt: 'Daily Pro', en: 'Daily Pro' },
      description: { pt: 'Mais capacidade, sync na nuvem, exportação e processamento mais inteligente.', en: 'More capacity, cloud sync, exports, and smarter processing.' },
      price: { GBP: '£14', EUR: '€16', BRL: 'R$89' },
      billing: { pt: '/mês', en: '/month' },
      cta: { pt: 'Ir de Pro', en: 'Go Pro' },
      features: {
        pt: ['quotas 10x maiores', 'sync na nuvem entre dispositivos', 'exportação de dados', 'processamento avançado', 'histórico de uso'],
        en: ['10x higher quotas', 'cloud sync across devices', 'data export', 'smart processing', 'usage history']
      }
    },
    {
      id: 'daily_diamond',
      name: { pt: 'Daily Diamond', en: 'Daily Diamond' },
      description: { pt: 'Uso intensivo, analytics, acesso expandido e prioridade operacional.', en: 'Heavy usage, analytics, expanded access, and operational priority.' },
      price: { GBP: '£34', EUR: '€39', BRL: 'R$219' },
      billing: { pt: '/mês', en: '/month' },
      cta: { pt: 'Ir de Diamond', en: 'Go Diamond' },
      features: {
        pt: ['uso ilimitado', 'acesso API', 'compartilhamento em equipe', 'dashboard de analytics', 'processamento prioritário'],
        en: ['unlimited usage', 'API access', 'team sharing', 'analytics dashboard', 'priority processing']
      }
    }
  ] satisfies Plan[],
  bundles: [
    {
      id: 'bundle_essential',
      name: { pt: 'VOLYNX Essential', en: 'VOLYNX Essential' },
      includes: { pt: 'Builder Pro + Daily Pro', en: 'Builder Pro + Daily Pro' },
      description: { pt: 'Para criadores solo que constroem sites e dependem de ferramentas diárias.', en: 'For solo creators building sites and relying on daily tools.' },
      price: { GBP: '£35', EUR: '€41', BRL: 'R$229' },
      billing: { pt: '/mês', en: '/month' },
      savings: { pt: 'Economize vs. separado', en: 'Save vs. separate' },
      cta: { pt: 'Assinar Essential', en: 'Get Essential' }
    },
    {
      id: 'bundle_complete',
      badge: { pt: 'Melhor valor', en: 'Best value' },
      name: { pt: 'VOLYNX Complete', en: 'VOLYNX Complete' },
      includes: { pt: 'Builder Studio + Daily Diamond', en: 'Builder Studio + Daily Diamond' },
      description: { pt: 'Para power users, estúdios e operações que precisam do melhor conjunto completo.', en: 'For power users, studios, and operations that need the strongest complete setup.' },
      price: { GBP: '£82', EUR: '€96', BRL: 'R$549' },
      billing: { pt: '/mês', en: '/month' },
      savings: { pt: 'Economize 13% vs. separado', en: 'Save 13% vs. separate' },
      cta: { pt: 'Assinar Complete', en: 'Get Complete' }
    }
  ],
  builderAddons: [
    {
      id: 'domain-setup',
      name: { pt: 'Configuração assistida de domínio', en: 'Assisted domain setup' },
      description: { pt: 'Ativação rápida do domínio com menos fricção.', en: 'Faster domain activation with less friction.' },
      price: { GBP: '£15', EUR: '€17', BRL: 'R$99' }
    },
    {
      id: 'template-pack',
      name: { pt: 'Template / kit premium', en: 'Premium template / kit' },
      description: { pt: 'Kits prontos para páginas premium de conversão.', en: 'Ready-made kits for premium conversion pages.' },
      price: { GBP: '£28', EUR: '€32', BRL: 'R$179' },
      comingSoon: true
    },
    {
      id: 'html-export',
      name: { pt: 'HTML export', en: 'HTML export' },
      description: { pt: 'Pacote exportável para uso fora da plataforma.', en: 'Exportable package for use outside the platform.' },
      price: { GBP: '£44', EUR: '€51', BRL: 'R$299' },
      comingSoon: true
    },
    {
      id: 'extra-slot',
      name: { pt: 'Site slot extra', en: 'Extra site slot' },
      description: { pt: 'Mais capacidade sem troca imediata de plano.', en: 'More capacity without an immediate plan upgrade.' },
      price: { GBP: '£7/mo', EUR: '€8/mo', BRL: 'R$49/mês' },
      comingSoon: true
    },
    {
      id: 'bilingual',
      name: { pt: 'Bilingual pack', en: 'Bilingual pack' },
      description: { pt: 'Suporte a versão em dois idiomas no publish.', en: 'Two-language support in published projects.' },
      price: { GBP: '£19', EUR: '€22', BRL: 'R$129' },
      comingSoon: true
    },
    {
      id: 'icons-addon',
      name: { pt: 'Icon collection pack', en: 'Icon collection pack' },
      description: { pt: 'Coleções premium permanentes para usar nos seus projetos.', en: 'Permanent premium collections for your own projects.' },
      price: { GBP: '£18', EUR: '€21', BRL: 'R$119' },
      comingSoon: true
    }
  ] satisfies BuilderAddon[],
  propertyFlow: [
    {
      id: 'pf_starter',
      name: { pt: 'PropertyFlow Starter', en: 'PropertyFlow Starter' },
      description: { pt: '3 grids, código-fonte React, catálogo + filtros, bilíngue, design responsivo.', en: '3 grids, full React source, catalogue + filters, bilingual, responsive design.' },
      price: { GBP: '£187', EUR: '€219', BRL: 'R$1.290' },
      billing: { pt: 'pagamento único', en: 'one-time' },
      cta: { pt: 'Comprar Starter', en: 'Get Starter' },
      features: {
        pt: ['3 templates de grid', 'código-fonte React completo', 'catálogo + filtros', 'interface bilíngue (EN/PT)', 'modo de dados estático'],
        en: ['3 grid templates', 'full React source code', 'property catalogue + filters', 'bilingual interface (EN/PT)', 'static data mode']
      }
    },
    {
      id: 'pf_professional',
      badge: { pt: 'Mais popular', en: 'Most popular' },
      featured: true,
      name: { pt: 'PropertyFlow Professional', en: 'PropertyFlow Professional' },
      description: { pt: 'Tudo do Starter, mais 6 templates, integração Supabase, painel admin, captura de leads.', en: 'Everything in Starter, plus 6 templates, Supabase backend, admin dashboard, lead capture.' },
      price: { GBP: '£447', EUR: '€519', BRL: 'R$3.090' },
      billing: { pt: 'pagamento único', en: 'one-time' },
      cta: { pt: 'Comprar Professional', en: 'Get Professional' },
      features: {
        pt: ['6 templates de grid', 'tudo do Starter', 'integração com Supabase', 'painel admin', 'galeria + modais', 'captura de leads', 'guia de deploy'],
        en: ['6 grid templates', 'everything in Starter', 'Supabase backend integration', 'admin dashboard', 'image gallery + modals', 'enquiry capture system', 'deployment guide']
      }
    },
    {
      id: 'pf_white_label',
      name: { pt: 'PropertyFlow White-Label', en: 'PropertyFlow White-Label' },
      description: { pt: '15 templates, branding kit, onboarding prioritário, migração de dados, canal dedicado.', en: '15 templates, branding starter kit, priority onboarding, data migration, dedicated support.' },
      price: { GBP: '£897', EUR: '€1.039', BRL: 'R$6.190' },
      billing: { pt: 'pagamento único', en: 'one-time' },
      cta: { pt: 'Comprar White-Label', en: 'Get White-Label' },
      features: {
        pt: ['15 templates de grid', 'tudo do Professional', 'kit de branding customizado', 'onboarding prioritário', 'suporte de migração de dados', 'canal de suporte dedicado'],
        en: ['15 grid templates', 'everything in Professional', 'custom branding starter kit', 'priority onboarding', 'data migration support', 'dedicated support channel']
      }
    }
  ] satisfies PropertyFlowTier[],
  labels: {
    pricingTitle: {
      pt: 'Preços globais, com lógica premium e monetização real.',
      en: 'Global pricing with premium logic and real monetization.'
    },
    pricingSubtitle: {
      pt: 'Estrutura pensada para PT/EN, com GBP, EUR e BRL fixos.',
      en: 'Structure designed for PT/EN, with fixed GBP, EUR and BRL prices.'
    },
    builderTitle: {
      pt: 'Builder premium para lançar e vender hoje.',
      en: 'Premium builder to launch and monetize today.'
    },
    builderSubtitle: {
      pt: 'Mais rápido que um builder genérico. Mais premium que uma solução barata.',
      en: 'Faster than a generic builder. More premium than a cheap solution.'
    }
  }
};

export const getPrice = (value: Record<Currency, string>, currency: Currency) => value[currency];
