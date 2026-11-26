# Builder / Landing Express — correção local em 25/11/2026

Base do site: main 69103926, checkout isolado. Nenhum projeto do usuário foi alterado nesta rodada. Sem commit, push, upload ou deploy destas correções.

## Mudanças

- src/pages/builder/index.astro: a descrição/tagline informada passa ao título do hero, em vez de manter a frase do preset. O Landing Express ganha o campo de link do botão principal, usando as traduções e estilos existentes.
- src/lib/builder/generated-project.ts: prepara somente novos projetos, depois dos filtros de blocos. Cria identificadores únicos, ajusta âncoras dos presets quando um bloco opcional foi retirado e usa URLs completas para destinos oficiais VOLYNX. URLs explícitas do usuário são preservadas. Projetos existentes não são migrados automaticamente.
- public/builder/vx-renderer.js: emite os identificadores dos blocos no preview.
- scripts/builder-generation.test.mjs: cobre presets completos/filtrados, destinos customizados, IDs duplicados, geração real do wizard e o renderer do Worker recuperado.

## Worker ativo

O código de produção foi recuperado com wrangler init --from-dash volynx-publisher --no-delegate-c3, sem publicar. A tentativa inicial delegada ao C3 gerou um scaffold de exemplo, sem deploy; esse scaffold não é a fonte desta correção.

Baseline ativo: deployment 5d199da1-f6fc-4751-bd7d-d00380043c91, versão 18b5a829-784b-42b6-9df2-5d1f1f70df16 (100%). SHA-256 do worker recuperado: c15e5af7739f0c408338fb36afde8e63d706397f69d2cf4a5b3e35faf5b72441. A alteração acrescenta apenas o atributo id no primeiro section emitido por cada renderer. Não muda autenticação, pagamentos, rotas, DNS, bindings ou segredos.

Fonte de revisão: /Users/eduardovolkenair/volynx-publisher-review-20261125/active/volynx-publisher/src/worker.js. Baseline preservado em src/worker.baseline.js e Downloads/volynx-publisher-baseline-20261125.js. Patch específico em Downloads/volynx-publisher-builder-anchors-20261125.patch. Conferir novamente a versão ativa antes de qualquer publicação.

## Validação

Cinco testes passaram, sem skips, com VOLYNX_PUBLISHER_SOURCE apontando para o Worker recuperado. Todos os quatro presets, com blocos completos e filtrados, produziram âncoras resolvíveis no preview; o Worker corrigido passou no mesmo contrato de links. URLs customizadas foram preservadas. O teste chama o verdadeiro buildProjectData extraído do Astro para comprovar a descrição no hero. Os endpoints publish/unpublish continuam recusando chamadas sem token nos testes do Worker.

Build Astro: 105 páginas. node --check, git diff --check e wrangler deploy --dry-run passaram. O dry-run não fez upload. Fixtures renderizadas pelos dois motores foram abertas no navegador. A descrição apareceu no título e o clique em See process chegou a #process existente. No renderer de publicação, desktop1280 e mobile390 tiveram scrollWidth igual ao viewport e zero âncoras ausentes. As fixtures são locais; não representam publicação real do patch nem uma nova sessão autenticada no wizard com o campo extra.

## Planos — pendência de initial-017

Consulta atual a builder_plan_limits: Free 1 projeto/0 publicados; Launch 3/1; Pro 10/3; Studio 50/10; Teams 100/25. Premium kits/custom domain/remove branding: habilitados em Pro, Studio e Teams. A conta usada no teste anterior tem builder_plan studio e exibia modo administrador: aquela prova não valida gates de um comprador comum.

No Worker ativo recuperado, POST /publish verifica token, identidade e proprietário do projeto, mas não consulta builder_plan_limits nem conta publicações antes de gravar no R2. Não foi feito teste de bypass com conta real. Essa lacuna precisa ser tratada e testada com contagem consistente antes de declarar os planos validados. A remoção de branding e domínios customizados também não foram comprovados. Não alterar preços ou permissões de clientes durante o teste.

initial-017 permanece doing. A correção de conteúdo/links está pronta para aprovação de publicação; depois do deploy ainda exige repetição autenticada com projeto separado. A validação integral dos planos continua pendente. O quadro mantém 12 de 47 tarefas done; não há novo Done nesta rodada.
