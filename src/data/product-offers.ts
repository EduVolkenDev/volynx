export type Bilingual = { en: string; pt: string };

export type ProductOfferPreview = {
  slug: string;
  lookup: string;
  name: Bilingual;
  eyebrow: Bilingual;
  title: Bilingual;
  summary: Bilingual;
  image: string;
  price: Bilingual;
  format: Bilingual;
  metrics: Array<{ value: string; label: Bilingual }>;
  whatYouGet: Bilingual[];
  bestFor: Bilingual[];
  decisionNote: Bilingual;
  checkoutLabel: Bilingual;
};

const bi = (en: string, pt: string): Bilingual => ({ en, pt });
const metric = (value: string, en: string, pt: string) => ({ value, label: bi(en, pt) });

export const productOfferPreviews: ProductOfferPreview[] = [
  {
    slug: "volynx-essential", lookup: "bundle_volynx_daily_pro",
    name: bi("VOLYNX Essential", "VOLYNX Essential"),
    eyebrow: bi("Recurring bundle", "Bundle recorrente"),
    title: bi("Build, publish and run your day from one connected plan.", "Construa, publique e organize seu dia em um plano conectado."),
    summary: bi("Builder Pro and Daily Pro together for creators who need a serious public presence and a reliable daily operating layer.", "Builder Pro e Daily Pro juntos para quem precisa de uma presença pública séria e uma camada diária confiável."),
    image: "/assets/volynx-essential.webp", price: bi("£35 / month", "£35 / mês"), format: bi("Subscription", "Assinatura"),
    metrics: [metric("2", "products included", "produtos incluídos"), metric("1", "connected account", "conta conectada"), metric("Monthly", "billing", "cobrança")],
    whatYouGet: [bi("Builder Pro with custom domain, selected premium kits and priority publishing.", "Builder Pro com domínio próprio, kits premium selecionados e prioridade de publicação."), bi("Daily Pro with My Day, Scanner, Summary, Vault, Writing and Decision.", "Daily Pro com My Day, Scanner, Summary, Vault, Writing e Decision."), bi("One VOLYNX account and a clear upgrade path as your usage grows.", "Uma conta VOLYNX e um caminho claro de evolução conforme seu uso cresce.")],
    bestFor: [bi("Creators launching a premium site and operating their work every day.", "Criadores lançando um site premium e operando seu trabalho todos os dias."), bi("Freelancers who need publishing plus structured execution.", "Freelancers que precisam de publicação e execução estruturada.")],
    decisionNote: bi("Review the included products and their limits here before entering the secure checkout.", "Revise os produtos incluídos e seus limites antes de entrar no checkout seguro."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "volynx-complete", lookup: "bundle_volynx_daily_studio",
    name: bi("VOLYNX Complete", "VOLYNX Complete"),
    eyebrow: bi("Full ecosystem bundle", "Bundle completo do ecossistema"),
    title: bi("Maximum publishing capacity with the deepest Daily workspace.", "Máxima capacidade de publicação com o Daily mais completo."),
    summary: bi("Builder Studio and Daily Diamond for teams and serious operators who want the strongest combined VOLYNX access.", "Builder Studio e Daily Diamond para equipes e operações sérias que querem o acesso combinado mais forte da VOLYNX."),
    image: "/assets/getbundle.webp", price: bi("£82 / month", "£82 / mês"), format: bi("Subscription", "Assinatura"),
    metrics: [metric("10", "sites", "sites"), metric("Diamond", "Daily tier", "tier Daily"), metric("Priority", "capacity", "capacidade")],
    whatYouGet: [bi("Builder Studio with multi-site publishing, domains, full premium kits and analytics.", "Builder Studio com múltiplos sites, domínios, kits premium completos e analytics."), bi("Daily Diamond with cloud, exports, API, shared vaults and team notes.", "Daily Diamond com cloud, exports, API, vaults compartilhados e notas de equipe."), bi("A single ecosystem path for high-volume creation and operation.", "Um único caminho de ecossistema para criação e operação em alto volume.")],
    bestFor: [bi("Small teams, studios and operators managing several active products.", "Equipes pequenas, estúdios e operadores gerenciando vários produtos ativos."), bi("Users who already know they need the highest capacity tier.", "Usuários que já sabem que precisam do tier de maior capacidade.")],
    decisionNote: bi("Compare this bundle with Essential before checkout; the difference is capacity, not a cosmetic upsell.", "Compare este bundle com o Essential antes do checkout; a diferença é capacidade, não apenas aparência."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "qrgen-pro", lookup: "builder_pro", name: bi("QRGen Pro", "QRGen Pro"), eyebrow: bi("QR product", "Produto QR"),
    title: bi("Create QR assets that survive print, campaigns and client delivery.", "Crie ativos QR que resistem à impressão, campanhas e entregas a clientes."),
    summary: bi("Brand-ready QR output with HD PNG, SVG vector export, transparent backgrounds and logo export.", "Saída QR pronta para marca com PNG HD, export vetorial SVG, fundos transparentes e export com logo."),
    image: "/assets/newqrgen.webp", price: bi("£24 / month", "£24 / mês"), format: bi("Subscription", "Assinatura"),
    metrics: [metric("SVG", "vector", "vetor"), metric("4096px", "PNG", "PNG"), metric("Logo", "export", "export com logo")],
    whatYouGet: [bi("Print-ready QR output with higher resolution.", "Saída QR pronta para impressão em resolução maior."), bi("SVG vector export and transparent backgrounds.", "Export vetorial SVG e fundos transparentes."), bi("Logo export for branded QR assets.", "Export com logo para ativos QR de marca.")],
    bestFor: [bi("Creators, agencies and businesses shipping QR assets to real campaigns.", "Criadores, agências e negócios entregando QR para campanhas reais.")],
    decisionNote: bi("Open QRGen and compare the free workflow before choosing the Pro lane.", "Abra o QRGen e compare o fluxo gratuito antes de escolher a camada Pro."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "builder-launch", lookup: "builder_launch",
    name: bi("Builder Launch", "Builder Launch"),
    eyebrow: bi("Builder subscription", "Assinatura Builder"),
    title: bi("A focused first publishing system for your next launch.", "Um sistema de publicação focado para o seu próximo lançamento."),
    summary: bi("Start with one published site, a VOLYNX subdomain, basic kits and the guided Builder workflow.", "Comece com um site publicado, subdomínio VOLYNX, kits básicos e o fluxo guiado do Builder."),
    image: "/assets/builderlaunch.webp", price: bi("£11 / month", "£11 / mês"), format: bi("Subscription", "Assinatura"),
    metrics: [metric("1", "published site", "site publicado"), metric("Guided", "editor", "editor"), metric("Basic", "kits", "kits")],
    whatYouGet: [bi("Guided Builder editor with live preview.", "Editor guiado do Builder com preview ao vivo."), bi("One published site on a VOLYNX subdomain.", "Um site publicado em subdomínio VOLYNX."), bi("A clean first step before moving to custom domain or higher capacity.", "Um primeiro passo claro antes de migrar para domínio próprio ou maior capacidade.")],
    bestFor: [bi("A first launch, personal site or small offer that needs to go live quickly.", "Um primeiro lançamento, site pessoal ou oferta pequena que precisa entrar no ar rapidamente.")],
    decisionNote: bi("This is the lean entry tier; review Pro if custom domain and premium kits are essential on day one.", "Este é o tier de entrada; veja o Pro se domínio próprio e kits premium forem essenciais desde o primeiro dia."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "builder-pro", lookup: "builder_pro",
    name: bi("Builder Pro", "Builder Pro"),
    eyebrow: bi("Builder subscription", "Assinatura Builder"),
    title: bi("Publish a more credible site with the capacity to keep improving it.", "Publique um site mais confiável com capacidade para continuar evoluindo."),
    summary: bi("Custom domain, selected premium kits, priority publishing and no VOLYNX branding for a professional public presence.", "Domínio próprio, kits premium selecionados, prioridade de publicação e sem branding VOLYNX para uma presença profissional."),
    image: "/assets/builderpro.webp", price: bi("£24 / month", "£24 / mês"), format: bi("Subscription", "Assinatura"),
    metrics: [metric("3", "sites", "sites"), metric("Custom", "domain", "domínio"), metric("Premium", "kits", "kits")],
    whatYouGet: [bi("Custom domain support and no VOLYNX branding.", "Suporte a domínio próprio e sem branding VOLYNX."), bi("Selected premium kits and priority publish capacity.", "Kits premium selecionados e prioridade de publicação."), bi("The Builder editor, live preview and production-ready structure.", "Editor Builder, preview ao vivo e estrutura pronta para produção.")],
    bestFor: [bi("Freelancers, consultants and small businesses that need a serious site now.", "Freelancers, consultores e pequenos negócios que precisam de um site sério agora.")],
    decisionNote: bi("Open the Builder experience and compare the included capacity before choosing Pro.", "Abra a experiência do Builder e compare a capacidade incluída antes de escolher o Pro."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "builder-studio", lookup: "builder_studio",
    name: bi("Builder Studio", "Builder Studio"), eyebrow: bi("Builder subscription", "Assinatura Builder"),
    title: bi("A multi-site Builder workspace for serious creators.", "Um workspace Builder para múltiplos sites e criadores sérios."),
    summary: bi("Ten sites, multiple domains, full premium kits, analytics and stronger creator capacity.", "Dez sites, múltiplos domínios, kits premium completos, analytics e mais capacidade de criação."),
    image: "/assets/builderstudio.webp", price: bi("£54 / month", "£54 / mês"), format: bi("Subscription", "Assinatura"),
    metrics: [metric("10", "sites", "sites"), metric("Full", "kits", "kits"), metric("Multi", "domain", "domínios")],
    whatYouGet: [bi("Multi-site workspace with custom domains.", "Workspace para múltiplos sites com domínios próprios."), bi("Full premium kit access, analytics and stronger publishing capacity.", "Acesso completo aos kits premium, analytics e maior capacidade de publicação."), bi("The same guided workflow with more room to operate.", "O mesmo fluxo guiado com mais espaço para operar.")],
    bestFor: [bi("Studios, creators and operators maintaining several client or brand surfaces.", "Estúdios, criadores e operadores mantendo várias marcas ou clientes.")],
    decisionNote: bi("Choose Studio for capacity and portfolio breadth, not simply for a visual upgrade.", "Escolha Studio por capacidade e amplitude de portfólio, não apenas por upgrade visual."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "builder-teams", lookup: "builder_teams",
    name: bi("Builder Teams", "Builder Teams"), eyebrow: bi("Team workspace", "Workspace de equipe"),
    title: bi("Shared publishing infrastructure for a team that ships together.", "Infraestrutura compartilhada para uma equipe que publica junto."),
    summary: bi("Team workspace, central billing, shared assets, shared icon pool and priority support.", "Workspace de equipe, cobrança central, recursos compartilhados, biblioteca de ícones e suporte prioritário."),
    image: "/assets/builderteams.webp", price: bi("£118 / month", "£118 / mês"), format: bi("Subscription", "Assinatura"),
    metrics: [metric("25", "sites", "sites"), metric("Shared", "assets", "recursos"), metric("Priority", "support", "suporte")],
    whatYouGet: [bi("Shared workspace and asset pool for the team.", "Workspace e biblioteca de recursos compartilhados para a equipe."), bi("Central billing and priority support.", "Cobrança central e suporte prioritário."), bi("Publishing capacity designed for a wider operating surface.", "Capacidade de publicação para uma operação mais ampla.")],
    bestFor: [bi("Agencies, internal teams and partners managing shared delivery.", "Agências, equipes internas e parceiros gerenciando entregas compartilhadas.")],
    decisionNote: bi("Review the team workflow and shared entitlements before checkout.", "Revise o fluxo de equipe e os acessos compartilhados antes do checkout."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "studio-pro", lookup: "studio_pro", name: bi("Studio Pro", "Studio Pro"), eyebrow: bi("Premium tools", "Ferramentas premium"),
    title: bi("More output from the tools you already use.", "Mais resultado com as ferramentas que você já usa."),
    summary: bi("Higher usage limits, batch processing and commercial rights across the premium VOLYNX Lab lane.", "Mais limites de uso, processamento em lote e direitos comerciais na camada premium do VOLYNX Lab."),
    image: "/assets/volynxstudio.webp", price: bi("£18 / month", "£18 / mês"), format: bi("Subscription", "Assinatura"),
    metrics: [metric("Batch", "processing", "processamento"), metric("Higher", "limits", "limites"), metric("Commercial", "rights", "direitos")],
    whatYouGet: [bi("Higher usage limits for supported Lab tools.", "Mais limites de uso nas ferramentas Lab compatíveis."), bi("Batch workflows for repeated production tasks.", "Fluxos em lote para tarefas repetitivas de produção."), bi("Commercial rights where the tool explicitly supports them.", "Direitos comerciais onde a ferramenta indicar esse suporte.")],
    bestFor: [bi("Creators who already use the Lab and are hitting its practical limits.", "Criadores que já usam o Lab e estão atingindo seus limites práticos.")],
    decisionNote: bi("Review the tool-specific limits and rights before subscribing.", "Revise os limites e direitos específicos de cada ferramenta antes de assinar."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "daily-pro", lookup: "daily_pro", name: bi("Daily Pro", "Daily Pro"), eyebrow: bi("Daily subscription", "Assinatura Daily"),
    title: bi("Turn daily work into a calmer, more useful operating system.", "Transforme o trabalho diário em um sistema mais calmo e útil."),
    summary: bi("My Day, Scanner, Summary, Vault, Writing and Decision with cloud sync and exports.", "My Day, Scanner, Summary, Vault, Writing e Decision com sincronização cloud e exports."),
    image: "/assets/dailypro.webp", price: bi("£14 / month", "£14 / mês"), format: bi("Subscription", "Assinatura"),
    metrics: [metric("6", "tools", "ferramentas"), metric("Cloud", "sync", "sincronização"), metric("Exports", "included", "incluídos")],
    whatYouGet: [bi("The full Daily Pro tool lane for planning, scanning and thinking.", "A camada completa Daily Pro para planejar, escanear e pensar."), bi("Cloud sync and exports for the supported workflows.", "Sincronização cloud e exports nos fluxos compatíveis."), bi("One connected daily workspace inside the VOLYNX ecosystem.", "Um workspace diário conectado dentro do ecossistema VOLYNX.")],
    bestFor: [bi("Professionals who want one place for execution, notes and decisions.", "Profissionais que querem um só lugar para execução, notas e decisões.")],
    decisionNote: bi("Open Daily and understand the tools before choosing the recurring plan.", "Abra o Daily e entenda as ferramentas antes de escolher o plano recorrente."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "daily-diamond", lookup: "daily_diamond", name: bi("Daily Diamond", "Daily Diamond"), eyebrow: bi("Daily power tier", "Tier avançado do Daily"),
    title: bi("A deeper Daily workspace for high-volume operation.", "Um Daily mais profundo para operações de alto volume."),
    summary: bi("Cloud, exports, API, shared vaults, team notes, analytics and priority capacity.", "Cloud, exports, API, vaults compartilhados, notas de equipe, analytics e capacidade prioritária."),
    image: "/assets/daily-diamond.webp", price: bi("£34 / month", "£34 / mês"), format: bi("Subscription", "Assinatura"),
    metrics: [metric("API", "access", "acesso"), metric("Shared", "vaults", "vaults"), metric("Priority", "capacity", "capacidade")],
    whatYouGet: [bi("Everything in Daily Pro with a deeper team and export layer.", "Tudo do Daily Pro com uma camada mais forte de equipe e exports."), bi("API, shared vaults, team notes and analytics.", "API, vaults compartilhados, notas de equipe e analytics."), bi("Priority capacity for sustained daily use.", "Capacidade prioritária para uso diário contínuo.")],
    bestFor: [bi("Teams and power users who need shared knowledge and higher operating capacity.", "Equipes e power users que precisam de conhecimento compartilhado e maior capacidade.")],
    decisionNote: bi("Compare Pro and Diamond by workflow depth before checkout.", "Compare Pro e Diamond pela profundidade do fluxo antes do checkout."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "cvitae-business", lookup: "cvitae_business", name: bi("CVitae Business", "CVitae Business"), eyebrow: bi("Career product", "Produto de carreira"),
    title: bi("Build, refine and export professional CVs without a ceiling.", "Crie, refine e exporte CVs profissionais sem ficar limitado."),
    summary: bi("Unlimited CV workflow, premium templates and professional exports for people whose career asset must stay ready.", "Fluxo ilimitado de CVs, templates premium e exports profissionais para quem precisa manter seu ativo de carreira pronto."),
    image: "/assets/cvitae.webp", price: bi("£15 / month", "£15 / mês"), format: bi("Subscription", "Assinatura"),
    metrics: [metric("Unlimited", "CVs", "CVs"), metric("Premium", "templates", "templates"), metric("Pro", "exports", "exports")],
    whatYouGet: [bi("Guided CV editor with live preview.", "Editor guiado de CV com preview ao vivo."), bi("Unlimited CV management and premium templates.", "Gestão ilimitada de CVs e templates premium."), bi("Professional export workflow for repeated career use.", "Fluxo de export profissional para uso recorrente na carreira.")],
    bestFor: [bi("Professionals, freelancers and candidates who keep multiple versions ready.", "Profissionais, freelancers e candidatos que mantêm várias versões prontas.")],
    decisionNote: bi("Build and preview your CV free before deciding if Business is the right upgrade.", "Crie e visualize seu CV gratuitamente antes de decidir se Business é o upgrade certo."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "vx-starter", lookup: "tokens_starter", name: bi("VX Starter", "VX Starter"), eyebrow: bi("One-time capacity", "Capacidade avulsa"),
    title: bi("Add premium capacity only when you need it.", "Adicione capacidade premium apenas quando precisar."),
    summary: bi("A small VX pack for testing supported exports, templates and premium actions without changing your subscription.", "Um pack pequeno de VX para testar exports, templates e ações premium sem mudar sua assinatura."),
    image: "/assets/vx3.webp", price: bi("From £10", "A partir de £10"), format: bi("One-time", "Pagamento único"),
    metrics: [metric("One-time", "purchase", "compra"), metric("No", "expiry", "expiração"), metric("Flexible", "use", "uso flexível")],
    whatYouGet: [bi("VX capacity for explicitly supported premium actions.", "Capacidade VX para ações premium que indiquem esse suporte."), bi("A one-time balance that does not change your plan.", "Um saldo avulso que não altera seu plano."), bi("The same account balance across enabled VOLYNX surfaces.", "O mesmo saldo na conta nas superfícies VOLYNX habilitadas.")],
    bestFor: [bi("New users who want to test premium capacity before buying a larger pack.", "Novos usuários que querem testar capacidade premium antes de comprar um pack maior.")],
    decisionNote: bi("Check which current product actions accept VX before purchasing.", "Confira quais ações atuais aceitam VX antes de comprar."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "vx-core", lookup: "tokens_core", name: bi("VX Core", "VX Core"), eyebrow: bi("One-time capacity", "Capacidade avulsa"),
    title: bi("The practical VX balance for recurring premium actions.", "O saldo VX prático para ações premium recorrentes."),
    summary: bi("32 VX for eligible exports, templates and selected Studio actions — no subscription change.", "32 VX para exports, templates e ações Studio elegíveis — sem mudar sua assinatura."),
    image: "/assets/vx3.webp", price: bi("£18 one-time", "£18 pagamento único"), format: bi("One-time", "Pagamento único"),
    metrics: [metric("32", "VX", "VX"), metric("No", "subscription", "assinatura"), metric("Never", "expires", "expira")],
    whatYouGet: [bi("32 VX added to the account balance after successful fulfillment.", "32 VX adicionados ao saldo da conta após a entrega confirmada."), bi("Capacity for supported CVitae, Studio and other premium actions.", "Capacidade para ações premium compatíveis do CVitae, Studio e outras áreas."), bi("No recurring commitment.", "Nenhum compromisso recorrente.")],
    bestFor: [bi("Existing users who know the exact premium action they need to unlock.", "Usuários existentes que já sabem qual ação premium precisam desbloquear.")],
    decisionNote: bi("Confirm your intended action accepts VX before checkout; VX is not a universal product payment.", "Confirme que sua ação aceita VX antes do checkout; VX não é pagamento universal de produtos."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "vx-pro", lookup: "tokens_pro", name: bi("VX Pro", "VX Pro"), eyebrow: bi("One-time capacity", "Capacidade avulsa"),
    title: bi("More room for repeated premium exports and templates.", "Mais espaço para exports e templates premium recorrentes."),
    summary: bi("A larger one-time VX balance for users who already know they will use premium actions repeatedly.", "Um saldo VX avulso maior para quem já sabe que usará ações premium repetidamente."),
    image: "/assets/vx3.webp", price: bi("From £45", "A partir de £45"), format: bi("One-time", "Pagamento único"),
    metrics: [metric("More", "capacity", "capacidade"), metric("No", "expiry", "expiração"), metric("One-time", "billing", "cobrança")],
    whatYouGet: [bi("A larger VX balance for supported premium actions.", "Um saldo VX maior para ações premium compatíveis."), bi("Flexible use across enabled products.", "Uso flexível nos produtos habilitados."), bi("No plan change or recurring billing.", "Sem mudança de plano ou cobrança recorrente.")],
    bestFor: [bi("Power users with a known export or template workload.", "Power users com uma demanda conhecida de exports ou templates.")],
    decisionNote: bi("Use the smaller pack if you are still evaluating whether VX fits your workflow.", "Use o pack menor se ainda estiver avaliando se VX se encaixa no seu fluxo."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
  {
    slug: "vx-scale", lookup: "tokens_scale", name: bi("VX Scale", "VX Scale"), eyebrow: bi("One-time capacity", "Capacidade avulsa"),
    title: bi("A deeper capacity reserve for heavy premium usage.", "Uma reserva maior para uso premium intenso."),
    summary: bi("The largest VX lane for teams and operators who have already validated their premium workflow.", "A maior faixa de VX para equipes e operadores que já validaram seu fluxo premium."),
    image: "/assets/vx4.webp", price: bi("From £120", "A partir de £120"), format: bi("One-time", "Pagamento único"),
    metrics: [metric("High", "capacity", "capacidade"), metric("No", "expiry", "expiração"), metric("Priority", "workflow", "fluxo prioritário")],
    whatYouGet: [bi("The largest one-time VX balance.", "O maior saldo VX avulso."), bi("Capacity for supported high-volume actions.", "Capacidade para ações compatíveis em alto volume."), bi("A single balance with no recurring subscription.", "Um saldo único sem assinatura recorrente.")],
    bestFor: [bi("Teams and established users with a measurable premium usage need.", "Equipes e usuários estabelecidos com necessidade mensurável de uso premium.")],
    decisionNote: bi("Only choose Scale after checking the exact actions and volume you need.", "Escolha Scale apenas depois de confirmar as ações e o volume de que precisa."),
    checkoutLabel: bi("Continue to secure checkout", "Continuar para checkout seguro"),
  },
];

export const productOfferPreviewBySlug = Object.fromEntries(
  productOfferPreviews.map((offer) => [offer.slug, offer]),
) as Record<string, ProductOfferPreview>;
