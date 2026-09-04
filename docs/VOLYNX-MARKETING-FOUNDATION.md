# VOLYNX — Marketing Foundation

> Primeiro playbook de aquisição e conversão. Documento interno; não representa uma campanha publicada.

## Direção

A VOLYNX não deve divulgar todos os produtos ao mesmo tempo. A comunicação inicial terá uma porta de entrada clara e dois caminhos de conversão:

- **Dev Journey:** educação prática e gratuita para atrair pessoas que querem aprender a criar produtos digitais.
- **QRGen + Lab:** ferramenta imediatamente útil para transformar curiosidade em uso recorrente e, depois, em upgrade.

O restante do ecossistema aparece como continuidade, não como catálogo na primeira mensagem.

## Funil principal

```text
Conteúdo curto / indicação / busca
        ↓
Signal Drop — uma tensão real, uma solução demonstrável
        ↓
Dev Journey gratuito ou QRGen Free
        ↓
Conta VOLYNX + primeiro resultado salvo ou publicado
        ↓
Dev Journey Pro/Bundle ou QRGen Launch/Pro
        ↓
Retenção: projetos, progresso, suporte e próximos produtos
```

## Mensagem central

**PT-BR:** Aprenda construindo e use ferramentas que transformam a próxima ideia em um resultado real.

**EN-GB:** Learn by building and use tools that turn the next idea into a real result.

Provas que devem aparecer repetidamente:

- o aluno termina com entregas visíveis, não apenas aulas assistidas;
- as ferramentas gratuitas têm utilidade antes do upgrade;
- cada página explica o próximo passo e para quem o produto serve;
- o trabalho do usuário fica organizado na própria conta VOLYNX.

## Campanha inicial — Signal Drop 01

Já existe uma landing em `/signal-drop/` com UTMs e eventos de CTA. Ela deve ser o laboratório editorial da campanha, levando a:

1. **Dev Journey** para conteúdo de educação e transformação;
2. **QRGen/Lab** para demonstração prática e ativação imediata;
3. **Pricing** somente depois que o visitante experimentar ou entender o resultado.

### Eventos mínimos

| Evento | Objetivo |
| --- | --- |
| `signal_view` | medir entrada na campanha |
| `signal_hero_devjourney` | medir interesse em educação |
| `signal_hero_qrgen` | medir interesse em ferramenta |
| `activation_started` | medir início de uso |
| `activation_result` | medir primeiro resultado concluído |
| `upgrade_view` | medir intenção comercial |
| `checkout_started` | medir passagem para compra |

Os eventos devem ser ligados a uma ferramenta de analytics autorizada antes de qualquer compra de mídia. Hoje o repositório contém UTMs e eventos locais, mas não há um provedor de analytics configurado confirmado.

## Conteúdo dos primeiros 14 dias

### Semana 1 — descoberta e prova

- “Você não precisa começar por um curso gigante; precisa de um primeiro resultado.”
- Antes/depois de uma landing criada no Dev Journey.
- Exercício curto: transformar uma ideia vaga em uma página publicada.
- Demonstração de QRGen: criar um QR útil em poucos passos.
- Bastidores: como a VOLYNX organiza produto, ferramenta e aprendizado em um mesmo fluxo.

### Semana 2 — confiança e conversão

- O que um iniciante realmente precisa saber antes de criar seu primeiro site.
- Erros comuns de layout, publicação e organização de projeto.
- Uma aula ou exercício do Dev Journey resolvido do início ao fim.
- Quando o QRGen Free é suficiente e quando Launch/Pro faz sentido.
- Convite para continuar: Dev Journey Pro/Bundle ou QRGen pago, conforme o comportamento do visitante.

## Regras comerciais

- Começar com conteúdo orgânico, lista de espera e testes pequenos.
- Não prometer Pix enquanto a capacidade da Stripe não estiver aprovada.
- Não escalar mídia paga antes de provar checkout, webhook, entitlement, entrega e recuperação.
- Não usar “100% dos alunos” como promessa pública; comunicar método, suporte, prática e entregas.
- Manter PT-BR e EN-GB coerentes em copy, preço, moeda, checkout e retorno.

## Próximo sprint de implementação

1. Transformar `/signal-drop/` em uma landing de campanha com entrada explícita para Dev Journey e QRGen.
2. Criar uma seção de prova do Dev Journey com projetos reais, etapas e resultado final.
3. Padronizar UTMs e eventos nos CTAs principais de home, pricing, Dev Journey e QRGen.
4. Definir o provedor de analytics e o consentimento antes de enviar dados para terceiros.
5. Preparar os primeiros conteúdos e variações de headline para teste controlado.
