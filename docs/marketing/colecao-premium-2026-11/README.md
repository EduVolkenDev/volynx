# Coleção premium · novembro de 2026

Plano de publicação, links rastreáveis e pacote de demo do PropertyFlow da coleção de 50 peças.

As artes (100 PNGs), as legendas por peça e o `posts.json` ficam na coleção original, em
`~/Downloads/colecao-premium`. Este diretório versiona o que é **texto e código**: plano,
roteiros, dataset da demo, scripts e links.

## Estrutura

| Caminho | O que é |
|---|---|
| `PLANO-DE-PUBLICACAO-30-DIAS.md` | Calendário de 4 semanas por conta e canal, com regra de decisão por funil. |
| `links.csv` | 49 peças × 6 canais, todas com UTM. Peça 38 excluída. |
| `gerar-links.mjs` | Regenera `links.csv` a partir do `posts.json`. |
| `ROTEIRO-DEMO-PROPERTYFLOW.md` | Roteiro de 60s com VO, storyboard e cortes de 30s/15s/LinkedIn. |
| `shotlist.csv` | Os 14 planos da demo, 60s exatos. |
| `ROTEIRO-SEM-VOZ.md` | Demo silenciosa com legendas (recomendado), TTS e locutor terceiro. |
| `demo/` | Dataset de 16 imóveis fictícios, seed SQL e guia de fotos. Comece por `demo/README.md`. |

## Regenerar os links

```bash
node docs/marketing/colecao-premium-2026-11/gerar-links.mjs
```

O script procura `posts.json` nesta ordem:

1. `--posts <caminho>`
2. `COLECAO_POSTS` (variável de ambiente)
3. `posts.json` nesta pasta
4. `../posts.json` (layout antigo)
5. `~/Downloads/colecao-premium/posts.json`

Saída: `links.csv` na pasta do script.

## Regenerar o seed da demo

```bash
cd docs/marketing/colecao-premium-2026-11/demo
node gerar-seed.mjs --site propertyflow-jp
```

## Regras que não mudam

- **Peça 38 não é publicada.** O case Jhonatan Peterson foi desativado de propósito e responde 404.
- **Arte de IA não é print de produto.** As telas da coleção são ilustrativas; o vídeo usa gravação real.
- **Um post, um CTA, um UTM.** Sem link cru no Instagram/TikTok.
- **Demo com marca fictícia.** O tenant da demo leva o selo `Demonstração com dados fictícios`.
- **Nada de dados de cliente no tenant de demo.** O seed recusa site com domínio próprio.

## O que não está aqui

- Imagens (`feed/`, `stories/`, `originais/`, `editaveis/`) — ficam na coleção, fora do git.
- Os 16 posts da campanha de astrologia — vivem no repo `palavras-do-universo`.
- Fotos da demo — precisam ser baixadas de banco licenciado e enviadas pelo painel; ver `demo/FOTOS-DA-DEMO.md`.
