# Calendário da coleção VOLYNX · novembro de 2026

Planejamento de publicação dos **50 assuntos** da coleção `Posts VOLYNX - Português e Inglês`, com feed 4:5 e story 9:16 nos dois idiomas.

> **Nada foi publicado.** Este pacote é o plano validado para importar no agendador depois do refinamento das artes.

## O que já está validado

- 50 assuntos, na ordem narrativa da coleção.
- 200 artes encontradas: feed e story, PT e EN.
- 100 legendas encontradas: uma por assunto em cada idioma.
- 23 itens marcados como `correcao_pendente` e 27 como `refino_pendente`, conforme a auditoria visual de 05/11/2026.
- CTA extraído automaticamente da primeira URL de cada legenda PT/EN.
- Datas sem fins de semana e sem 24/12, 25/12, 31/12 e 01/01.

## Arquivos

| Arquivo | Uso |
|---|---|
| `calendario.csv` | Fonte principal para importar no Meta Business Suite, Buffer, Later ou planilha. |
| `calendario.json` | Versão estruturada para integração com API/script de agendamento. |
| `calendario.md` | Leitura humana: resumo, premissas, tabela e checklist. |
| `gerar-calendario.mjs` | Gera e valida os três arquivos acima. |
| `auditoria-artes.json` | Snapshot da auditoria usada para prioridade e observações. |

## Regras padrão do plano

| Item | Padrão |
|---|---|
| Início | `2026-11-16` (segunda-feira) |
| Cadência | Segunda a sexta, 1 assunto por dia |
| Feed PT | `09:00` `America/Sao_Paulo` |
| Story PT | `12:30` `America/Sao_Paulo` |
| Feed EN | `18:00` `America/Sao_Paulo`, mesma data |
| Story EN | `12:30`, mesma data |
| Janela | 16/11/2026 a 28/01/2027 |
| Formatos | feed 4:5 + story 9:16 por assunto |

O inglês está na mesma data do português. Use as colunas `data_en`/`hora_feed_en` somente se existir um canal inglês separado; se o EN for publicado em outro fuso, ajuste com `--en-feed-time`.

## Como atualizar depois do refinamento

Marcar todos os 50 como prontos:

```bash
node gerar-calendario.mjs --ready=all
```

Marcar apenas os concluídos (exemplo: 1, 2, 4 e 7):

```bash
node gerar-calendario.mjs --ready=1,2,4,7
```

Mudar o início ou a cadência:

```bash
node gerar-calendario.mjs --start=2026-11-09 --weekdays=1,2,3,4,5
```

Publicar em outro fuso/horário:

```bash
node gerar-calendario.mjs --feed-time=10:00 --story-time=18:00 --en-feed-time=19:00 --tz=Europe/London
```

Usar outra pasta de artes:

```bash
node gerar-calendario.mjs --root="/caminho/para/Posts VOLYNX - Português e Inglês"
```

O script falha com uma lista clara se algum dos 300 arquivos estiver faltando.

## Colunas do CSV

| Coluna | Significado |
|---|---|
| `numero`, `slug`, `bloco`, `produto` | Identificação e posição narrativa. |
| `prioridade_auditoria` | `corrigir` ou `refinar`, conforme a auditoria. |
| `status_arte` | `correcao_pendente`, `refino_pendente` ou `pronta`. |
| `status_publicacao` | `aguardando_arte` ou `pronto_para_agendar`. |
| `semana_campanha` | Semana do calendário, começando em 1. |
| `data_pt`, `dia_semana_pt` | Data e dia do feed PT. |
| `hora_feed_pt`, `hora_story_pt` | Horários PT. |
| `data_en`, `hora_feed_en`, `hora_story_en` | Equivalente EN. |
| `feed_pt`, `story_pt`, `feed_en`, `story_en` | Caminhos relativos das artes. |
| `legenda_pt`, `legenda_en` | Caminhos relativos das legendas. |
| `cta_pt`, `cta_en` | Primeira URL encontrada na legenda. |
| `nota_auditoria`, `nota_ingles`, `observacao_story` | Apontamentos da auditoria. |
| `post_id`, `story_id`, `publicado_em`, `observacoes` | Preenchimento durante a publicação. |

## O que ainda precisa de decisão

1. **Canal**: o plano assume Instagram feed + stories. LinkedIn, TikTok e Pinterest precisam de recorte/roteiro próprio.
2. **Conta EN**: confirmar se o inglês vai para um perfil separado ou se as colunas EN devem ser ignoradas.
3. **Horários**: os horários acima são um ponto de partida; o ideal é validar com os insights reais das contas.
4. **Aprovação**: definir se o fluxo é publicação automática, rascunho no agendador ou aprovação manual.
5. **Refino**: marcar cada arte como `pronta` somente depois de revisar a observação correspondente da auditoria.

## Próximo passo recomendado

1. Terminar o refinamento das 27 peças.
2. Rodar `node gerar-calendario.mjs --ready=...` com a lista final.
3. Importar `calendario.csv` no agendador escolhido.
4. Publicar a primeira semana como teste e revisar alcance, salvamentos e cliques antes de programar as 10 semanas.
