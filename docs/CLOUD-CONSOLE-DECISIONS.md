# VOLYNX Cloud Console — Decision log

## DECISION 001 — Separar domínio operacional do Builder

### CONTEXT

O Core existente modela organizações, sites e snapshots para conteúdo/publicação. O Cloud Console precisa modelar produto gerenciado, ambiente, infraestrutura, deploy, saúde, backup e incidentes.

### OPTIONS

1. Reutilizar `sites`, `products` e `organization_members` diretamente.
2. Criar um domínio operacional separado, ligado à organização existente.
3. Criar outro banco/tenant independente.

### SELECTED APPROACH

Opção 2: tabelas `cloud_*` no mesmo Supabase, com ligação explícita à organização e RLS própria.

### WHY

Preserva a fundação existente, evita duplicar banco e impede que papéis/estados de conteúdo sejam confundidos com operação de infraestrutura.

### RISKS

Exige uma correspondência explícita entre produtos históricos e produtos gerenciados. Essa correspondência deve ser revisada, não inferida por nome.

## DECISION 002 — Papéis do Console separados

### CONTEXT

Os papéis existentes `owner/admin/editor/viewer/member` pertencem ao Core de conteúdo e não distinguem operador Volynx de cliente.

### SELECTED APPROACH

Usar `cloud_console_members` para `volynx_admin`/`volynx_operator` e `cloud_client_members` para `client_admin`/`client_viewer`.

### WHY

Permite menor privilégio, auditoria clara e evolução independente sem alterar permissões do Builder.

### RISKS

Os endpoints precisam aplicar a mesma política; ler apenas a tabela e confiar no client seria insuficiente.

## DECISION 003 — Sem estado positivo sem fonte

### SELECTED APPROACH

Todo snapshot operacional carrega `source`, `checked_at` e estado semântico. Ausência de integração resulta em `not_configured`, não em `operational`.

### WHY

É requisito de produto e reduz risco comercial/operacional de apresentar segurança, uptime ou backup não comprovados.

## DECISION 004 — Integridade de tenant é uma propriedade do banco

### CONTEXT

Testes reais no banco descartável reproduziram um ticket do cliente A referenciando um produto B na mesma organização. Conferir somente organização não é isolamento de cliente.

### OPTIONS

Checagem apenas no endpoint; triggers consultando cada pai; chaves estrangeiras compostas com guardas de identidade.

### SELECTED APPROACH

FKs compostas protegem os caminhos tenant; campos de identidade não podem mudar. Os casos nullable de backup recebem checagem complementar em trigger.

### WHY

Integridade permanece ativa mesmo na ingestão com service_role e não depende de o desenvolvedor lembrar filtros em cada write.

### RISKS

Transfers de produto/cliente e alteração de VLX ID exigem migration administrativa explícita. As FKs não substituem autorização de endpoints.

## DECISION 005 — Grants mínimos e ações operacionais fechadas até existir API

### CONTEXT

RLS controla linhas, mas não esconde secret_ref, metadata ou repository URLs. O quadro de permissões do Muse inclui ações ainda sem implementação.

### OPTIONS

Expor tabelas inteiras; confiar na UI; limitar colunas e operações e introduzir projeções/ações server-side conforme implementadas.

### SELECTED APPROACH

Leitura por colunas seguras, dados internos restritos a operador, catálogo/roles com admin explícito, ticket inicial protegido. Sem grants destrutivos para authenticated. Adapters de ingestão usarão credenciais apenas no servidor.

### WHY

Evita que a política desejada da V1 prometa ações executáveis antes de confirmação, idempotência e auditoria.

### RISKS

UI deve consultar capabilities reais. Client Admin gerenciar membros e Operator executar restore/rollback continuam pendentes. SELECT * não é um contrato válido nas tabelas com colunas restritas.

## DECISION 006 — Audit atômico de sucesso, falhas persistidas pelo backend futuro

### CONTEXT

O rascunho continha uma tabela de audit, mas não gerava eventos. Uma transação abortada não consegue preservar o próprio log de falha.

### OPTIONS

Audit manual em cada caller; trigger dentro da transação; coletor independente.

### SELECTED APPROACH

Trigger grava sucesso com IDs e nomes dos campos alterados, sem valores brutos. Falhas exigirão log do backend em transação separada. Eventos são append-only e não são removidos por cascatas de organização.

### WHY

Garante que uma mutação confirmada tenha audit correspondente, sem inventar auditoria de falha que o banco não entrega.

### RISKS

Volume de telemetria exige política futura de retenção/particionamento. Credenciais administrativas do banco continuam privilegiadas; este log não é armazenamento WORM externo.

## DECISION 007 — Convergência com Muse pelo contrato V1 no monorepo

### CONTEXT

O PDF entrega 01 auditou o repositório legado; o protocolo aponta para VOLYNX. Os nomes de alguns campos diferem do rascunho inicial.

### OPTIONS

Transportar backend para o legado; migrar framework; preservar a fonte de verdade e publicar DTOs versionados.

### SELECTED APPROACH

Manter VOLYNX/apps/volynx-os e criar contracts/cloud-console-v1.ts. Preservar enums e rascunho anterior. Não tocar no layout ou escolher idioma pelo Muse.

### WHY

Mantém arquitetura e autoria claras. A proposta visual pode ser aplicada ao segmento app/console do workspace correto.

### RISKS

Muse precisa revalidar tokens/deploy na base correta. Os contratos precedem endpoints e não representam dados disponíveis.
