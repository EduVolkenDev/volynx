# PropertyFlow — Modo Multi-Tenant (White-Label)

Este guia é pra quem comprou o **White-Label** e quer rodar **um único PropertyFlow servindo várias imobiliárias ao mesmo tempo** — seja porque é uma agência entregando sites pra clientes, ou um grupo com várias marcas.

**Disponível apenas no White-Label.** Nos tiers Starter e Professional você só pode servir uma organização por instalação.

Tempo pra entender: **20 minutos**. Tempo pra configurar a primeira conta-cliente: **30 minutos**.

---

## O que é multi-tenant, em plain English

**Single-tenant** (o padrão de Pro): 1 instalação do PropertyFlow = 1 imobiliária. Quer outra? Instala de novo.

**Multi-tenant** (White-Label): 1 instalação do PropertyFlow = várias imobiliárias. Cada uma com seu próprio conteúdo, marca, domínio, mas compartilhando infraestrutura.

Pensa num prédio de apartamentos:
- **Single-tenant** = casa. Cada família precisa da sua própria casa, encanamento, fundação, tudo.
- **Multi-tenant** = prédio. Várias famílias, cada uma na sua unidade privativa, mas compartilham a estrutura, elevador, serviços comuns.

**Vantagens do multi-tenant:**
- Um único deploy pra manter atualizado (patch 1 vez = todos os clientes atualizados)
- Custo de infraestrutura dividido
- Operação mais rápida pra adicionar cliente novo (15 minutos vs 2 horas de deploy)

**Desvantagens:**
- Mais complexo de configurar na primeira vez
- Se o servidor cai, todos os clientes caem juntos
- Requer cuidado com isolamento de dados (clientes não podem ver dados um do outro)

---

## Quando usar cada modo

| Situação | Melhor modo |
|---|---|
| Só 1 imobiliária (o dono é você) | Single-tenant (vai pra PROFESSIONAL/README.md) |
| Agência entregando 2-5 sites diferentes | Single-tenant (uma instalação por cliente — cada um tem seu próprio servidor Supabase, Vercel, etc) |
| Agência entregando 6+ sites | Multi-tenant (economiza tempo e dinheiro) |
| Grupo/franquia com várias bandeiras | Multi-tenant |
| Quer revender como SaaS ("Instagram pra imobiliárias") | Multi-tenant |

**Se está em dúvida:** comece single-tenant (mais simples) e migre pra multi-tenant depois se crescer. A migração é suportada.

---

## Parte 1 — Dois modos de multi-tenancy

### Modo A: Multi-tenant por subdomínio (recomendado)

Cada cliente tem seu próprio subdomínio debaixo do seu domínio-mestre:

```
silvaimoveis.minhaplataforma.com.br   ← cliente 1
jordaoleiloeiro.minhaplataforma.com.br   ← cliente 2
grupomaranhao.minhaplataforma.com.br   ← cliente 3
```

**Quando usar:** você quer que cada cliente tenha uma URL dedicada visualmente separada. Clientes podem até eventualmente conectar um domínio próprio deles (tipo `silvaimoveis.com.br`) apontando pro seu subdomínio.

### Modo B: Multi-tenant por caminho

Um único domínio, cada cliente tem seu sub-caminho:

```
minhaplataforma.com.br/silvaimoveis
minhaplataforma.com.br/jordaoleiloeiro
minhaplataforma.com.br/grupomaranhao
```

**Quando usar:** você quer consolidar tudo debaixo da sua marca-mãe (ex: `imoveisrio.com.br` listando várias imobiliárias da cidade).

### Qual escolher

90% dos casos: **Modo A (subdomínio)**. É o padrão da indústria, permite domínio próprio do cliente no futuro, e cliente sente que tem seu próprio "site".

Vou focar no Modo A neste guia. Pro Modo B, as diferenças estão numa seção no final.

---

## Parte 2 — Ativar multi-tenant mode

Parte técnica. Se não é confortável, pode pedir ajuda do suporte — **support@volynx.world**.

### 2.1 Habilitar no código

Abre `src/config/propertyflow.ts`:

```typescript
export const config = {
  mode: "multi-tenant",  // antes era "single-tenant"
  multiTenantMode: "subdomain", // "subdomain" ou "path"
  rootDomain: "minhaplataforma.com.br", // seu domínio mestre
  reservedSubdomains: ["www", "admin", "api", "app"], // não podem virar tenant
};
```

### 2.2 Rodar a migration de multi-tenancy

No Terminal, pasta do PropertyFlow:

```bash
npm run db:migrate:multi-tenant
```

Isso adiciona a coluna `tenant_id` em todas as tabelas relevantes (`properties`, `leads`, `admins`, `agents`). **Dados existentes ficam atribuídos ao tenant "default".**

⚠️ **Faz backup ANTES.** Esta migration é reversível mas chata:
```bash
npm run db:backup
```

### 2.3 Configurar DNS wildcard

No provedor do seu domínio (Cloudflare, registro.br, etc), adiciona:

```
Tipo: CNAME ou A
Nome: *
Valor: o mesmo que você usa pro domínio principal
```

Isso diz "qualquer subdomínio debaixo de `minhaplataforma.com.br` vai pro mesmo servidor". O PropertyFlow lê o subdomínio e serve o tenant certo.

**Se está na Vercel:**
1. Settings → Domains
2. Add domain → digite `*.minhaplataforma.com.br`
3. Confirma

**Se está em outro host:**
- Cloudflare Pages: Custom domains → Add `*.minhaplataforma.com.br`
- Netlify: Domain settings → Add domain alias → `*.minhaplataforma.com.br`
- VPS próprio: configura NGINX/Caddy pra aceitar wildcard

### 2.4 Redeploy

```bash
git push
```

Vercel/Netlify puxa automático e redeploya.

**Teste:** abre qualquer subdomínio (ex: `teste.minhaplataforma.com.br`). Se aparece página "Tenant not found" ou similar, funcionou — wildcard está pegando e o PropertyFlow está perguntando qual tenant.

---

## Parte 3 — Criar o primeiro tenant (cliente)

Existem duas formas.

### Forma A: Via CLI (mais rápida, recomendada)

No Terminal:

```bash
npm run tenant:create -- \
  --slug="silvaimoveis" \
  --name="Silva Imóveis" \
  --domain="silvaimoveis.minhaplataforma.com.br" \
  --admin-email="eduardo@silvaimoveis.com.br"
```

Isso cria:
- Registro do tenant no banco
- Admin inicial com o email informado (recebe magic link)
- Subdomínio ativo (aponta pro mesmo código, mas filtra dados pelo tenant)

**Resultado:** `silvaimoveis.minhaplataforma.com.br` agora funciona. O admin pode logar em `silvaimoveis.minhaplataforma.com.br/admin`.

### Forma B: Via painel master (visual)

Se você tem muitos tenants, é útil ter um painel pra gerenciar todos. O PropertyFlow White-Label vem com um painel master:

1. Vai em `master.minhaplataforma.com.br` ou `minhaplataforma.com.br/master` (configurado no `.env`)
2. Login com seu email master (definido em `MASTER_ADMIN_EMAIL`)
3. Botão **"+ Novo Tenant"**
4. Preenche dados, salva
5. O tenant aparece na lista

**O painel master mostra:**
- Todos os tenants ativos
- Número de propriedades de cada um
- Uso de storage
- Última atividade
- Admin principal de cada tenant

Útil pra agências vendendo como serviço — você gerencia todos os clientes de um lugar só.

---

## Parte 4 — Customização por tenant

Cada tenant pode ter sua própria identidade visual, textos e configurações.

### 4.1 Branding por tenant

No painel master, edita o tenant → aba **Branding**. Campos:

- **Nome** da imobiliária
- **Logo** (upload, igual o `brand.ts` mas por tenant)
- **Cores** (primary, accent, bg, bgDark)
- **Fontes**
- **Favicon**
- **Contato** (telefone, WhatsApp, email, endereço)
- **Redes sociais**
- **SEO** (título, descrição, og:image)

Tudo isso fica guardado no banco. Quando um visitante acessa `silvaimoveis.minhaplataforma.com.br`, o PropertyFlow carrega o branding do tenant `silvaimoveis`.

### 4.2 Domínio próprio do cliente (opcional)

Se o cliente quer `silvaimoveis.com.br` em vez de `silvaimoveis.minhaplataforma.com.br`:

1. No painel master → Tenant → aba **Domínios** → **Add custom domain**
2. Digite `silvaimoveis.com.br`
3. PropertyFlow mostra os DNS records pro cliente adicionar no provedor dele
4. Cliente adiciona. Você confirma no painel.
5. ~10 minutos depois, `silvaimoveis.com.br` serve o tenant `silvaimoveis`.

**HTTPS:** automático via Let's Encrypt (no Vercel/Cloudflare/Netlify). Você não faz nada.

### 4.3 Feature flags por tenant

Algumas features você pode ligar/desligar por tenant. Útil se você vende "planos" (Básico/Pro/Premium) aos seus clientes:

```typescript
// Exemplo: ativar feature pra um tenant específico
await tenant.setFeature("silvaimoveis", "crm_integration", true);
await tenant.setFeature("silvaimoveis", "multi_agent", true);
await tenant.setFeature("silvaimoveis", "advanced_analytics", false);
```

Todas as feature flags disponíveis:
- `multi_agent` — multi-corretor
- `crm_integration` — integração com CRM externo
- `advanced_analytics` — analytics avançado
- `custom_domain` — permite domínio próprio
- `advanced_filters` — filtros avançados pra propriedades
- `lead_routing` — roteamento automático de leads por regra

---

## Parte 5 — Isolamento de dados (importante)

**Dados de um tenant NUNCA podem vazar pra outro.** O PropertyFlow usa RLS (Row Level Security) do Supabase pra garantir isso automaticamente. Mas vale entender como funciona.

### Como cada query é isolada

Toda query ao banco passa por um filtro automático: `WHERE tenant_id = [current_tenant]`. Isso é aplicado no banco, não no código — então mesmo se um dev tentar "esquecer" o filtro por engano, o banco bloqueia.

### Admin cross-tenant

Um admin do tenant `silvaimoveis` só vê dados do `silvaimoveis`. Nunca vê propriedades ou leads do tenant `jordaoleiloeiro`.

**Exceção:** você (admin master) vê tudo no painel master. Útil pra operação, mas use com cuidado — não compartilhe acesso master com ninguém que não precisa.

### Storage isolado

As fotos são armazenadas em pastas separadas:

```
storage/
├── tenants/
│   ├── silvaimoveis/
│   │   └── property-images/
│   └── jordaoleiloeiro/
│       └── property-images/
```

URLs de fotos incluem o tenant_id, então não dá pra acessar fotos de outro tenant mesmo que adivinhar o link.

---

## Parte 6 — Operação diária multi-tenant

### Adicionar tenant novo

~15 minutos:
1. CLI: `npm run tenant:create`
2. Enviar credenciais pro cliente (email com link mágico)
3. Cliente configura branding (ou você configura pra ele, se for parte do serviço)
4. Cliente adiciona propriedades

### Desativar tenant

Quando um cliente cancela:

```bash
npm run tenant:deactivate -- --slug="silvaimoveis"
```

Isso:
- Marca o tenant como inativo
- Subdomínio responde com "Este site está temporariamente fora do ar"
- Admin não consegue logar
- Dados permanecem no banco (pra reativação rápida se cliente voltar)

**Pra DELETAR permanentemente** (após garantir que cliente não vai voltar):

```bash
npm run tenant:delete -- --slug="silvaimoveis" --confirm
```

Apaga tudo: dados, fotos, registros. Não reversível. Sempre faça backup antes.

### Backup por tenant

Backup de todos os tenants de uma vez:

```bash
npm run db:backup
```

Backup de um tenant específico:

```bash
npm run tenant:backup -- --slug="silvaimoveis"
```

Útil se um cliente pede os dados dele.

### Migrar tenant pra outra instância

Cliente cresceu e quer a própria instalação (single-tenant)?

```bash
npm run tenant:export -- --slug="silvaimoveis" --output="./silvaimoveis-export.zip"
```

Gera um ZIP com todos os dados e fotos do tenant. Cliente instala o PropertyFlow dele e importa:

```bash
npm run tenant:import -- --file="./silvaimoveis-export.zip"
```

---

## Parte 7 — Performance e escala

### Quando multi-tenant fica lento

- Acima de **~100 tenants ativos**: dá pra começar a sentir algum impacto. Considera upgrade de Supabase
- Acima de **~10k propriedades totais somando todos os tenants**: precisa indexar melhor
- Tráfego **>100k visualizações/mês somando todos**: considera Pro plans

### Escalar banco de dados

Plano **Supabase Pro ($25/mês)** aguenta até:
- ~500 tenants
- ~50k propriedades
- ~1M visualizações/mês

Acima disso:
- Plano **Supabase Team ($599/mês)** ou **Enterprise** (custom)
- Considerar **particionar tabelas por tenant** (técnica avançada, documentada no Supabase)

### CDN de imagens

As fotos das propriedades acumulam rápido. Pra não estourar storage do Supabase:

- Ative **Cloudflare R2** ou **AWS S3** como storage bucket
- PropertyFlow suporta esses no `.env`:
  ```
  STORAGE_PROVIDER=r2
  R2_ACCESS_KEY=...
  R2_BUCKET=...
  ```

R2 custa $0.015/GB/mês (1/5 do S3 e sem egress fees).

---

## Parte 8 — Modo B: Multi-tenant por caminho

Se preferir `minhaplataforma.com.br/silvaimoveis` em vez de subdomínio:

Em `src/config/propertyflow.ts`:
```typescript
multiTenantMode: "path",
```

Não precisa configurar DNS wildcard. Todos os clientes ficam sob o domínio principal.

**Desvantagens vs subdomínio:**
- Cliente não pode usar domínio próprio (a não ser que você crie uma infra mais complexa)
- URLs ficam menos "dedicadas"
- SEO um pouco mais complicado (Google vê tudo como um site só, não como múltiplos sites)

**Vantagens:**
- Sem DNS wildcard
- Um único SSL/HTTPS
- Deploy mais simples

---

## Parte 9 — Problemas comuns

### "Tenant not found" quando acesso subdomínio
- Confere que o tenant existe: `npm run tenant:list`
- Confere que o subdomínio bate com o `slug` do tenant
- Confere DNS wildcard: `dig *.minhaplataforma.com.br` deve retornar IP

### Dados de um tenant apareceram em outro
**CRÍTICO** — isso não deveria acontecer. Se acontece:
1. **Para o site imediatamente** (Vercel → Settings → Pause deployment)
2. **Backup o banco** (pra investigar depois)
3. **Email urgente pra support@volynx.world** com detalhes do que viu
4. NÃO tenta consertar sozinho — pode piorar

### Performance caiu depois de adicionar muitos tenants
- Confere Supabase → Database → Performance → queries lentas
- Upgrade pra plano Pro se está no free tier
- Adiciona índices: `npm run db:add-indexes`

### Cliente quer customizar MUITO (design diferente total)
Multi-tenant é bom pra customização de conteúdo/branding. Se cliente quer design radicalmente diferente:
- Considera uma instalação dedicada single-tenant pra ele
- Ou um "theme" customizado (tecnicamente complexo, precisa de dev)

### Domínio próprio do cliente não funciona
- Verifica que o cliente adicionou os DNS records corretos
- Usa https://www.whatsmydns.net pra testar propagação
- Se está na Vercel/Netlify, confirma que o domínio está listado e "Valid Configuration"

---

## Parte 10 — Exemplos reais de uso

### Exemplo A: Agência revendendo pra imobiliárias

Ana tem uma agência de marketing digital no Rio. Compra White-Label, configura multi-tenant, e oferece "site premium de imobiliária" como serviço recorrente:

- Cliente paga R$ 500/mês pra Ana
- Ana configura `silvaimoveis.anaimoveispro.com.br` em 30 min
- Ana gerencia backup, updates, problemas — cliente só opera o painel
- Ana tem 20 clientes = R$ 10k/mês recorrente, operação leve

### Exemplo B: Grupo com várias bandeiras

O grupo Maranhão tem 3 marcas: Maranhão Imóveis (residencial), Maranhão Commercial (comercial), Maranhão Farms (rural):
- Um único PropertyFlow multi-tenant
- 3 subdomínios, 3 marcas distintas
- Admin central vê tudo, admins de cada bandeira só veem o seu
- Economiza operação vs 3 instalações separadas

### Exemplo C: Marketplace/portal regional

`imoveisrio.com.br` é um portal que agrega várias imobiliárias cariocas:
- Multi-tenant modo "path": `imoveisrio.com.br/silva`, `imoveisrio.com.br/jordao`, etc
- Homepage-mãe lista todas as imobiliárias participantes
- Cada imobiliária paga mensalidade pro portal
- Portal monetiza via anúncios destacados + lead sharing

---

## Próximos passos

- **Migrar dados de um sistema antigo** pros tenants: [MIGRATION_TOOLKIT.md](MIGRATION_TOOLKIT.md)
- **Configurar integrações de CRM** por tenant: [INTEGRATIONS.md](INTEGRATIONS.md)
- **Remover atribuição Volynx** pra apresentar como teu produto: [WHITE_LABEL.md](WHITE_LABEL.md)

Multi-tenant é poderoso mas tem suas idiossincrasias. Se ficar em dúvida, o suporte prioritário do White-Label (support@volynx.world) responde em 24h úteis.
