# Cloud Console — API de leitura V1

## Área e fronteira

OWNED AREA: Codex, arquitetura de dados/autorização/API. FILES TOUCHED nesta etapa da API: `apps/volynx-os/app/api/cloud/v1/overview/route.ts`, `apps/volynx-os/server/cloud-console/overview.ts`, `supabase-source.ts`, `overview.test.ts`, `apps/volynx-os/vitest.config.ts` e `contracts/cloud-console-v1.ts`. DEPENDENCIES: Supabase Auth + PostgREST, migration Cloud Console, Next 14. EXPECTED OUTPUT: Overview de leitura com contexto autorizado, projeção segura e estados explícitos. A UI foi integrada em etapa posterior na mesma branch; ver `CLOUD-CONSOLE-VALIDATION.md`.

## Endpoint

`GET /api/cloud/v1/overview?productId=<UUID>&environmentId=<UUID>`

### Catálogo para navegação

`GET /api/cloud/v1/catalog` usa o mesmo header `Authorization: Bearer <Supabase access token>`, valida a sessão via Auth e consulta clientes/produtos/ambientes com o JWT do usuário sujeito a RLS. Retorna `CatalogResponse`, com `CloudCatalog.entries` contendo somente IDs e nomes autorizados para navegação. Não concede acesso pelo simples fato de um ID aparecer na URL: cada Overview é verificada novamente pelo servidor. A V1 limita cada conjunto a menos de 100 linhas e retorna erro explícito se o limite for alcançado, sem truncar silenciosamente. Paginação fica pendente antes de escala maior.

A UI portada do Muse usa esse catálogo em `/console`, preserva os oito estados de módulo, e lê `ApiResponse<CloudOverview>` nas rotas de produto/ambiente. `/console/preview` continua uma galeria pública, com dados explicitamente fictícios e sem ligação à API. O formulário de suporte e as operações destrutivas seguem desabilitados. O login da UI usa o fluxo de e-mail/senha de uma conta Supabase existente; a configuração e a disponibilidade real desse método no ambiente alvo ainda precisam ser verificadas.

Header: `Authorization: Bearer <Supabase access token>`. Não aceita token em query string. A rota roda em Next Node, usa `dynamic='force-dynamic'`, desabilita cache e devolve `private, no-store` com `Vary: Authorization`. Nenhuma service key é usada. `getUser(token)` consulta o Auth server para validar a sessão; as consultas seguintes usam o próprio JWT e continuam sujeitas a RLS. O request filtra explicitamente produto, organização e ambiente, além das políticas do banco.

O contrato de resposta é `ApiResponse<CloudOverview>` de `contracts/cloud-console-v1.ts`, versão `1.0`, com `referenceId` e timestamp UTC em sucesso e falha.

### Estado da resposta

| Campo | Comportamento atual |
| --- | --- |
| `identity`, `environment`, `context.role` | Reais quando o produto, ambiente e papel são verificáveis na sessão. UUID é a chave; `vlxId` é identidade pública imutável. |
| `resources`, `deployments`, `backups`, `incidents`, `care` | Leitura limitada da migration Cloud. Retorna `ready` para registros válidos, `pending` para nenhum registro e `error` isolado para falha/má formação. Incidentes do produto inteiro aparecem junto dos ligados ao ambiente. |
| `health`, `domain`, `security` | `pending` até existir coleta/adapter com fonte, timestamp e evidência. A API não agrega status positivo. |

`pending` em Incidents quer dizer “nenhum registro disponível neste banco”, e não ausência comprovada de incidentes. `ready` nos backups significa registro de capacidade, não que um restore possa ser disparado pelo cliente. A API não oferece mutações operacionais.

Campos ainda sem fonte conservam `null`: nome do recurso no cartão de backup, benefícios do Care e updates da timeline do incidente. A UI deve apresentá-los como dados pendentes, não como listas comprovadamente vazias.

### Projeção de dados

O papel é resolvido no servidor após a leitura sob RLS: plataforma (`volynx_admin`, `volynx_operator`) ou cliente (`client_admin`, `client_viewer`). O commit SHA aparece só na projeção de plataforma. Referência de secret, URL de repositório, JSON bruto de provider, metadata e mensagens técnicas de falha não são selecionados nem retornados. O cliente recebe erro de deploy com referência estável e texto seguro. O papel no response serve para apresentação; decisões futuras de escrita precisam verificar o papel novamente no servidor.

### Falhas

- `400 invalid_request`: IDs ausentes ou inválidos.
- `401 invalid_session`: token ausente, malformado, inválido ou expirado.
- `404 not_found`: produto ou ambiente ausente/inacessível; a resposta não distingue outro tenant de ID inexistente.
- `503 not_configured`: ambiente Supabase da API não configurado.
- `503 database_unavailable`/`malformed_response`: contexto essencial não pode ser verificado.
- Falha em um módulo não derruba identidade nem outros módulos: aquele módulo vira `error` com `referenceId`, timestamp, motivo seguro e retryable somente quando faz sentido.

Cada chamada a Supabase usa limite de 8 segundos e `cache: no-store`. A API não repete automaticamente uma leitura falha; retry poderá ser acionado pelo cliente. O provider não é consultado diretamente por esta rota, então “provider offline” permanece representado pelo estado persistido ou `pending` até haver adapter.

## Validação executada

- Testes de Overview: sessão inválida/expirada, IDs inválidos, indisponibilidade de Auth/DB, produto fora do escopo, projeção client/operator, falha parcial, payload malformado e sanitização de fonte.
- 22/22 testes do workspace passaram (12 Overview + 3 do adapter Supabase + 7 Daily).
- Após a integração visual, 28/28 testes do workspace passaram, incluindo 6 novos cenários do catálogo. TypeScript, lint focalizado e build Next 14 com as rotas do Console passaram. A tela foi inspecionada em localhost e 390 px na galeria de estados; sem erros de navegador. Esta evidência não substitui login e navegação autenticados contra staging.
- O adapter foi testado com respostas HTTP simuladas para verificar JWT, filtros, ausência de cache e distinção entre token inválido e Auth indisponível. Isso não representa uma sessão real de staging.
- TypeScript e lint focalizado passaram. Build Next 14.2.35 passou com `/api/cloud/v1/overview` dinâmica.
- Requisição HTTP local sem token retornou `401 invalid_session`, `private, no-store`, referência e timestamp.
- Os 66 testes anteriores de schema/observação continuam como baseline; a migration não foi modificada nesta etapa.

## Próximos limites

O endpoint ainda não foi executado contra Supabase Auth/PostgREST real com usuário Cloud Console cadastrado, porque a migration não foi aplicada remotamente nem houve bootstrap do primeiro admin/produto. Também não há deploy deste workspace. Um teste com token real em staging deve conferir role, RLS, colunas projetadas, suspensão/revogação e respostas de banco indisponível antes de qualquer tela se apoiar neste endpoint como dado vivo.

Docs oficiais verificadas: [Supabase Auth getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [Supabase filters](https://supabase.com/docs/reference/javascript/using-filters), [Next 14 Route Handlers](https://nextjs.org/docs/14/app/building-your-application/routing/route-handlers).
