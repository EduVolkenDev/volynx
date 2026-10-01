# Cloud Console — validação descartável

Data: 2026-09-28. Branch: `codex/cloud-console-core`. Base inicial: `5777a8a6`; atualizada por fast-forward para `de9d2b63` antes do PR.

## Fechamento da validação local — 2026-09-29

O banco descartável foi executado novamente sem usar os projetos locais VOLYNX/PDU: **66/66** testes PostgreSQL/RLS e observações passaram. A suíte da aplicação passou com **29/29** testes normais; os quatro testes opt-in de Auth foram executados separadamente contra uma instância Supabase temporária com portas próprias e passaram **4/4**. O fluxo cobriu login por senha, JWT real, catálogo por tenant, Overview fora do escopo, leitura direta pela Data API com `commit_sha` negado e revogação efetiva na leitura seguinte. `tsc --noEmit`, lint da aplicação, build Next 14 completo (incluindo as rotas do Console) e `git diff --check` também passaram. A migration criou as 16 tabelas `cloud_*` nessa instância; ao final, seus contêineres e volumes foram removidos. Nenhum recurso hospedado novo ou dado de produção foi criado por estes testes.

Este fechamento comprova o caminho Auth/PostgREST **local**, não o login no VolynxCore hospedado, a UI autenticada em navegador, as integrações de providers, backup/restore real ou o deploy de `apps/volynx-os`. As seções históricas abaixo descrevem o estado de cada execução no momento em que ocorreu; afirmações antigas de que a migration ainda não tinha sido aplicada remotamente não representam o estado atual.

Uma consulta somente de leitura ao histórico remoto confirmou `20260928235714` tanto local quanto remotamente. O banco remoto também registra `202609280001` (outra migration) e três versões posteriores ausentes deste checkout (`20260929010421`, `20260929010846`, `20260929140119`). Não executar `db push` a partir desta branch antes de reconciliar esse histórico; nenhuma dessas migrations foi alterada neste fechamento.

## Atualização remota — 2026-09-29

Com autorização de Eduardo, o SQL do working tree foi aplicado ao projeto Supabase VolynxCore (`zdmpzrderifgqmqivjoy`) como migration `20260928235714_cloud_console_core`. A versão original `202609280001` colidia com a migration já registrada `jhonatan_property_flow_white_label_baseline`; o nome local foi alinhado à versão gerada pelo Supabase sem alterar o SQL (SHA-256 `0c08e379c007bb2f63b65668f51cf07ce6336d1a0b3a357ced02fc40cc18a2ba`). A verificação remota listou as 16 tabelas `cloud_*`, todas com RLS habilitado. `anon` não possui SELECT/INSERT nessas tabelas nem EXECUTE nas oito funções `cloud_*`; clientes, produtos, membros do Console e eventos de auditoria permanecem com zero linhas. Nenhum dado de teste, tenant ou produto foi criado. Quatro helpers de autorização `cloud_*` são executáveis por `authenticated` intencionalmente para as políticas RLS e apareceram no advisor como funções SECURITY DEFINER; a checagem de chamadas reais com JWT continua pendente. Os relatos abaixo de "nenhuma migration remota" descrevem as validações locais anteriores a esta atualização; não comprovam ainda login/RLS autenticado no ambiente hospedado, integrações de providers, backup ou deploy da aplicação.

## Retomada: grant de deploy e projeção do commit

A revisão detectou que `commit_sha`, embora oculto na resposta para cliente, ainda estava concedido por coluna ao papel compartilhado `authenticated`; uma leitura direta pela Data API poderia contornar a projeção da rota. O grant foi removido da migration ainda inédita e a Overview deixou de selecionar esse campo para todos os papéis. Um futuro acesso exclusivo de operador precisará de uma fronteira própria no banco, não apenas da checagem de papel no Next. O teste SQL agora exige negação de leitura direta para cliente e operador. Validação local: 66/66 testes de banco descartável/observações, 28/28 testes da aplicação, TypeScript sem emissão e `git diff --check`. Nenhuma migration foi aplicada remotamente; esta execução não prova JWT/PostgREST real nem deploy.

## Validação com Auth e PostgREST locais

Uma instância Supabase separada foi inicializada em diretório temporário, com projeto/portas próprios; Core sem seed demonstrativo e migration Cloud Console foram aplicados somente ali. Quatro contas temporárias fizeram login real por e-mail/senha local, gerando JWTs usados pelo mesmo adapter de catálogo/Overview da aplicação. O primeiro teste revelou um defeito real: `cloud_clients` faltava à allowlist do adapter, então o catálogo retornava 503 apesar de Auth e RLS estarem corretos. A allowlist foi corrigida e ganhou regressão unitária.

Na repetição, **4/4 testes de integração passaram**: catálogo limitado a cada cliente e organização, Overview 404 para produto de outro cliente/organização, RLS na Data API direta com negação de `commit_sha`, e revogação de membro efetiva na próxima leitura com o mesmo JWT. O teste opt-in está em `apps/volynx-os/server/cloud-console/local-e2e.test.ts`; só aceita projeto temporário local identificado como Cloud Console. A stack foi desligada com descarte dos volumes após a execução. Nenhuma conta remota, migration hospedada ou dado de produção foi tocado. Isso comprova Auth/PostgREST local, **não** staging hospedado ou a interface autenticada em navegador.

## Atualização: integração da UI do Muse no monorepo

Com autorização posterior de Eduardo, a UI baseada no commit `1afffd8` foi portada para `apps/volynx-os/app/console/**`, `components/console/**` e `lib/console/**`. A galeria `/console/preview` permanece fictícia e rotulada. O Console operacional usa autenticação Supabase no navegador, catálogo por JWT/RLS (`GET /api/cloud/v1/catalog`) e Overview (`GET /api/cloud/v1/overview`). URLs carregam UUIDs de navegação; o servidor verifica autorização a cada leitura. A troca de contexto não exibe dados do contexto anterior durante a próxima consulta. Nenhum endpoint de escrita operacional foi habilitado.

Validações desta atualização: 28/28 testes Vitest do workspace (incluindo 6 do catálogo), TypeScript sem emissão, lint focalizado, HTTP 401 sem token com `private, no-store`, build Next 14 completo e inspeção da galeria em localhost/390 px sem erros de navegador. O fluxo autenticado não pôde ser comprovado: a execução local não tinha configuração Supabase Cloud nem tenant/usuário de staging. A disponibilidade de login por senha no projeto real também não foi verificada. Não houve commit, push, PR ou deploy.

Riscos/follow-ups: aplicar/revisar a migration em staging e fazer bootstrap administrativo, testar catálogo e Overview com papéis reais e RLS cross-tenant via PostgREST, confirmar método de login, adicionar paginação do catálogo antes de 100 contextos, validar visualmente a experiência autenticada em desktop/mobile e obter revisão final do Muse.

Em seguida, o premium pass do Muse (`364429d`) foi portado de forma seletiva. Os tipos críticos e APIs não foram alterados nessa conciliação visual; a UI conectada preserva a semântica `pending`/`not_configured` e não anuncia integração pronta. A galeria `/console/preview` demonstra o novo hero e os cartões black/gold. Nesta atualização, 28/28 testes Vitest passaram, o lint focalizado ficou sem avisos e o build completo Next 14 passou com as quatro rotas do Console. O browser mostrou hero/cartões em desktop e viewport de 390 px, sem erros no console. A experiência autenticada segue sem prova por falta de staging configurado.

O commit de direção de arte seguinte (`08cf2d3`) foi conciliado com o checkout local: CSS dos painéis teal, chips/status com glow, papel e bordas dos botões. TypeScript e lint focalizado passaram; `/console/preview` respondeu HTTP 200 e a prévia recarregada mostrou os novos estilos sem erros de navegador. O build completo anterior é a referência estrutural; não foi repetido para esta troca pequena de estilo. A UI autenticada continua não verificada em staging.

Na retomada de 2026-09-28, após aprovação visual da prévia, a suíte do workspace passou novamente (28/28), assim como `tsc --noEmit`, lint focalizado do Console e `git diff --check`. A galeria foi conferida em viewport de 390 px, sem overflow horizontal ou erros/avisos no navegador; o viewport padrão foi restaurado. `GET /api/cloud/v1/catalog` e `GET /api/cloud/v1/overview` com UUIDs válidos retornaram HTTP 401 sem token e `Cache-Control: private, no-store`. O checkout tem apenas `.env.example`, sem configuração local de Supabase Cloud; não houve teste de login ou dados reais. A aprovação registrada é visual, não autorização de commit, push, PR, migration remota ou deploy. O build completo não foi repetido porque não houve alteração estrutural desde o último build aprovado.

Na preparação do PR, Eduardo autorizou commit e abertura do PR (não merge/deploy). Após atualizar a branch para `origin/main` por fast-forward, passaram novamente os 66 testes do banco descartável/observações, 28 testes Vitest, TypeScript da aplicação e contratos, lint focalizado e o build completo Next 14.2.35, com as rotas do Console geradas. O servidor local da prévia foi reiniciado após o build. O PR do Muse no repositório legado possui contrato V1 similar, mas não idêntico; a reconciliação semântica está em `CLOUD-CONSOLE-MUSE-HANDOFF.md`. Nenhum teste autenticado de staging foi acrescentado nesta preparação.

## OWNED AREA / FILES TOUCHED / DEPENDENCIES / EXPECTED OUTPUT

- **OWNED AREA:** dados, autorização, contratos e validação server-side. Nenhum componente visual alterado.
- **FILES TOUCHED:** migration inédita `20260928235714_cloud_console_core.sql`, `contracts/cloud-console-v1.ts`, `apps/volynx-os/server/cloud-console/observations.ts`, dois testes `scripts/check-cloud-console-*.test.mjs`, audit/decision log e documentos de validação/handoff.
- **DEPENDENCIES:** Docker local, PostgreSQL 17, Node, TypeScript/ESLint/Next existentes. Nenhuma dependência ou lockfile adicionado/alterado. Para a execução local foram usados links temporários aos node_modules existentes do checkout principal.
- **EXPECTED OUTPUT:** migration executável e regressões testadas em banco efêmero, contratos reconciliados com Muse e limites de integração documentados.

## O que foi testado

O runner cria um container exclusivo, nomeado `volynx-cloud-test-<pid>-<timestamp>`, com PostgreSQL 17, dados em tmpfs, `--network none`, sem volume do host e sem porta publicada. O acesso ocorre exclusivamente via `docker exec` dentro desse container. O runner não aceita URL de conexão, não lê `.env`, não usa `--linked` e não pode escolher um banco existente.

A imagem foi fixada por digest em `scripts/check-cloud-console-db.test.mjs`. Ao terminar, o container e os dados sintéticos são removidos. A imagem Docker pode continuar no cache para novas execuções.

A preparação cria somente os papéis de teste `anon`, `authenticated`, `service_role`, `auth.users` mínimo e um equivalente de `auth.uid()` baseado no subject de sessão. Em seguida aplica o DDL **real e sem edição** de `202605240001_volynx_os_core.sql`, até o bloco 9 (seed demonstrativo excluído), e aplica a migration Cloud completa em transação.

Isso verifica compatibilidade com a fundação Core utilizada, não um replay integral das 66 migrations históricas nem equivalência do schema remoto. A autorização de dados é real PostgreSQL/RLS. A autenticação JWT do Supabase/PostgREST não faz parte desse ambiente.

O cenário contém duas organizações, três clientes (dois dentro da mesma organização), três produtos/ambientes, admin/operator/client admin/client viewer, outsider e owner legado. Usuários de teste usam `SET LOCAL ROLE authenticated` com `rolbypassrls=false`, não superuser disfarçado de cliente. `service_role` é testado separadamente para integridade estrutural.

## Falhas reproduzidas e corrigidas

| Falha no rascunho anterior | Correção |
| --- | --- |
| VLX ID podia mudar | Privilégios por coluna + trigger de identidade; protege também contra escrita via service_role |
| Ticket do cliente A podia apontar para produto B dentro da mesma organização | Chaves estrangeiras compostas ligando cliente/produto/ambiente/organização |
| Cliente podia ler referência de credencial de integração | RLS de integrações exclusiva de operador + retirada do SELECT de secret_ref |
| Supabase defaults podiam manter grants amplos | Revogação explícita de PUBLIC/anon/authenticated e concessões mínimas por coluna/operação |
| `INSERT ... RETURNING` válido era negado pela leitura autorreferente | Políticas de leitura de catálogo passam a usar o contexto da nova linha |
| Histórico podia apontar para check/backup de outro cliente | FKs compostas de check/capability/resource, incluindo verificação de ambiente nullable |
| Audit log não era gravado automaticamente | Trigger atômico grava sucesso; sem copiar valores de metadata, secrets ou descrição de tickets |
| `operational`/backup verificado sem evidência | Constraints de source/time, mais validador de dados malformados/stale |

O rascunho era local e não aplicado: as correções foram feitas na mesma migration inédita. Se ela já tivesse sido publicada, seriam necessárias migrations corretivas posteriores.

## Resultados desta execução

- **66/66 testes passaram**: 50 testes PostgreSQL/RLS/constraints/grants/audit e 16 testes do validador de observações.
- **TypeScript 5.7.2 passou** no contrato inicial, contrato V1 e validador server-side.
- **Lint focalizado passou** usando a configuração do workspace explicitamente para os dois contratos, validador e testes.
- **Build completo de `apps/volynx-os` passou** com Next 14.2.35, incluindo compilação, lint, type-check e geração de 46 páginas.
- **7/7 testes existentes do workspace passaram** (`npm run test --workspace volynx-os`).
- **Whitespace dos 10 arquivos novos passou**, incluindo arquivos ainda não rastreados pelo Git. Os links temporários de dependências foram removidos depois da validação.
- **Cleanup verificado**: nenhum container com a label `volynx.task=cloud-console-disposable-test` permaneceu.

O primeiro lote registrou falhas reais do rascunho, depois corrigidas. Um teste positivo adicional detectou o problema de `INSERT ... RETURNING`. Houve também uma corrida na inicialização do runner: `pg_isready` enxergava o servidor temporário antes da criação do banco. A prontidão agora exige uma consulta no servidor TCP final, dentro do container, e a suíte completa passou depois dessa correção. Uma primeira chamada de lint não encontrava a configuração para contratos fora da aplicação; a execução final passou com `--config` explícito.

## Reprodução

Com Docker iniciado e dependências npm do monorepo disponíveis:

```sh
node --test scripts/check-cloud-console-db.test.mjs scripts/check-cloud-console-observations.test.mjs
node apps/volynx-os/node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2020 --module ESNext --moduleResolution Bundler contracts/cloud-console.ts contracts/cloud-console-v1.ts apps/volynx-os/server/cloud-console/observations.ts
node node_modules/eslint/bin/eslint.js --no-eslintrc --config apps/volynx-os/.eslintrc.json contracts/cloud-console.ts contracts/cloud-console-v1.ts apps/volynx-os/server/cloud-console/observations.ts scripts/check-cloud-console-db.test.mjs scripts/check-cloud-console-observations.test.mjs
npm run build --workspace volynx-os
```

Os testes de observação transpilem o arquivo fonte com o compilador existente, sem duplicar a implementação; o type-check separado verifica os tipos. O lint usa explicitamente a configuração existente do workspace porque os contratos estão fora de `apps/volynx-os`.

## Fronteira de segurança e operação

- Authenticated pode ler somente colunas autorizadas e linhas do seu escopo. SELECT `*` em tabelas com colunas restritas falha; a futura API deve escolher colunas explicitamente.
- Admin pode criar/editar catálogo e papéis da sua organização. Operador não pode promover a si próprio. Client Admin não herda administração da plataforma.
- Cliente abre ticket com requester autenticado, estado inicial fixo e caminho tenant consistente. Viewer vê os próprios tickets; Client Admin vê tickets do cliente.
- Escritas de observabilidade e integração ficam restritas à ingestão confiável. O schema não comprova que a fonte declarada foi de fato consultada: isso será responsabilidade dos adapters.
- Nenhuma exclusão/restore/rollback/revogação é exposta ao papel `authenticated`. Não há endpoint dessas ações. O bootstrap do primeiro admin exige procedimento administrativo explícito; não há elevação automática do owner legado.
- Audit guarda IDs, ação, resultado e nomes de campos alterados. UPDATE/DELETE/TRUNCATE são negados; as relações com a organização usam RESTRICT para evitar apagamento em cascata. Retenção/pseudonimização de IDs requer procedimento administrativo separado.
- Audit de sucesso participa da transação da operação. Uma falha faz rollback também do audit; o backend futuro deverá registrar falhas em transação separada com reference ID. Não alegar que falhas já são auditadas.
- Mudanças de `volynx_id` ou de tenant requerem migration administrativa específica, revisão e auditoria. Nenhum bypass público ou flag de sessão foi criado.
- O serviço `service_role` ignora RLS por definição e precisa de autorização no backend antes de qualquer consulta. As FKs continuam protegendo a consistência, mas não transformam uma service key em credencial de cliente.

## Limites que permanecem

Na etapa do banco descartável, não foram testados login real, expiração JWT, PostgREST, produção, providers Cloudflare/GitHub/Supabase, retries/timeouts HTTP, coleta de health real, SLA, backup/restore real, DNS/SSL, UI, mobile ou acessibilidade. Posteriormente foi adicionada a API de leitura da Overview; ver `CLOUD-CONSOLE-API.md` para testes unitários do handler/adapter e checagem HTTP local sem token. O caminho autenticado com Supabase real continua não testado. O provider failure no banco é um resultado sintético persistido, não uma integração offline real. O clock/TTL é uma política de domínio testada, não uptime medido.

Domínios e security claims têm contrato, mas ainda não possuem persistência especializada. Timeline de incidentes, postmortem e mensagens de suporte também são etapas futuras. Esta base não é a V1 completa.

## Próxima sequência de integração

1. Muse confirma uso do monorepo correto e contrato V1, mantendo módulos indisponíveis explícitos.
2. A primeira API de leitura de Overview está implementada e validada com simulação de auth/DB e HTTP sem token. Falta provar o caminho autenticado em staging com migration aplicada e usuários reais.
3. Validar o bootstrap do primeiro tenant/produto real da Volynx; depois conectar um provider com escopo read-only e evidências verificáveis.
4. Fazer revisão de migração sobre schema de staging e só então propor aplicação remota/deploy mediante aprovação.

Referências técnicas consultadas: [PostgreSQL 17 — Row Security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [Supabase — Securing your API](https://supabase.com/docs/guides/api/securing-your-api), [Supabase — RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
