# VOLYNX Cloud Console — Auditoria inicial

Data: 2026-09-28
Área: Codex — system architecture, data, security and integrations

Atualização após a primeira entrega: a revisão estática inicial abaixo foi complementada por execução em PostgreSQL descartável, hardening de permissões e conciliação com Muse. Ver `CLOUD-CONSOLE-VALIDATION.md` e `CLOUD-CONSOLE-MUSE-HANDOFF.md`. O schema remoto continua não verificado.

## Owned area

- `/supabase/migrations/*cloud_console*`
- `/contracts/cloud-console.ts`
- `/contracts/cloud-console-v1.ts`, `apps/volynx-os/server/cloud-console/**` e testes focalizados
- documentação de arquitetura, decisões, provedores e contratos
- APIs, autorização, persistência e integrações do Console

Muse permanece proprietário de UI, layout, componentes visuais, tokens, navegação visual e client-facing views. Nenhum arquivo de UI é alterado nesta etapa.

## Estado verificado

- Checkout correto: `/Users/eduardovolkenair/VOLYNX`.
- Branch principal atual: `main`, commit `5777a8a6`.
- Alterações preexistentes preservadas: `src/pages/builder/index.astro`, `supabase/functions/_shared/ai-provider.ts`, `supabase/functions/ai-builder/index.ts`, `supabase/migrations/202609250001_addon_entitlements_contract.sql`, `docs/ai-builder-openai-pilot.md`, `scripts/check-ai-builder-provider.mjs` e `supabase/functions/_shared/builder-data.ts`.
- Nenhum banco vivo, credencial, provider externo, deploy, webhook, migração remota ou status operacional foi validado.
- Nenhum worktree/artifact estava anexado à conversa; a implementação foi isolada em `codex/cloud-console-core`.

## Mapa atual

### Runtime e fronteiras

| Área | Evidência | Consequência |
| --- | --- | --- |
| Site público | Astro 5, `output: static`, Cloudflare Pages | Não assumir APIs server-side dentro das páginas Astro. |
| Workspace operacional | `apps/volynx-os`, Next 14.2, React 18, TypeScript, Vitest | É o destino natural para o Console operacional, mas a UI continua fora desta etapa. |
| Dados e autenticação | Supabase Auth/Postgres/Storage, migrations existentes | RLS e funções SQL são a primeira barreira; endpoints também precisam validar sessão e escopo. |
| API existente | Supabase Edge Functions e Express legado de checkout | O Console não deve crescer dentro do shim de checkout. |
| Workers | `cloudflare/propertyflow-router` em `*.volynx.world/*`; `qr-resolver` em `qr.volynx.world/*` | Domínios/rotas do Console ainda não estão definidos e não podem colidir com esses Workers. |

### Fundação existente que será preservada

`202605240001_volynx_os_core.sql` já define `organizations`, `organization_members`, `sites`, conteúdo, integrações, media, snapshots e helpers `is_org_member`/`has_org_role`. Essa fundação é adequada para Builder/publicação, mas seus papéis `owner/admin/editor/viewer/member` não expressam os papéis de operação do Cloud Console.

`src/lib/volynx-os-core.ts` é renderer/conversor de snapshots e contém demo; não é fonte de estado operacional.

`supabase/functions/_shared/edge-security.ts` autentica JWT, restringe origins e valida payload, mas não autoriza tenant/cliente/produto por si só.

## Riscos encontrados

1. Misturar dados de conteúdo com dados operacionais faria `site` parecer um produto gerenciado sem representar ambiente, provider, deployment ou fonte do health status.
2. Reutilizar `organization_members.role` para `Volynx Operator` criaria ambiguidade e poderia ampliar privilégios no Builder.
3. Um status positivo sem `source` e `checkedAt` violaria o protocolo de não fabricar saúde, backup ou segurança.
4. A ausência de banco vivo e de credenciais impede declarar integrações Cloudflare/Supabase/GitHub como conectadas.
5. O runtime Astro é estático; rotas do Console precisam permanecer em Next/Edge Functions/API compatível com a infraestrutura real.
6. `published_snapshots` é público quando o site está publicado; não deve ser usado para expor dados operacionais.
7. Backups do repositório, Storage e banco têm capacidades diferentes; não podem ser agregados em um único badge.

## Arquitetura proposta

```text
Console UI (Muse)
        |
Versioned Console API / server actions (Codex)
        |
Authorization boundary: session + platform/client scope + role
        |
Supabase Postgres (cloud_* operational model, RLS, audit)
        |
Provider adapters: Cloudflare | Supabase | GitHub | future providers
```

O domínio operacional usa `cloud_*` para deixar explícito que não é uma extensão implícita do Builder. Cada linha operacional mantém `platform_organization_id` ou chega a ele através de `client_id`/`product_id`, permitindo políticas e índices tenant-scoped.

## Modelo de tenant e autorização

- `organizations`: fundação já existente; representa o tenant/plataforma raiz quando aplicável.
- `cloud_clients`: clientes dentro da organização operacional.
- `cloud_products`: produto gerenciado, com `volynx_id` imutável no formato `VLX-[CLIENT]-[NUMBER]`.
- `cloud_environments`: `production`, `staging` ou outro ambiente explicitamente cadastrado.
- `cloud_console_members`: papel de plataforma `volynx_admin` ou `volynx_operator`.
- `cloud_client_members`: papel de cliente `client_admin` ou `client_viewer`.

RLS usa helpers `cloud_can_access_*` como barreira de dados. O backend deve repetir a decisão para operações sensíveis e registrar o resultado no audit log. A UI nunca é uma autoridade.

## Modelo inicial

O primeiro migration desta etapa cria:

- clients, products e environments;
- resources e deployments;
- monitoring checks/results;
- backup capabilities/runs;
- incidents;
- care plans e support requests;
- integrations metadata-only;
- audit events append-oriented.

Nenhuma tabela armazena secret plaintext. `secret_ref` é somente referência a um gestor externo ainda não conectado.

## Providers

O contrato comum deve retornar dados normalizados com `source`, `checkedAt`, `status`, `stale` e erro explícito. Adapters concretos não são criados antes de confirmar credenciais, escopos, limites, domínio e fluxo de refresh.

- Cloudflare: domains, SSL, Pages/Workers e observabilidade quando a conta permitir.
- Supabase: database, Storage, Auth e disponibilidade/configuração quando tecnicamente consultável.
- GitHub: repository metadata e relação commit/deploy; não é backup por definição.

## Contratos e status

`/contracts/cloud-console.ts` mantém a definição inicial e os enums. `/contracts/cloud-console-v1.ts` propõe os DTOs alinhados à entrega 01 do Muse. Estados válidos: `operational`, `degraded`, `incident`, `maintenance`, `unknown`, `not_configured`.

`unknown` significa que a fonte não confirmou estado. `not_configured` significa que não há integração/capacidade configurada. Ambos são diferentes de `operational`.

## Migração

1. Não alterar a migration histórica do Builder.
2. Criar migration aditiva para o domínio `cloud_*`; migrations Supabase são aplicadas uma vez e não devem ser reexecutadas manualmente.
3. Cadastrar Volynx como primeiro `cloud_client`/produto apenas em uma etapa explícita de seed, quando o identificador e owner forem confirmados; não inserir dados fictícios agora.
4. Integrar adapters somente depois de validar ambiente e credenciais.
5. Migrar ou mapear produtos existentes apenas com uma tabela de correspondência revisada; nunca por nome aproximado.

## Estratégia de testes

- SQL: constraints, papéis, RLS cross-tenant, acesso client admin/viewer e ausência de acesso anônimo.
- API: sessão ausente/expirada, escopo inexistente, provider indisponível, timeout, resposta malformada e idempotência.
- Domínio: status sem fonte não pode ser `operational`; dados stale carregam timestamp e flag.
- Operação: audit event para mudança de papel, integração, deployment, restore e alteração de acesso.
- UI futura: loading, empty, error, permission denied, responsive e acessibilidade; a UI não pode transformar `unknown` em verde.

## Não comprovado nesta auditoria

Não há prova de schema remoto aplicado, dados operacionais reais, conectividade Cloudflare/GitHub, backups existentes, SSL real, uptime, webhook, deployment ou recovery. Qualquer tela futura deve exibir `Not configured`/`Data source pending` até essas fontes serem ligadas e verificadas.
