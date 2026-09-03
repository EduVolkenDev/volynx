# VOLYNX Lab — auditoria Phase 0

**Data:** 2026-09-01
**Escopo:** ferramentas públicas do Lab e QRGen
**Modo:** read-only, teste controlado local, sem compra real, sem deploy e sem alteração de dados
**Veredito:** não aprovado como “100% end-to-end”

## 1. Resumo executivo

O núcleo local está funcional: o build gerou 88 páginas, o manifesto verificou 18 assets locais e os fluxos principais do Converter, Image Scaler, iMage Suite, Lumina local e QRGen foram reproduzidos sem erro de console bloqueante.

Isso ainda não prova o funcionamento perfeito da plataforma. Há quatro limites importantes:

1. Os exports estáticos premium do QRGen e parte do processamento do Lab são decididos no navegador. Um usuário com conhecimento técnico pode alterar o JavaScript ou chamar a biblioteca de geração diretamente. Isso é uma lacuna comercial P1 e está diretamente relacionado ao risco de gerar um resultado premium antes do pagamento.
2. O `check-permission` retorna `allowed: true` e `useLocalStorage: true` no caminho de erro. Uma indisponibilidade do backend pode virar fallback permissivo, inclusive onde o produto deveria falhar fechado.
3. O `ai-tools` não mostra autenticação JWT nem rate limit dentro da própria Edge Function. Isso pode estar sendo coberto pela configuração da plataforma Supabase, mas precisa ser comprovado no ambiente publicado; o código isolado não fornece essa garantia.
4. Não foi executado nesta auditoria um pagamento real nem o ciclo Stripe → webhook publicado → entitlement → acesso → entrega/recuperação. Portanto, checkout, billing e fulfillment continuam sem prova end-to-end atual.

## 2. Mapa da superfície auditada

| Superfície | Rota | Execução principal | Exportação/saída | Resultado local |
|---|---|---|---|---|
| Lab catalog | `/volynx-lab/` | Astro + runtime do Lab | navegação para ferramentas | passou; sem erro de console |
| Converter | `/volynx-lab/converter/` | Canvas/browser; HEIC via `heic2any` | arquivos individuais e ZIP | passou individual e lote/ZIP |
| Image Scaler | `/volynx-lab/image-scaler/` | resize Canvas local | imagem baixável | passou em 2×; default atual é 4× |
| iMage Suite | `/volynx-lab/image-suite/` | UpscalerJS/ESRGAN, ONNX U2NetP, Canvas | upscale, compressão, conversão e remoção de fundo | upscale 2× passou; Remove BG pago não foi processado |
| Lumina | `/volynx-lab/lumina/` | modo local + Edge Function `ai-tools` | cards, copiar, TXT e histórico | local, cards, export e histórico passaram |
| QRGen | `/qrgen/` | QRCodeStyling/browser + Supabase para QR dinâmico | PNG/SVG e QR dinâmico | preview, gate premium e login dinâmico passaram |
| QRGen alias | `/volynx-lab/qr-gen/` | redirect para `/qrgen/` | — | redirect passou |

Builder, Design Studio, Services e demais produtos do Dev Hub foram identificados no inventário, mas não foram tratados como ferramentas do Lab nesta rodada. Eles precisam de uma matriz própria para não misturar produto, permissões, assets e critérios de aprovação.

## 3. Fluxos reproduzidos

| Fluxo | Evidência | Estado |
|---|---|---|
| Rotas e renderização | build local com 88 páginas e varredura das rotas do Lab | aprovado local |
| Assets do Lab | `npm run lab:assets:check`: 18 assets verificados | aprovado local |
| Converter individual | upload real, conversão, link de saída | aprovado local |
| Converter lote | múltiplos arquivos, resultados e estado do ZIP | aprovado local |
| Image Scaler | upload real, seleção 2×, output 2508×2508 e download habilitado | aprovado local; risco de performance em 4× |
| Image Suite | upload real, upscale 2× com saída 2508×2508 e indicação AI | aprovado local |
| Lumina local | texto → 8 cards → histórico → export TXT | aprovado local |
| Lumina AI | chamada publicada/provider real | não comprovado |
| Lumina copy | botão respondeu, mas a leitura de clipboard no teste retornou vazio | requer matriz de browsers |
| QRGen básico | canvas, conteúdo, preview e export path | aprovado local |
| QRGen premium | seleção premium exibiu gate e export não foi liberado no Free | gate client-side aprovado; segurança comercial não aprovada |
| QR dinâmico | Free exibiu login, campos ficaram protegidos e quota `0/1` | aprovado local no gate |
| Remove BG Pro | processamento com entitlement pago | não comprovado |
| Authenticated Free/Launch/Pro/Studio | matriz com contas reais | não comprovado |
| Stripe e fulfillment | pagamento aprovado, webhook, entitlement, email, entrega e recuperação | não comprovado |
| Produção e cross-device | `volynx.world`, Safari/iPhone, sessão real | não comprovado nesta rodada |

## 4. Achados prioritários

### P1 — fronteira premium do QRGen é client-side

O preview sanitiza recursos premium e `validateExport()` bloqueia a UI em `public/scripts/qrgen-editor.js:856-869` e `1039-1133`. Isso funciona contra o uso normal, mas `exportQrFile()` instancia `QRCodeStyling` diretamente no browser em `public/scripts/qrgen-editor.js:1252-1291`. Não há neste caminho uma autorização server-side verificando entitlement, configuração, tamanho, logo ou export final.

**Risco:** manipulação do DOM/JS ou chamada direta à biblioteca pode produzir uma imagem premium sem pagamento.
**Correção recomendada:** mover a decisão final para um endpoint/job server-side ou usar capability token assinado e de curta duração para cada export premium; o browser deve receber apenas o resultado autorizado.

### P1 — fallback permissivo no controle de permissão

O caminho de erro de `supabase/functions/check-permission/index.ts:254-260` retorna `allowed: true` e `useLocalStorage: true` com status HTTP 500.

**Risco:** indisponibilidade ou erro de schema pode ser interpretado pelo cliente como autorização local.
**Correção recomendada:** separar explicitamente `offline_free_allowed` de `paid_feature_allowed`; recursos Pro devem falhar fechado, com mensagem de indisponibilidade e retry.

### P1 — autenticação e abuso da IA precisam de prova publicada

`public/volynx-lab/lumina.js:381-408` envia o token para `ai-tools`, mas `supabase/functions/ai-tools/index.ts:70-81` começa processando o POST sem uma chamada visível a `auth.getUser()` ou validação de plano. Pode existir enforcement no gateway Supabase, mas isso não foi verificado no deploy.

**Risco:** uso direto da função e consumo indevido da chave Anthropic, se o gateway estiver permissivo.
**Correção recomendada:** validar JWT/usuário dentro da função ou provar formalmente a configuração de gateway; aplicar rate limit persistente, limite de tokens e ledger de uso server-side.

### P1/P2 — Image Scaler inicia em 4× sem preflight

`src/pages/volynx-lab/image-scaler/index.astro:70-74` seleciona 4× por padrão. O fluxo local amplia diretamente em Canvas.

**Risco:** primeira execução lenta, alto consumo de memória e falha em imagens grandes, especialmente em mobile.
**Correção recomendada:** default 2×, estimativa de dimensões/peso antes de processar, limite explícito e confirmação para 4×.

### P2 — URL do ZIP é revogada imediatamente

Em `public/volynx-lab/app.js:393-400`, o download é disparado e o object URL é revogado na linha seguinte.

**Risco:** comportamento inconsistente em alguns browsers.
**Correção recomendada:** remover o link após o click e revogar com pequeno atraso, como já ocorre em outros exports do projeto.

### P2 — fallback do Lumina pode parecer sucesso de IA

`public/volynx-lab/lumina.js:437-458` converte erro de IA em resultado local. A mensagem informa fallback, mas o produto continua entregando cards.

**Risco:** usuário interpretar uma resposta local como resposta do modelo pago.
**Correção recomendada:** separar visualmente “resultado local” de “resultado AI”, registrar o motivo e oferecer retry sem mascarar o estado.

### P2 — assets Lumina são válidos, mas precisam de QA de viewport

Os WebP otimizados existem e responderam HTTP 200; quando levados à viewport, os 13 assets lazy carregaram com dimensões válidas. O ponto restante é validar visualmente a entrada de cada seção, principalmente em mobile, para evitar que lazy loading seja percebido como asset ausente.

## 5. Pontos positivos confirmados

- Build local limpo: 88 páginas geradas, sem falha de build.
- Manifesto de assets do Lab passou com 18 arquivos locais.
- Converter individual e lote funcionaram.
- Image Scaler 2× produziu saída válida e baixável.
- iMage Suite 2× produziu saída AI local e já possui aviso de latência/cap de 36 MP.
- Lumina local produziu 8 cards, histórico e TXT.
- QRGen mostrou preview, bloqueou export premium no Free no fluxo normal e encaminhou QR dinâmico para login.
- RLS de workspace/artifacts é owner-only; `resolve_qr_slug` está restrito a `service_role` em `supabase/migrations/202605120001_qr_resolve_rpc.sql:79-80`.
- Há proteção de idempotência para eventos de pagamento e compra de tokens em `supabase/migrations/202606150001_payment_fulfillment_idempotency.sql:32-55` e `80-176`.

## 6. Proposta de Phase 1, adaptada ao stack real

1. Criar um contrato único de entitlement server-issued para Lab/QRGen, com versão, expiração e lista de capacidades.
2. Corrigir `check-permission` para distinguir fallback gratuito offline de autorização paga e falhar fechado para Pro/Launch/Studio.
3. Criar export/job premium server-side ou capability tokens assinados; cobrir QRGen, Remove BG e qualquer saída AI paga.
4. Proteger `ai-tools` com identidade, rate limit, limite de custo e ledger de uso; deixar fallback local explicitamente rotulado.
5. Unificar preflight de tamanho, progresso, cancelamento, retry e estado de job em Converter, Scaler e Image Suite.
6. Executar matriz autenticada Free/Launch/Pro/Studio, desktop/mobile e Chromium/Firefox/Safari.
7. Executar smoke test de produção com uma transação controlada somente após autorização operacional específica: checkout → pagamento aprovado → webhook → entitlement → acesso → entrega → recuperação.

## 7. Arquivos candidatos para a próxima fase

Sem alterações nesta auditoria. Os pontos de entrada prováveis são:

- `public/scripts/qrgen-editor.js`
- `src/pages/volynx-lab/image-suite/index.astro`
- `src/pages/volynx-lab/image-scaler/index.astro`
- `public/volynx-lab/app.js`
- `public/volynx-lab/lumina.js`
- `supabase/functions/check-permission/index.ts`
- `supabase/functions/ai-tools/index.ts`
- `src/pages/checkout/index.astro`
- migrations e Edge Functions de entitlement, uso e fulfillment

## 8. Critério de liberação

O Lab não deve ser declarado “100% funcionando” até haver evidência separada para:

- build e rotas;
- runtime local em todas as ferramentas;
- produção publicada;
- autenticação por plano;
- export premium realmente protegido;
- AI provider e limites;
- pagamento real controlado;
- webhook e idempotência;
- entitlement e acesso pós-pagamento;
- entrega, email, portal e recuperação;
- mobile, Safari/Firefox e acessibilidade básica.

**Conclusão:** a base local é utilizável e tem bons componentes de persistência/segurança, mas a plataforma ainda está em “pronta para Phase 1 de hardening”, não em estado de aprovação comercial end-to-end.
