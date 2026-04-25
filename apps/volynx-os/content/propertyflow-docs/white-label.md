# PropertyFlow — Como apresentar como seu produto (White-Label)

Este guia mostra **como remover toda menção à VOLYNX** e apresentar o PropertyFlow como sua própria ferramenta — pro teu cliente final nunca saber que existe uma VOLYNX no meio.

**Disponível apenas no White-Label (£897).** Nos tiers menores, a licença exige atribuição visível.

Tempo de configuração: **30 minutos**.

---

## O que você pode fazer com White-Label

Debaixo do teu White-Label, você pode:

- ✓ **Remover toda atribuição VOLYNX** do site público, painel admin, emails, código visível
- ✓ **Apresentar o produto como sua própria marca** nas suas apresentações, site de vendas, contratos
- ✓ **Usar um sub-nome próprio** (ex: "ImóveisPro Platform", "AgencyOS", qualquer coisa)
- ✓ **Vender como serviço** pros teus clientes sem revelar a stack
- ✓ **Contratar devs pra customizar** mais ainda, sem restrições

---

## O que você NÃO pode fazer

Mesmo com White-Label, você não pode:

- ✗ Alegar que **construiu o PropertyFlow do zero** (em contratos, processos judiciais, pitches formais). Dizer "desenvolvemos uma plataforma própria" é borderline — "desenvolvemos **sobre** uma plataforma própria" é OK.
- ✗ Registrar **trademarks que conflitam com VOLYNX** ou criam confusão de marca (ex: "Volynx Flow", "VolynxPro")
- ✗ **Revender o código-fonte** como template/kit/boilerplate pra outros devs ou vender no ThemeForest/Gumroad
- ✗ Remover o **arquivo LICENSE.md** do código (você usa ele internamente — ninguém precisa ver, mas precisa existir)

Em essência: **use como produto, não revenda como código.**

---

## Parte 1 — Ativar o modo white-label

### 1.1 Flag principal

No `.env.local` (e depois no Vercel):

```
VITE_WHITE_LABEL=true
```

Isso desliga automaticamente:
- Rodapé "Built on VOLYNX PropertyFlow"
- Links pra volynx.world no admin
- Copyright "© VOLYNX"
- Links pra documentação pública da VOLYNX

### 1.2 Configurar sua marca-mestre

No `src/config/brand.ts`, troca tudo pela tua marca:

```typescript
export const brand = {
  name: "ImóveisPro",
  productName: "ImóveisPro Platform",  // aparece em títulos/meta como "Powered by ImóveisPro"
  companyName: "ImóveisPro Tecnologia Ltda",
  // ... resto da configuração
};
```

### 1.3 Trocar identidade do admin

Com `VITE_WHITE_LABEL=true`, o painel admin também muda:

**Antes (default):**
- Logo VOLYNX no header do painel
- "Powered by VOLYNX"
- Links pra docs.volynx.world

**Depois:**
- Teu logo no header
- "Powered by [TuaMarca]"
- Links pra `docs.tuamarca.com.br/` (você hospeda — mais abaixo)

### 1.4 Emails que saem do sistema

Sem white-label ativo, emails transacionais (lead notifications, magic links de admin) saem como:

```
From: VOLYNX PropertyFlow <no-reply@volynx.world>
```

Com white-label:

```
From: ImóveisPro <no-reply@imoveispro.com.br>
```

**Configurar:**
- `src/emails/brand.ts` — troca todos os elementos visuais dos templates (logo, cores, nome)
- Provedor de email (Resend recomendado):
  - Configura domínio próprio (`imoveispro.com.br`) no Resend
  - Verifica SPF, DKIM, DMARC (Resend explica em 5 min)
  - Troca `RESEND_FROM_EMAIL=no-reply@imoveispro.com.br` no `.env`

---

## Parte 2 — Auditoria de lugares onde aparece "VOLYNX"

Lista de lugares pra checar manualmente — algumas menções ficam em comentários de código, placeholders ou strings esquecidas.

### Código

**Busca global:**

No Terminal, dentro da pasta do PropertyFlow:

```bash
grep -r "VOLYNX" src/ public/ --exclude-dir=node_modules -i
```

Ou no VS Code: `Ctrl+Shift+F` e procura `VOLYNX` (case-insensitive).

**O que você vai encontrar (alguns são ok, outros não):**

| Localização | O que fazer |
|---|---|
| `LICENSE.md` | Manter (é documento legal interno) |
| Comentários `// Copyright VOLYNX` em código-fonte | Manter se quiser respeitar a licença, ou substituir (comentário de código não aparece pra usuário) |
| Strings de copy em `i18n/*.json` | Trocar por `brand.name` ou remover |
| Meta tags default em `index.html` | Editar |
| Footer (`src/components/Footer.tsx`) | Já usa `brand.name` se white-label estiver ativo |
| Nome de classes CSS com prefixo `vx-` | Não precisa trocar (CSS não é visível pro usuário final) |

### Meta tags

Em `index.html`:

```html
<meta name="generator" content="PropertyFlow by VOLYNX">  <!-- REMOVA esta linha -->
<meta name="author" content="VOLYNX">  <!-- troca pra tua empresa -->
```

### robots.txt e sitemap

Em `public/robots.txt`:
- Remove qualquer link pra volynx.world
- Adiciona o teu sitemap

### Imagens com logo VOLYNX

Procura em `public/` por:
- `favicon.ico` (deve ser teu)
- `og-image.png` (card social — precisa ser teu)
- `apple-touch-icon.png`
- Qualquer PNG/SVG com V-mark

Troca todos pelos seus.

### Package.json

Em `package.json`:

```json
{
  "name": "propertyflow",        ← pode manter ou trocar (não aparece pro user)
  "author": "VOLYNX",            ← troca
  "description": "...",           ← troca
  "repository": "..."             ← remove ou troca pra teu
}
```

Não é crítico (só aparece em builds e logs), mas é higiene.

---

## Parte 3 — Hospedar tua própria documentação

Clientes vão precisar de docs. Três opções:

### Opção A: Docs completamente separadas

Você copia os `.md` do PropertyFlow pra um doc host separado (Mintlify, GitBook, Docusaurus), adapta pra tua marca, e hospeda em `docs.tuamarca.com.br`.

**Prós:** controle total, branding perfeito, SEO próprio.
**Contras:** trabalho inicial, manutenção quando PropertyFlow lançar nova versão.

### Opção B: Redirecionar alguns docs, esconder outros

Cria uma página própria tipo `suamarca.com.br/docs` com os tópicos que os teus clientes precisam. Docs mais técnicos (multi-tenant, deploy) ficam só internos.

**Prós:** menos trabalho que A.
**Contras:** cliente pode precisar de docs internos eventualmente (e aí você explica por email).

### Opção C: Docs embutidas no painel

Dentro do admin, abre uma seção `/admin/help` com tutoriais essenciais. Cliente nunca precisa sair do painel.

**Prós:** experiência integrada, super profissional.
**Contras:** precisa construir o sistema de docs dentro do app.

**Minha recomendação:** B pros primeiros 3 meses, migrar pra A depois se o negócio bombar.

---

## Parte 4 — Contrato e termos de uso seus

Com White-Label você vende pro teu cliente usando **seu próprio contrato**. Não usa o LICENSE.md da VOLYNX (esse é entre você e a VOLYNX, invisível pro cliente final).

### Estrutura sugerida do contrato teu cliente

Contrato de prestação de serviço ou SaaS, conforme teu modelo:

1. **Objeto:** "A plataforma ImóveisPro é uma ferramenta de gestão imobiliária..."
2. **Escopo de uso:** "Cliente recebe acesso pra gerenciar até X propriedades, Y leads por mês..."
3. **Preço e pagamento:** (teu preço, teus termos)
4. **Propriedade intelectual:** "A plataforma e todos os seus componentes são propriedade da [Sua Empresa]..."
5. **Proibições:** cliente não pode revender, engenharia reversa, etc (similar ao teu acordo com a VOLYNX)
6. **Garantias e limitação de responsabilidade**
7. **Rescisão**
8. **Foro**

Peça pra um advogado adaptar baseado no teu negócio específico. Pro Brasil, advogado de tecnologia/SaaS é o ideal. Custa R$ 500-2.000.

### Termos de uso público (site do cliente final)

Cada imobiliária que você atende precisa de seus próprios Termos de Uso e Política de Privacidade no site dela (não no teu). Por causa da LGPD, isso é obrigatório.

Você pode fornecer **templates customizáveis** pros clientes usarem. A pasta `docs/legal-templates/` no kit White-Label tem:

- `template-privacy-policy-pt.md`
- `template-terms-of-service-pt.md`
- `template-cookie-policy-pt.md`

---

## Parte 5 — Como vender com White-Label

### 5.1 Posicionamento

O cliente final compra **a solução**, não a tecnologia. Tu vende:

- ✓ "Uma plataforma premium pra imobiliárias fazerem vitrine online e gerir leads"
- ✓ "Site profissional, painel admin, lead management, tudo integrado"
- ✓ "Desenvolvida especialmente pra imobiliárias brasileiras"

Evita:

- ✗ "Construímos do zero" (se cliente descobrir que usou base, quebra confiança)
- ✗ "Sistema open source customizado" (implica que é grátis)
- ✗ "Template adaptado" (implica que é barato)

### 5.2 Diferenciar do concorrente Imovelweb/VivaReal

Os grandes portais brasileiros cobram comissão por anúncio OU mensalidade. Tu vende:

- **Propriedade exclusiva do site** (tu é dono, não aluguel)
- **Design premium** (não é o mesmo template de 10k outras imobiliárias)
- **Sem comissão por lead** (lead que chega, é teu)
- **Domínio próprio** (não subdomínio do portal)
- **Marca própria** (SEO, recall, autoridade)

Em dinheiro: R$ 500/mês (o que tu cobra) **vs** R$ 2-5k/mês (o que imobiliária gasta em Imovelweb + VivaReal + anúncios). Vende-se sozinho.

### 5.3 Preços sugeridos (a tua escolha, mas referência)

| Plano | Pra quem | Preço sugerido | O que inclui |
|---|---|---|---|
| Starter | Corretor autônomo, <20 imóveis | R$ 297/mês | Até 50 imóveis, painel, formulários |
| Pro | Imobiliária pequena | R$ 597/mês | Até 500 imóveis, multi-agent, integração CRM |
| Enterprise | Imobiliária média/grande | R$ 1.497/mês | Ilimitado, domínio próprio, white-label pra sub-marcas |

Essa é a estrutura típica quando vende SaaS com multi-tenant. **Setup fee opcional** de R$ 997 (one-time) pra configuração inicial + migração de dados do sistema antigo.

### 5.4 Sales funnel sugerido

1. **Landing page** (teu site) → demo + trial 14 dias
2. **Cliente se inscreve** no trial → você cria tenant pelo painel master
3. **Ligação de onboarding** (30 min) → configura marca, migra dados
4. **Trial ativo** por 14 dias, com follow-up em 7 dias
5. **Conversão pra plano pago** → Stripe recorring

Com 20 clientes Pro = R$ 12k/mês recorrente, bem escalável.

---

## Parte 6 — Aspectos legais importantes

### LGPD / GDPR

Você (como operador da plataforma) e o cliente (como controlador dos dados dos propietários/leads deles) têm responsabilidades compartilhadas.

- **Acordo de Processamento de Dados (DPA)** entre você e cada cliente — obrigatório se você guarda dados pessoais dos clientes finais (leads, compradores). Template na pasta `legal-templates/`.
- **Inventário de dados** — mantém um registro de que dados você processa e por quê
- **Direito de exportação e deleção** — cliente pode pedir pra excluir todos os dados de um usuário específico, e você tem que conseguir fazer. O PropertyFlow tem comando:
  ```bash
  npm run gdpr:delete -- --tenant silvaimoveis --user-email user@example.com
  ```

### Marca registrada

Antes de lançar teu produto com nome "ImóveisPro" ou o que for:

1. **Busca no INPI** (https://busca.inpi.gov.br) pra ver se o nome está livre
2. Se estiver livre, **registra** (R$ 355 + taxa anual, ~1 ano pra sair)
3. **Nunca use nome muito parecido com marcas existentes** — "Imovelweb Pro", "VivaReal Plus" = processo judicial certo

### Compliance de impostos

Com R$ 5k+/mês de receita, você precisa:
- **CNPJ** (MEI se <R$ 81k/ano, ME ou LTDA acima)
- **Emitir nota fiscal** pra cada cliente pago
- **Imposto Simples Nacional** (~15% sobre faturamento, se ME)

Contador: R$ 200-500/mês, resolve tudo isso.

---

## Parte 7 — Suporte pros teus clientes

Tu vira o **primeiro nível de suporte**. Se o cliente tem problema, ele fala com tu, não com a VOLYNX.

Casos que tu resolve:
- Como adicionar propriedade, trocar foto, filtros
- Branding, customização visual
- Acesso do painel, senhas
- Erros comuns do uso diário

Casos que tu **escala pra VOLYNX** (via email):
- Bugs no código-fonte que você não consegue reproduzir
- Problemas de infraestrutura do PropertyFlow (migrations, atualizações)
- Dúvidas sobre arquitetura

Tua janela de suporte da VOLYNX pro White-Label: **12 meses, priority queue, 24h úteis**.

### Canal de suporte pros teus clientes

Três opções:

**A. Email (simples)**
- `suporte@suamarca.com.br` redireciona pra ti ou pra um atendente dedicado
- Adequado até ~30 clientes

**B. Ticket system (escalável)**
- Intercom, Crisp, Freshdesk, HelpScout
- Adequado de 30-300 clientes
- Custo R$ 200-500/mês

**C. Central de ajuda + chatbot (enterprise)**
- Intercom + artigos + bot automático
- >300 clientes

Comece com A, evolui conforme cresce.

---

## Parte 8 — Atualizar quando sair versão nova

Quando a VOLYNX lançar nova versão do PropertyFlow (tipo v1.1, v1.2):

1. Você recebe email da VOLYNX com release notes
2. Baixa a nova versão do teu dashboard Volynx
3. Em ambiente de desenvolvimento, faz **diff** entre a versão nova e a tua versão customizada
4. Aplica as mudanças importantes (features, bug fixes) sem sobrescrever tuas customizações
5. Testa em staging (tenant de teste)
6. Faz rollout gradual: 10% dos tenants → monitora por 48h → 100%
7. Notifica teus clientes sobre novidades

**Processo mais simples se você não customizou muito o código:**
- `git pull` da nova versão da VOLYNX
- Resolve conflitos (geralmente só no brand.ts, que é teu)
- Testa
- Deploy

**Se customizou pesado:** aplica só os bug fixes críticos, deixa features novas pra próxima sprint tua.

---

## Parte 9 — Checklist de lançamento

Antes de apresentar como teu produto pro primeiro cliente pagante:

### Setup técnico
- [ ] `VITE_WHITE_LABEL=true` ativo
- [ ] Brand config preenchido com teu nome, logo, cores, contato
- [ ] Email transacional com domínio teu (SPF/DKIM/DMARC validados)
- [ ] Busca de "VOLYNX" em código — todas as menções públicas removidas
- [ ] Favicon, og-image, apple-touch-icon — todos teus
- [ ] Deploy testado em produção, HTTPS funcionando, domínio próprio

### Setup comercial
- [ ] Contrato de prestação de serviço revisado por advogado
- [ ] DPA (LGPD) pronto pra assinar com cada cliente
- [ ] Landing page de vendas no ar (tua)
- [ ] Stripe (ou gateway) configurado pra cobrança recorrente
- [ ] Teste de checkout end-to-end realizado
- [ ] Sistema de suporte ativo (email ou ferramenta)

### Setup operacional
- [ ] Processo documentado de criar tenant novo (5 min)
- [ ] Script de onboarding de novo cliente (30 min call + check-in 7 dias)
- [ ] Sistema de monitoramento em pé (uptime, erros)
- [ ] Plano de backup e recuperação testado (não só configurado)

Se todos ✓, **tu tá pronto pra vender como teu próprio produto.**

---

## Parte 10 — Dúvidas comuns

### "Meu cliente pode descobrir que é Volynx?"
Se você seguiu o checklist, muito difícil. Cliente teria que:
- Inspecionar HTML e procurar classes CSS `vx-*` (improvável)
- Olhar dependências no package.json (impossível — não está no site público)
- Ver o `LICENSE.md` (você não expõe)

Se cliente **realmente técnico** descobre: tá tudo bem. White-Label não exige ocultamento absoluto, só permissão de apresentar como seu produto. Se perguntado diretamente, você pode dizer "desenvolvemos sobre uma plataforma modular que licenciamos."

### "Posso vender pros meus clientes uma "versão Enterprise"?"
Sim. Você pode criar seus próprios planos (Básico, Pro, Enterprise) usando feature flags por tenant (ver [MULTI_TENANT.md](MULTI_TENANT.md) Parte 4.3). O preço e escopo de cada plano é totalmente tua escolha.

### "E se a Volynx sair do ar?"
Tua cópia do código continua funcionando indefinidamente no teu host. Você não depende da Volynx estar online. **O que para:**
- Atualizações futuras (mas tu pode manter o código parado se quiser)
- Suporte (tu vira sozinho, ou contrata dev)

**O que não para:**
- Teus tenants funcionando
- Pagamentos e cobrança dos teus clientes
- Operação diária

### "Posso contratar um dev pra modificar mais o código?"
Sim, sem restrições. O código é teu (sob os termos da license). Só não pode:
- Redistribuir o código pra outros devs/empresas
- Usar trademarks da Volynx

### "Meu cliente pede SLA de 99.9%. Você garante?"
A Volynx não dá SLA pro teu deploy (porque é teu). Mas o PropertyFlow em Vercel + Supabase roda historicamente em ~99.95%. Se precisa de SLA contratual, você pode oferecer debaixo do teu contrato e assumir esse risco operacional (provisiona um host mais robusto, monitoramento 24/7).

---

## Checklist rápido

Pra apresentar como teu próprio produto:

1. ✅ Ativa `VITE_WHITE_LABEL=true`
2. ✅ Troca todos os assets visuais (logo, favicon, og-image) pelos teus
3. ✅ Configura emails transacionais com domínio próprio
4. ✅ Roda busca de "VOLYNX" no código público e remove
5. ✅ Hospeda teus próprios docs (ou adapta)
6. ✅ Contrato comercial revisado por advogado
7. ✅ Deploy em produção com teu domínio
8. ✅ Processo de venda e suporte definidos

Feito isso, **tu tem um produto próprio rodando sobre a VOLYNX — e o cliente nunca precisa saber.**

---

## Precisou de ajuda?

- Canal Discord do White-Label (link no email de delivery)
- **support@volynx.world** com o order ID. Priority queue: 24h úteis.

Bom lançamento. 🚀 (OK, sem emoji. Bom lançamento.)
