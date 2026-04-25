# PropertyFlow — Integrações com CRM (White-Label)

Conectar leads do PropertyFlow direto no **HubSpot, Pipedrive ou Salesforce** — os 3 CRMs mais usados por imobiliárias. Suporte nativo, configuração em 10-20 minutos cada.

**Disponível apenas no White-Label.** Tiers menores podem integrar manualmente via webhook genérico (explicado no final).

---

## Por que integrar

Quando um lead chega via formulário, você quer:

1. **Ele no PropertyFlow** (pra ver histórico, notas, responder)
2. **No seu CRM** (pra automação de pipeline, sequência de emails, score de lead, distribuição pra corretores)

Sem integração, alguém da equipe copia e cola. Com integração, o lead aparece nos dois lugares automaticamente, no mesmo segundo.

---

## Parte 1 — HubSpot

### 1.1 Criar app privada no HubSpot

1. Login no **HubSpot** → canto superior direito (ícone engrenagem) → **"Configurações"**
2. No menu esquerdo: **Integrações** → **Apps privadas**
3. Clica **"Criar uma app privada"**
4. Nome: `PropertyFlow Integration`
5. **Escopos necessários:**
   - `crm.objects.contacts.write` (criar contatos)
   - `crm.objects.deals.write` (opcional, se quer criar deals também)
   - `crm.objects.companies.write` (opcional)
6. Clica **"Criar app"**
7. Na próxima tela, **copia o token** (começa com `pat-...`)
8. **Guarda esse token em lugar seguro** — não dá pra ver de novo depois

### 1.2 Configurar no PropertyFlow

Duas formas. Pelo painel é mais fácil.

**Via painel master:**
1. Vai em `master.minhaplataforma.com.br` (ou `master` path)
2. Tenant → seu tenant → aba **"Integrações"**
3. Clica **"Conectar HubSpot"**
4. Cola o token
5. Configura mapeamentos (próximo passo)

**Via `.env.local`:**
```
HUBSPOT_ENABLED=true
HUBSPOT_TOKEN=pat-na1-...
HUBSPOT_DEFAULT_OWNER_ID=12345  # opcional: ID do owner padrão
```

### 1.3 Mapeamento de campos

Decide o que vai pro HubSpot quando um lead chega:

| Campo PropertyFlow | Campo HubSpot | Obrigatório? |
|---|---|---|
| `name` | `firstname` + `lastname` (separados) | Sim |
| `email` | `email` | Sim |
| `phone` | `phone` | Não |
| `message` | `hs_content_membership_notes` ou custom `message` | Não |
| `property.title` | custom property `property_of_interest` | Não |
| `property.price` | custom property `property_price` | Não |
| `source` | `hs_lead_status` = `NEW` | Sim (já default) |

**Criar custom properties no HubSpot (uma vez só):**

1. Configurações → Objetos → Contatos → Propriedades
2. Cria: `property_of_interest` (texto curto), `property_price` (número), `property_url` (URL)

### 1.4 Criar deal automaticamente (opcional)

Se quer que cada lead também crie um **Deal** (oportunidade) no HubSpot:

No painel → Integração HubSpot → toggle **"Criar Deal"**

O Deal vai ter:
- **Nome:** `[Nome do Lead] - [Propriedade de interesse]`
- **Pipeline:** `default` (você pode mudar)
- **Stage:** `appointmentscheduled` ou `qualifiedtobuy`
- **Amount:** preço da propriedade de interesse
- **Contact:** o lead recém-criado

### 1.5 Testar

1. Vai no site público, submete o formulário de contato de uma propriedade
2. Vai no HubSpot → Contatos → procura pelo email que usou
3. Deve aparecer em < 30 segundos

Se não aparece:
- Confere HubSpot → Settings → Integrations → Private Apps → tua app → "Activity Log" — vê se chegou o request
- Se chegou mas errou, vê o erro. Geralmente é falta de escopo ou campo custom não criado.
- No PropertyFlow painel → Logs → filtra por `hubspot` — vê o erro do lado nosso

---

## Parte 2 — Pipedrive

### 2.1 Gerar API token

1. Pipedrive → canto superior direito (avatar) → **Company settings**
2. Menu esquerdo: **Personal preferences** → **API**
3. Copia o **API token** (string longa alfanumérica)

**Alternativa:** criar uma **App** no Pipedrive Marketplace e usar OAuth. Mais complexo, só vale se você vai distribuir a integração pra vários clientes.

### 2.2 Pegar Company Domain

No topo do Pipedrive, o URL é `https://SUAEMPRESA.pipedrive.com/...`. Copia o `SUAEMPRESA` — é o `company_domain`.

### 2.3 Configurar no PropertyFlow

```
PIPEDRIVE_ENABLED=true
PIPEDRIVE_TOKEN=3f7a8b9c...
PIPEDRIVE_COMPANY_DOMAIN=silvaimoveis
PIPEDRIVE_PIPELINE_ID=1  # opcional
PIPEDRIVE_STAGE_ID=5  # opcional
```

**Pra pegar Pipeline/Stage IDs:**
- Pipedrive → Deals → Settings (engrenagem) → Pipelines & Stages
- Cada pipeline e stage tem um número. Usa esse.

### 2.4 Como funciona

Quando um lead chega:

1. Cria uma **Person** (contato) no Pipedrive
2. Cria uma **Organization** (se cliente informou empresa)
3. Cria um **Deal** linkado à Person e à Org
4. Atribui ao owner configurado

**Mapeamento:**

| PropertyFlow | Pipedrive Person |
|---|---|
| `name` | `name` |
| `email` | `email` (array — Pipedrive aceita vários) |
| `phone` | `phone` |
| `message` | Note no Deal |
| `property.title` | Deal title |
| `property.price` | Deal value |

### 2.5 Notes no Deal

Além dos campos principais, o PropertyFlow cria uma Note no Deal com:

```
Lead originado de PropertyFlow

Propriedade de interesse: Apartamento Ipanema vista mar
Link: https://silvaimoveis.com.br/properties/apt-ipanema-001
Preço: R$ 2.500.000

Mensagem original do cliente:
"Gostaria de agendar visita no próximo sábado, de preferência pela manhã."

Dados adicionais:
- IP: 187.x.x.x
- Browser: Chrome Mobile / iOS
- Referrer: instagram.com
```

### 2.6 Testar

Mesma lógica do HubSpot: submete formulário, confere no Pipedrive. Vai aparecer em **Contacts** e **Deals**.

---

## Parte 3 — Salesforce

Salesforce é mais complexo que os outros dois. Se sua empresa já usa Salesforce seriamente, tem alta chance de já ter um admin interno que faz isso de olhos fechados. Se não tem, **considera HubSpot ou Pipedrive em vez de Salesforce** — são 10x mais simples pra imobiliária.

### 3.1 Criar Connected App

1. Salesforce → Setup (engrenagem no canto superior direito) → **App Manager**
2. Clica **"New Connected App"**
3. Preenche:
   - **Connected App Name:** `PropertyFlow Integration`
   - **API Name:** automático
   - **Contact Email:** seu email
4. Em **"API (Enable OAuth Settings)"**:
   - Marca **"Enable OAuth Settings"**
   - **Callback URL:** `https://suaplataforma.com.br/api/salesforce/callback`
   - **Selected OAuth Scopes:** `Full access (full)` ou mais granular `Manage user data via APIs (api)`
5. Salva. Espera ~10 minutos pra Salesforce propagar.

### 3.2 Pegar Consumer Key e Secret

Depois que propagou:

1. Setup → App Manager → tua app → **"View"**
2. **Consumer Key** e **Consumer Secret** estão lá.

### 3.3 Configurar no PropertyFlow

```
SALESFORCE_ENABLED=true
SALESFORCE_CLIENT_ID=3MVG9fe4g9fhX0E...
SALESFORCE_CLIENT_SECRET=1234567890123
SALESFORCE_USERNAME=seu-email@suaempresa.com
SALESFORCE_PASSWORD=suasenha + security_token  # sim, concatenado
SALESFORCE_LOGIN_URL=https://login.salesforce.com  # ou https://test.salesforce.com pra sandbox
```

**Security Token:** Salesforce manda por email quando você cria conta. Se perdeu, Settings → My Personal Information → Reset My Security Token.

### 3.4 Objetos que são criados

Quando lead chega:

- Cria um **Lead** (objeto padrão de Salesforce)
- Custom fields se configurados: `Property_of_Interest__c`, `Property_Price__c`, `Property_URL__c`

### 3.5 Web-to-Lead (alternativa mais simples)

Se Connected App é muito complexo, Salesforce tem um fluxo chamado **Web-to-Lead** que é basicamente um formulário HTML que posta dados direto no Salesforce.

1. Setup → procura "Web-to-Lead"
2. **"Edit"** → ativa
3. **"Generate Web-to-Lead Form"**
4. Salesforce gera um HTML com action pra seu org
5. Copia o campo `oid` (Organization ID)

No PropertyFlow:
```
SALESFORCE_WEB_TO_LEAD_OID=00Dxx0000000ABC
```

Modo web-to-lead é mais simples mas tem limitações (sem OAuth, sem custom objects, lead só).

### 3.6 Testar

Mesmo fluxo. Submete, vê em **Leads** no Salesforce.

Logs: **Setup → Logs → Debug Logs** — configura pra capturar.

---

## Parte 4 — Webhook genérico (qualquer CRM ou ferramenta)

Se usa um CRM que não está na lista (Kommo, RD Station, Bitrix, Zoho, etc.), todo CRM moderno aceita **webhooks**.

### 4.1 Como funciona

Toda vez que um lead chega, o PropertyFlow faz um POST HTTP pro URL que você configurou, com o JSON do lead.

### 4.2 Configurar

```
WEBHOOK_URL=https://seu-crm.com/api/webhook/propertyflow
WEBHOOK_SECRET=umaStringLongaAleatoriaParaAssinar  # opcional mas recomendado
WEBHOOK_HEADERS={"Authorization": "Bearer xxx"}  # opcional, JSON stringified
```

### 4.3 Payload que o PropertyFlow manda

```json
{
  "event": "lead.created",
  "timestamp": "2026-04-22T14:32:15Z",
  "tenant": "silvaimoveis",
  "lead": {
    "id": "lead_abc123",
    "name": "Maria Silva",
    "email": "maria@example.com",
    "phone": "+5521999999999",
    "message": "Gostaria de agendar visita",
    "source": "property_contact_form"
  },
  "property": {
    "id": "prop_xyz456",
    "slug": "apt-ipanema-001",
    "title": "Apartamento vista mar Ipanema",
    "price": 2500000,
    "currency": "BRL",
    "url": "https://silvaimoveis.com.br/properties/apt-ipanema-001",
    "neighborhood": "Ipanema",
    "city": "Rio de Janeiro",
    "bedrooms": 3,
    "type": "apartment"
  },
  "meta": {
    "ip": "187.x.x.x",
    "user_agent": "Mozilla/5.0...",
    "referrer": "https://instagram.com"
  }
}
```

### 4.4 Assinatura de segurança

Se configurar `WEBHOOK_SECRET`, cada request vem com um header:

```
X-PropertyFlow-Signature: sha256=abc123...
```

Calculado como: `HMAC-SHA256(body, secret)`. Seu endpoint valida pra garantir que o request veio de verdade do PropertyFlow, não de alguém tentando injetar leads falsos.

Exemplo em Node.js:

```javascript
const crypto = require('crypto');

function verifySignature(req, secret) {
  const signature = req.headers['x-propertyflow-signature'];
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return signature === expected;
}
```

Em PHP:
```php
$signature = $_SERVER['HTTP_X_PROPERTYFLOW_SIGNATURE'];
$expected = 'sha256=' . hash_hmac('sha256', file_get_contents('php://input'), $secret);
if (!hash_equals($signature, $expected)) { http_response_code(401); exit; }
```

### 4.5 Retry automático

Se teu endpoint retorna status 5xx (erro de servidor) ou timeout, o PropertyFlow re-tenta em **1min, 5min, 30min, 2h, 12h**. Depois disso desiste e loga como falha. Você consegue ver esses retries no painel admin → Logs → Webhooks.

**Se retorna 4xx (erro de cliente, tipo 400 ou 401), NÃO re-tenta** — assumindo que o erro vai se repetir.

### 4.6 Testar

Serviços pra testar webhook sem ter código real:
- **webhook.site** — te dá um URL temporário, mostra tudo que chega
- **requestbin.com** — mesma coisa

Coloca o URL do webhook.site em `WEBHOOK_URL`, submete um lead de teste, vê o payload chegar. Quando estiver satisfeito, troca pro URL real do teu CRM.

---

## Parte 5 — Integrações específicas de Brasil

### RD Station Marketing

RD Station é dos CRMs mais usados no Brasil. Não tem integração nativa no PropertyFlow mas:

1. RD Station tem um endpoint padrão de "Conversões" via API REST
2. Configura via webhook genérico apontando pra:
   ```
   WEBHOOK_URL=https://api.rd.services/platform/conversions?api_key=SUA_API_KEY
   ```
3. Adapta o payload (RD Station tem seu formato próprio)

**Formato que RD Station quer:**
```json
{
  "event_type": "CONVERSION",
  "event_family": "CDP",
  "payload": {
    "conversion_identifier": "Formulário PropertyFlow",
    "name": "Maria Silva",
    "email": "maria@example.com",
    "cf_property_interest": "apt-ipanema-001"
  }
}
```

Tem um transformer em `src/integrations/rdstation.ts` já pronto. Configura:

```
RD_STATION_ENABLED=true
RD_STATION_API_KEY=...
RD_STATION_CONVERSION_IDENTIFIER="Formulário PropertyFlow"
```

### Kommo (antiga amoCRM)

Kommo tem webhook nativo. Configura lá:

1. Kommo → Configurações → Integrações → **"Adicionar integração"**
2. Procura "Webhook" → ativa
3. URL: `https://TUA_CONTA.kommo.com/api/v4/leads`
4. No PropertyFlow, webhook genérico apontando pra esse URL

Kommo tem campos customizáveis (você cria no Kommo, usa o ID do campo no payload). Documentação deles é excelente.

### Bitrix24

Bitrix tem um "Inbound webhook" (pra receber):

1. Bitrix → Developer resources → Other → Inbound Webhook
2. Dá escopo `CRM (crm)` → copia URL
3. PropertyFlow webhook:
   ```
   WEBHOOK_URL=https://suaconta.bitrix24.com.br/rest/1/abc123/crm.lead.add.json
   ```

---

## Parte 6 — Multi-tenant + integrações

Se está rodando multi-tenant (ver [MULTI_TENANT.md](MULTI_TENANT.md)), cada tenant pode ter sua própria integração.

**Tenant A (Silva Imóveis)** → HubSpot
**Tenant B (Jordão Leiloeiro)** → Pipedrive
**Tenant C (Grupo Maranhão)** → webhook próprio pro CRM interno deles

### Como configurar

No painel master → Tenant → aba **Integrações** → configura o CRM daquele tenant específico.

Os tokens e credenciais ficam separados por tenant. Zero risco de um lead de um cliente ir parar no CRM de outro.

### Cobrança por integração (se você revende)

Se você vende planos pros teus clientes de agência:
- **Plano Básico:** só webhook genérico
- **Plano Pro:** HubSpot ou Pipedrive
- **Plano Enterprise:** qualquer integração + Salesforce

Feature flag por tenant controla o que está disponível. Ver [MULTI_TENANT.md](MULTI_TENANT.md) Parte 4.3.

---

## Parte 7 — Problemas comuns

### Lead chegou no PropertyFlow mas não apareceu no CRM
1. Vai em **Logs → Integrations** no painel admin
2. Procura pelo ID do lead e o CRM configurado
3. Vê o status: pending / success / failed
4. Se failed, vê o erro. 95% é autenticação (token expirado, permissão ausente)

### Token expirou e não percebi
- Tokens HubSpot Private Apps não expiram (se não forem revogados)
- Tokens Pipedrive também não expiram
- Salesforce password changes invalidam o security token — **sempre que mudar senha, pega security token novo**
- Configura um **alerta de falha** no painel admin → Logs → **"Email me on integration failure"**

### "Duplicate contact" ao criar no CRM
- HubSpot e Pipedrive deduplicam por email automaticamente (atualizam em vez de criar duplicado). Bom.
- Salesforce não deduplica por padrão — leads duplicados acumulam
- **Fix pra Salesforce:** configura Duplicate Rules no Salesforce (Setup → Duplicate Rules) pra merge automático

### Webhook responde 200 mas lead não aparece no CRM
- 200 = "recebi" mas não garante que processou. Logs do teu CRM vão dizer o que aconteceu.
- Se você usa serviço intermediário (Zapier, Make.com, n8n), olha lá se o fluxo disparou

### Campo customizado não está sendo preenchido
- O campo custom precisa existir **no CRM primeiro**, antes de você configurar no PropertyFlow
- Nome do campo tem que bater EXATAMENTE (HubSpot é case-sensitive, Salesforce exige sufixo `__c`)

### Recebendo leads duplicados
- Alguém pode estar submetendo múltiplas vezes. PropertyFlow loga todos.
- Se quer dedupe por email do lado nosso: painel admin → Settings → Leads → toggle **"Deduplicate by email within 24h"**

---

## Parte 8 — Boas práticas

1. **Sempre testa em sandbox primeiro.** HubSpot e Pipedrive têm conta de teste gratuita. Salesforce tem Developer Edition gratuita.
2. **Configure alertas de falha.** Integração silenciosamente parando é o pior cenário — leads entram no PropertyFlow mas ninguém no CRM vê. Configure email de alerta em Logs → Integrations.
3. **Revise mensalmente os logs.** Uma vez por mês vê se tem muitas falhas. 1-2% de falha é normal. Acima disso investiga.
4. **Documente seu mapeamento de campos.** Guarda num doc interno qual campo do formulário vai pra qual campo do CRM. Se trocar de CRM um dia, facilita.
5. **Teste cada integração DEPOIS de cada update do PropertyFlow.** Às vezes uma mudança quebra mapeamento sem a gente perceber.

---

## Recap

| Integração | Dificuldade | Tempo setup | Recomendação |
|---|---|---|---|
| Webhook genérico | Fácil (se sabe programar um pouco) | 30 min | Se tem CRM esotérico |
| HubSpot | Fácil | 15 min | **Recomendado pra maioria** |
| Pipedrive | Fácil | 15 min | Ótimo pra pipeline de venda |
| Salesforce (Web-to-Lead) | Médio | 45 min | Se cliente já usa SF |
| Salesforce (Connected App) | Difícil | 2h | Só se precisa muito poder |

Se na dúvida: **HubSpot Free tier** faz 99% do trabalho pra imobiliária, é grátis até 1k contatos, e tem integração simples. Comece por aí.

---

## Precisou de ajuda?

- Canal Discord do White-Label (link no email de delivery)
- **support@volynx.world** com o CRM e o erro. Priority queue: 24h úteis.

**O que incluir no email:**
- CRM usado + plano
- Log do erro (Logs → Integrations no painel)
- Payload de exemplo que deveria ter funcionado

Próximo doc: [WHITE_LABEL.md](WHITE_LABEL.md) pra tirar a marca Volynx e apresentar como teu produto.
