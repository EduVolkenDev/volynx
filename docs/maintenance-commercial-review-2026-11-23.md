# VOLYNX Cloud — oferta e e-mails, 23/11/2026

Revisão de initial-015, baseada em origin/main ae8793c6 e consultas Stripe somente leitura na conta Volynx.Lab. Nenhuma cobrança, produto, preço, assinatura ou configuração de e-mail foi alterada.

## Evidência atual

Os três links públicos estão ativos e são recorrentes mensais. Os valores EUR configurados correspondem à página: Opal €219,90; Saphyra €449,90; Diamond €749,90. A expansão de currency_options retornou somente EUR nos três preços. A página mostra também referências GBP e BRL, mas o JavaScript de moeda altera texto e controles de /checkout/, sem alterar os links buy.stripe.com desses planos. Eventual conversão automática do Stripe não foi testada e não comprova cobrança pelos valores fixos GBP/BRL anunciados.

Os três links, suas subscription_data e seus preços não têm metadados de integração; lookup_key é nulo. O webhook atual exige session.metadata.user_id, retornando antes de processar uma sessão sem esse valor. O mapa de planos não inclui Opal, Saphyra ou Diamond. O e-mail plan_activated só é enfileirado para prefixos desse mapa; o template genérico direciona produtos volynx ao Builder. Assim, os links inspecionados não comprovam identificação da conta, onboarding Cloud ou envio de e-mail de ativação pelo fluxo atual. Recibos próprios do Stripe não foram avaliados.

## Correção preparada

- src/pages/maintenance/index.astro: os três CTAs passam a abrir um briefing, com parâmetro plan validado, e um aviso bilíngue explica que os valores são referência e que escopo, moeda, SLA e backups serão alinhados antes de assinar.
- src/pages/contact.astro: o pedido de Maintenance seleciona o tipo correto e inclui Opal, Saphyra ou Diamond no texto inicial. Somente os três nomes permitidos entram no briefing; não há envio automático.
- public/js/translations.js: CTAs e aviso PT/EN atualizados.

Os valores comerciais permanecem como referência. Os links Stripe continuam ativos no provedor; esta correção não muda cobranças ou assinaturas existentes. A integração automática de contratação Cloud precisa de escopo próprio, identificação autenticada, catálogo de preços/moedas e onboarding/e-mails específicos antes de voltar a prometer ativação imediata.

## Validações

Build Astro de 105 páginas, verificação sintática das traduções e git diff --check passaram. Navegador localhost: os três destinos selecionaram Maintenance e preencheram o plano correto; PT e EN foram conferidos, incluindo o briefing em português. Não foi enviado formulário nem e-mail. A inspeção mobile revelou overflow preexistente do fundo decorativo; ajustes experimentais desse fundo foram descartados e não fazem parte do patch. Não declaramos QA mobile integral aprovado.

Sem commit/push/deploy. initial-015 permanece doing até aprovação/publicação e verificação pública desta correção. O patch remove a promessa de ativação direta; não implementa e-mail Cloud nem comprova entrega.
