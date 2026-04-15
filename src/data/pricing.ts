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
};

type BuilderAddon = {
  id: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  price: MoneyMap;
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
    GBP: '£0.99',
    EUR: '€1.19',
    BRL: 'R$6.90'
  },
  tokenPacks: [
    {
      id: 'starter',
      amount: 10,
      price: { GBP: '£9.90', EUR: '€11.90', BRL: 'R$69' },
      badge: { pt: 'Entrada', en: 'Entry' }
    },
    {
      id: 'core',
      amount: 25,
      price: { GBP: '£22.90', EUR: '€27.90', BRL: 'R$159' },
      badge: { pt: 'Mais popular', en: 'Most popular' }
    },
    {
      id: 'pro',
      amount: 60,
      price: { GBP: '£49.90', EUR: '€59.90', BRL: 'R$349' },
      badge: { pt: 'Melhor custo', en: 'Best value' }
    },
    {
      id: 'scale',
      amount: 150,
      price: { GBP: '£109', EUR: '€129', BRL: 'R$749' },
      badge: { pt: 'Heavy use', en: 'Heavy use' }
    }
  ] satisfies TokenPack[],
  toolUsage: [
    {
      id: 'light',
      label: { pt: 'Classe A — ação leve', en: 'Class A — light action' },
      tokens: '1 token',
      price: { GBP: '£0.99', EUR: '€1.19', BRL: 'R$6.90' },
      examples: {
        pt: ['converter 1 arquivo', 'resize simples', 'QR básico com download padrão'],
        en: ['convert 1 file', 'simple resize', 'basic QR with standard download']
      }
    },
    {
      id: 'medium',
      label: { pt: 'Classe B — ação média', en: 'Class B — medium action' },
      tokens: '2 tokens',
      price: { GBP: '£1.98', EUR: '€2.38', BRL: 'R$13.80' },
      examples: {
        pt: ['upscale simples', 'QR com branding', 'lote pequeno'],
        en: ['simple upscale', 'branded QR', 'small batch']
      }
    },
    {
      id: 'pro',
      label: { pt: 'Classe C — ação pro', en: 'Class C — pro action' },
      tokens: '4 tokens',
      price: { GBP: '£3.96', EUR: '€4.76', BRL: 'R$27.60' },
      examples: {
        pt: ['image suite completa', 'upscale melhor', 'lote médio'],
        en: ['full image suite', 'better upscale', 'mid-size batch']
      }
    },
    {
      id: 'batch',
      label: { pt: 'Classe D — batch / valor comercial', en: 'Class D — batch / commercial value' },
      tokens: '8 tokens',
      price: { GBP: '£7.92', EUR: '€9.52', BRL: 'R$55.20' },
      examples: {
        pt: ['batch grande', 'export premium', 'ação com impacto comercial'],
        en: ['large batch', 'premium export', 'commercial-impact action']
      }
    },
    {
      id: 'premium',
      label: { pt: 'Classe E — premium / business action', en: 'Class E — premium / business action' },
      tokens: '12–20 tokens',
      price: { GBP: '£11.88–£19.80', EUR: '€14.28–€23.80', BRL: 'R$82.80–R$138' },
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
        pt: 'Para testar o fluxo, criar rascunhos e sentir a experiência Volynx.',
        en: 'For testing the flow, creating drafts, and experiencing Volynx.'
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
        pt: 'Plano de entrada para lançar páginas enxutas com velocidade.',
        en: 'Entry plan to launch lean pages quickly.'
      },
      price: { GBP: '£9', EUR: '€10.90', BRL: 'R$59' },
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
        pt: 'O melhor equilíbrio entre publish, domínio próprio e visual premium.',
        en: 'Best balance of publish, custom domain, and premium presentation.'
      },
      price: { GBP: '£19', EUR: '€22.90', BRL: 'R$129' },
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
        pt: 'Para creators, freelancers e estúdios pequenos que publicam com frequência.',
        en: 'For creators, freelancers, and small studios publishing frequently.'
      },
      price: { GBP: '£39', EUR: '€45.90', BRL: 'R$249' },
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
        pt: 'Workspace para operação em equipe com billing central e shared assets.',
        en: 'Workspace for team operations with central billing and shared assets.'
      },
      price: { GBP: '£79', EUR: '€89.90', BRL: 'R$499' },
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
      image: '/assets/daily-icon.webp',
      name: { pt: 'Daily Free', en: 'Daily Free' },
      description: { pt: 'Todas as 6 ferramentas com limites diários. Armazenamento local.', en: 'All 6 tools with daily limits. Local storage.' },
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
      image: '/assets/daily-icon.webp',
      badge: { pt: 'Mais popular', en: 'Most popular' },
      featured: true,
      name: { pt: 'Daily Pro', en: 'Daily Pro' },
      description: { pt: 'Quotas maiores, sync na nuvem, exportação e processamento avançado.', en: 'Higher quotas, cloud sync, export and smart processing.' },
      price: { GBP: '£12', EUR: '€14.90', BRL: 'R$79' },
      billing: { pt: '/mês', en: '/month' },
      cta: { pt: 'Ir de Pro', en: 'Go Pro' },
      features: {
        pt: ['quotas 10x maiores', 'sync na nuvem entre dispositivos', 'exportação de dados', 'processamento avançado', 'histórico de uso'],
        en: ['10x higher quotas', 'cloud sync across devices', 'data export', 'smart processing', 'usage history']
      }
    },
    {
      id: 'daily_diamond',
      image: '/assets/daily-diamond.webp',
      name: { pt: 'Daily Diamond', en: 'Daily Diamond' },
      description: { pt: 'Uso ilimitado, acesso API, compartilhamento em equipe e analytics.', en: 'Unlimited usage, API access, team sharing and analytics.' },
      price: { GBP: '£29', EUR: '€34.90', BRL: 'R$199' },
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
      description: { pt: 'Para criadores solo que constroem sites e usam ferramentas diárias.', en: 'For solo creators who build sites and use daily tools.' },
      price: { GBP: '£29', EUR: '€34.90', BRL: 'R$199' },
      billing: { pt: '/mês', en: '/month' },
      savings: { pt: 'Economize vs. separado', en: 'Save vs. separate' },
      cta: { pt: 'Assinar Essential', en: 'Get Essential' }
    },
    {
      id: 'bundle_complete',
      badge: { pt: 'Melhor valor', en: 'Best value' },
      name: { pt: 'VOLYNX Complete', en: 'VOLYNX Complete' },
      includes: { pt: 'Builder Studio + Daily Diamond', en: 'Builder Studio + Daily Diamond' },
      description: { pt: 'Para agências e power users que precisam de tudo.', en: 'For agencies and power users who need everything.' },
      price: { GBP: '£59', EUR: '€69.90', BRL: 'R$399' },
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
      price: { GBP: '£9', EUR: '€10.90', BRL: 'R$59' }
    },
    {
      id: 'template-pack',
      name: { pt: 'Template / kit premium', en: 'Premium template / kit' },
      description: { pt: 'Kits prontos para páginas premium de conversão.', en: 'Ready-made kits for premium conversion pages.' },
      price: { GBP: '£12', EUR: '€14.90', BRL: 'R$79' }
    },
    {
      id: 'html-export',
      name: { pt: 'HTML export', en: 'HTML export' },
      description: { pt: 'Pacote exportável para uso fora da plataforma.', en: 'Exportable package for use outside the platform.' },
      price: { GBP: '£29', EUR: '€34.90', BRL: 'R$199' }
    },
    {
      id: 'extra-slot',
      name: { pt: 'Site slot extra', en: 'Extra site slot' },
      description: { pt: 'Mais capacidade sem troca imediata de plano.', en: 'More capacity without an immediate plan upgrade.' },
      price: { GBP: '£5/mo', EUR: '€5.90/mo', BRL: 'R$39/mês' }
    },
    {
      id: 'bilingual',
      name: { pt: 'Bilingual pack', en: 'Bilingual pack' },
      description: { pt: 'Suporte a versão em dois idiomas no publish.', en: 'Two-language support in published projects.' },
      price: { GBP: '£7', EUR: '€8.90', BRL: 'R$49' }
    },
    {
      id: 'icons-addon',
      name: { pt: 'Icon Collection Pack (5 premium)', en: 'Icon Collection Pack (5 premium)' },
      description: { pt: '5 coleções premium permanentes: 3D Icons, Futuristic, Neon, Metal Blue e Nature. Sem expiração.', en: '5 permanent premium collections: 3D Icons, Futuristic, Neon, Metal Blue and Nature. No expiry.' },
      price: { GBP: '£9', EUR: '€10.90', BRL: 'R$59' }
    }
  ] satisfies BuilderAddon[],
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
