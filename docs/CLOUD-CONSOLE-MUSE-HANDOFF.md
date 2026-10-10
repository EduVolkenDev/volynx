# VOLYNX Cloud Console — conciliação com a entrega 01 do Muse

Data: 2026-09-28. Documento para Eduardo repassar ao Muse.
Fonte analisada: `VOLYNX-CLOUD-CONSOLE-entrega-01-muse.pdf`, 11 páginas.
Este retorno trata o PDF como proposta de experiência, não como autorização para alterar repositório, infraestrutura ou publicar.

## Atualização: commit de alinhamento do Muse

Verificação read-only em 2026-09-28: `1afffd83e92c240fe5ddc9c69134ef7193afaf9e` existe em `feature/cloud-console-ux` do repositório **`EduVolkenDev/Volynx-OS`**, não em `EduVolkenDev/volynx`. O commit traz **15 arquivos no diff** (a mensagem recebida dizia 17). O alinhamento da UI aos oito estados de `ModuleState<T>`, a remoção de indicadores operacionais inventados e o bloqueio das ações sem API são melhorias verificadas no código. Os contextos e nomes exibidos ainda são demonstrativos, não dados autenticados de tenant.

Os contratos vendorizados não são mais byte a byte iguais aos do core local. Em `contracts/cloud-console.ts`, a única diferença é o cabeçalho de proveniência. Em `contracts/cloud-console-v1.ts`, além do cabeçalho, o core acrescentou `FailureCode: invalid_request`, tornou `BackupCapability.resource.name`, `Incident.updates` e `CarePlan.includes` nullable, e adicionou `CloudOverview` como payload de `ApiResponse<CloudOverview>`. Essas diferenças refletem o primeiro endpoint real e devem ser reconciliadas antes da ligação da UI à API; não representam um merge automático limpo.

O `OverviewSnapshot` atual do Muse é uma composição demonstrativa distinta de `CloudOverview`: `vlxId` é `null`, o nome vem do slug e todos os módulos são `not_configured`. O endpoint do core exige token e UUIDs autorizados e retorna identidade real mais estados por módulo (`pending`, `ready` ou `error`, conforme evidência disponível). A passagem para dados reais exige um adapter/UI que consuma `ApiResponse<CloudOverview>`, trate falhas de contexto e module states separadamente, e não use slug ou `vlxId` como autorização. `not_configured` só deve significar configuração comprovadamente ausente; a mera falta de observação permanece `pending`.

Integração autorizada por Eduardo na sequência: a UI foi portada para `apps/volynx-os` no monorepo, com a prévia demonstrativa isolada em `/console/preview`. O Console operacional agora usa catálogo autorizado e `ApiResponse<CloudOverview>`; detalhes e limitações estão em `CLOUD-CONSOLE-API.md` e `CLOUD-CONSOLE-VALIDATION.md`. Não houve cherry-pick/merge cego, PR, commit, push ou deploy. A experiência visual ainda depende de revisão do Muse/Eduardo, e o caminho autenticado em staging continua sem prova.

Nova entrega visual do Muse: commit `364429db4658fe16c877caa7ab408958de02b54e`, descendente de `1afffd8`, com 11 arquivos modificados e sem alteração dos contratos compartilhados. O acabamento black/gold, títulos display, estados ativos dourados, blurbs e orientação humana por módulo foram conciliados na UI do monorepo. O hero do Overview foi adaptado à API: “flying blind” aparece quando não há módulo verificado; a alternativa não afirma que dados estão live só porque uma consulta retorna `pending`. O CTA aponta para o estado de conexões, não promete configurar um provider que ainda não tem API. A galeria pública ganhou amostra do hero, sempre marcada como conteúdo ilustrativo. Nenhuma rota de slug demonstrativo do legado substituiu a navegação por UUID e catálogo autorizado.

Ajuste CSS posterior do Muse: `08cf2d3ab7b6d154bb09459232f7a0547b0b08cf` (um commit à frente de `364429d`, cinco arquivos) foi integrado seletivamente após Eduardo notar que não aparecia no localhost. O dev server usava o checkout do monorepo, não a branch remota do Muse. Painéis teal esculpidos, chips com glow, badge de papel e bordas assimétricas foram aplicados sem trocar os contratos nem os textos honestos da UI conectada. A prévia foi recarregada e os novos estilos foram observados em navegador; nenhum erro de console.

## Correção de destino antes da implementação

O PDF cita `EduVolkenDev/Volynx-OS`, base `6519a99`, Next 16 canary e open-next/Workers. O protocolo transferido e `docs/ECOSYSTEM-BOUNDARY.md` definem outra fonte de verdade:

- Monorepo: `/Users/eduardovolkenair/VOLYNX` (`EduVolkenDev/volynx`).
- Aplicação operacional: `apps/volynx-os`, Next **14.2.35** na base auditada `5777a8a6`.
- Área sugerida para Muse: `apps/volynx-os/app/console/**`, `apps/volynx-os/components/console/**` e estilos próprios desse segmento, após revisão da base correta.
- O pipeline open-next descrito no PDF não foi encontrado/validado como pipeline deste workspace. Domínio e deploy do Console continuam pendentes. O wildcard `*.volynx.world/*` já possui router de PropertyFlow.
- Core local do Codex: branch `codex/cloud-console-core`, worktree `/Users/eduardovolkenair/.codex/worktrees/cloud-console-core/VOLYNX`.
- A autoria visual continua do Muse. A versão portada foi adaptada à API e ao Next 14, mas não equivale a aprovação visual final.

Não é necessário migrar de framework para implementar os contratos. O caminho `app/console` continua compatível como segmento, dentro de `apps/volynx-os`.

## Contrato compartilhado

Novo contrato proposto: **`contracts/cloud-console-v1.ts`**, versão `1.0`.

O rascunho anterior `contracts/cloud-console.ts` é preservado; seus enums permanecem a única definição de roles/status. Não havia consumidores de UI/API desse arquivo na base inspecionada. O V1 usa os nomes esperados pelo Muse (`lastCheckedAt`, `vlxId`, `name`), sem renomear silenciosamente o rascunho anterior (`checkedAt`, `label`). Muse deve importar os DTOs do V1 e não duplicá-los.

| Requirement do Muse | Ajuste/contrato acordável | Disponibilidade atual |
| --- | --- | --- |
| ProductIdentity | `id` UUID + `vlxId` público, URL nullable, lista de ambientes | Schema + contrato + leitura de Overview local |
| ProductHealth | `status`, `lastCheckedAt`, `source`, `stale`, components e incident IDs | Contrato e validador; agregação e fontes pendentes |
| DomainStatus | `dnsOk: boolean \| null`, SSL com fonte/timestamp, CDN nullable | Contrato; persistência especializada e provider pendentes |
| Deployment | Histórico, source sanitizada, tempo/duração nullable, erro com referência | Schema + contrato + leitura de registros; provider externo pendente |
| ResourceHealth | Resource identity + provider + status com origem/idade | Schema + contrato; ingestão pendente |
| BackupCapability | `enabled`/`restoreCapability` nullable, retenção nullable, last success e verificação | Schema + contrato; comprovação no provider pendente |
| SecurityPosture | Claims com evidence + `lastEvaluatedAt`; ausência não é proteção | Contrato; coleta e persistência especializada pendentes |
| Incident | Estados do ciclo e updates com marcação `internal` | Leitura de incidentes básicos do ambiente/produto; updates `null` e postmortem pendentes |
| CarePlan | `slaHours` nullable e somente do plano contratado | Schema básico; projeção dos benefícios/canal pendente |
| SupportRequest | Status, subject e messages | Ticket inicial protegido; mensagens/API pendentes |
| AuditEvent | Operador; metadata limitada a campos alterados | Auditoria de mutações de sucesso no banco; API pendente |

O contrato é versionado e validado em TypeScript. O primeiro endpoint de leitura já foi implementado no namespace `/api/cloud/v1`: `GET /api/cloud/v1/overview?productId=<uuid>&environmentId=<uuid>`. Demais seções/endpoints continuam pendentes.

## Estados para a UI

`ModuleState<T>` distingue `loading`, `ready`, `empty`, `not_configured`, `pending`, `error`, `stale` e `forbidden`.

- `loading`: estado local controlado pela UI.
- `not_configured`: ausência conhecida de configuração.
- `pending`: integração/consulta ainda sem fonte confirmada.
- `empty`: consulta real concluída com origem e timestamp, sem registros.
- `stale`: última informação conhecida, explicitamente antiga; não usar como confirmação live.
- `error`/`forbidden`: erro seguro com motivo, instante e reference ID; dados internos nunca acompanham a resposta.

Um array vazio de incidentes enquanto a consulta está `pending`/`error` não autoriza “All clear”. Tampouco `restoreCapability: true` autoriza oferecer restore: capacidade do provider e permissão de executar são decisões distintas. Nome de recurso de backup, benefícios Care e updates de incidentes ficam `null` quando ainda não há fonte, evitando listas vazias com aparência de confirmação.

Datas são ISO UTC. A UI formata o tempo local. `null` significa não observado/não contratado/desconhecido conforme o campo, nunca zero implícito. O validador recusa timestamps futuros/impossíveis, fonte ausente, URLs com credenciais e payloads malformados. A política de idade máxima será definida por tipo de fonte; não há SLA de freshness universal configurado.

## Permissões: V1 desejada versus core validado hoje

O quadro da página 7 representa capacidades desejadas. A UI precisa respeitar a disponibilidade real por ação:

| Área | Core disponível no banco descartável | Ainda indisponível |
| --- | --- | --- |
| Client viewer | Leitura segura do próprio cliente, abrir/ver os próprios tickets | Mutação de infraestrutura |
| Client admin | Mesma leitura; pode ver tickets do cliente | Convites/gestão de membros via API |
| Volynx operator | Leitura operacional da organização e audit log | Rollback, restore, alterar WAF, configurar integrações |
| Volynx admin | Leitura + criar/editar catálogo e roles limitados pela organização | Exclusões, revogações e demais operações destrutivas via API |

As capacidades indisponíveis não devem parecer executáveis. A Overview é somente leitura. Nenhum endpoint de restore/rollback/delete foi criado. Quando implementados, exigirão autorização server-side, confirmação, idempotência, auditoria de sucesso/falha e testes específicos.

Os papéis do Builder (`owner/admin/editor/...`) não concedem privilégios Cloud automaticamente. Viewer não recebe raw metadata, repository URL, secret_ref, resultados brutos ou detalhes internos de erro. RLS limita linhas; grants limitam colunas. Campos técnicos adicionais para operador precisam de projeção server-side futura.

## Constraints técnicas para convergência

1. **TECHNICAL CONSTRAINT — repositório:** implementar o segmento no monorepo correto. Revalidar os tokens e deploy ali antes de copiar suposições do legado.
2. **TECHNICAL CONSTRAINT — deep links:** o `vlxId` pode servir à URL; UUID é a chave do banco. Slug não é autorização e pode mudar. Resolver o link dentro do tenant autorizado, sem fallback para outro cliente.
3. **TECHNICAL CONSTRAINT — freshness:** manter origem/idade também na visão cliente quando sustentarem uma afirmação de saúde/proteção. Detalhes sensíveis continuam exclusivos de operador.
4. **TECHNICAL CONSTRAINT — updates internos:** o backend deve removê-los da resposta cliente; esconder visualmente é insuficiente.
5. **TECHNICAL CONSTRAINT — disponibilidade parcial da API:** catálogo e Overview têm endpoints de leitura. Health agregado, domínio, segurança e dados não coletados retornam `pending`. Números e estados do wireframe são ilustrativos, não fixtures de produção.

A integração de UI foi posteriormente autorizada por Eduardo. Tokens/layout do segmento foram portados da entrega do Muse, com alterações de dados/autorização para a base correta. As decisões de idioma e aprovação visual continuam com Eduardo/Muse e não bloqueiam os testes do core.

### Reconciliação com o PR de UX do Muse

O PR [Volynx-OS #2](https://github.com/EduVolkenDev/Volynx-OS/pull/2) pertence ao repositório legado, não a este monorepo. Os contratos vendorizados lá têm a mesma base, mas **não são byte a byte idênticos** aos contratos desta branch: aqui `FailureCode` inclui `invalid_request` para o endpoint de Overview; `BackupCapability.resource.name`, `Incident.updates` e `CarePlan.includes` aceitam `null` enquanto não há fonte; e `CloudOverview`, `CloudCatalog` e `CatalogResponse` definem as respostas dos endpoints implementados. O cabeçalho de proveniência do Muse também existe só na cópia legada. A UI integrada neste monorepo compila contra o contrato daqui e não importa o contrato do repositório legado. Não mesclar os dois PRs como se fossem a mesma árvore; transportar futuras mudanças do Muse por revisão semântica.

## Entrega técnica a consultar

Ver `CLOUD-CONSOLE-VALIDATION.md` e `CLOUD-CONSOLE-API.md` para resultados, reprodução, limites e sequência de integração. Esta etapa valida o modelo local e a política de acesso; o endpoint local não valida operação externa, login real com usuário de produção ou o Console visual.
