# VOLYNX — Execução de marketing 01

Documento operacional para uma operação solo: uma campanha, uma promessa, uma ferramenta de entrada e ciclos curtos de aprendizado.

## O que já ficou preparado

- `/signal-drop/` é a página editorial principal para apresentar a ideia da VOLYNX.
- `/tiktok/` é a landing de bio para levar uma pessoa diretamente ao Image Suite.
- A landing de TikTok agora mostra o produto real, deixa a proposta de privacidade explícita e mantém um CTA principal.
- As páginas Base passam a expor metadados completos para compartilhamento em redes sociais.
- `/signal-drop/` e `/tiktok/` entraram no sitemap público.
- As campanhas mantêm origem, meio, campanha e conteúdo em `sessionStorage` e emitem eventos no navegador. Isso prepara a integração com um provedor autorizado; ainda não é prova de analytics remoto.

## Mensagem de lançamento

**A VOLYNX transforma uma ideia dispersa em um resultado que você consegue usar.**

A primeira demonstração deve ser concreta:

1. remover um fundo sem enviar a imagem para um servidor;
2. criar um QR pronto para uma campanha;
3. aprender construindo uma entrega real.

Não divulgar o catálogo inteiro na primeira mensagem. A pessoa precisa entender uma coisa, experimentar e só então descobrir o ecossistema.

## Ciclo de 7 dias

| Dia | Entrega | Canal | CTA |
| --- | --- | --- | --- |
| 1 | Vídeo curto: remoção de fundo no navegador | TikTok/Reels | `/tiktok/` |
| 2 | Bastidor: por que a imagem não precisa subir | LinkedIn | `/signal-drop/` |
| 3 | Demonstração antes/depois com a mesma imagem | TikTok/Reels | `/tiktok/` |
| 4 | Post salvável: 3 usos para QR dinâmico | LinkedIn/Instagram | `/signal-drop/` |
| 5 | Construindo em público: uma melhoria real da plataforma | TikTok/LinkedIn | `/signal-drop/` |
| 6 | Responder comentários e registrar objeções | Todos | sem CTA novo |
| 7 | Revisar cliques, ativação e perguntas | Interno | decidir o próximo drop |

## Regra de produção para uma pessoa

De cada demonstração real, extrair:

- 1 vídeo de 15–30 segundos;
- 1 captura antes/depois;
- 1 post curto com a decisão técnica ou de produto;
- 1 resposta pública para a objeção mais comum.

Assim, uma sessão de construção vira quatro peças sem transformar o marketing em um segundo emprego.

## Métricas mínimas

- visita por origem (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`);
- clique no CTA principal;
- início da ferramenta;
- primeiro resultado concluído;
- visualização de upgrade;
- checkout iniciado;
- compra, entitlement e entrega confirmados separadamente.

O evento no navegador é apenas uma camada de preparação. Antes de comprar mídia, conectar um provedor de analytics com consentimento e validar a cadeia completa. Não tratar um clique ou uma página HTTP 200 como conversão.

## Próximo bloqueio real

Escolher e autorizar um único provedor de analytics. Depois disso, ligar os eventos `volynx:campaign-event` a esse provedor, revisar consentimento e confirmar a leitura do funil em uma sessão controlada. Sem essa etapa, o marketing orgânico pode começar, mas decisões de escala devem esperar.
