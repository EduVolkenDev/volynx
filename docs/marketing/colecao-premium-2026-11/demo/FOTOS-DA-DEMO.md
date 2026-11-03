# Fotos da demo — Aurora Imóveis

Guia operacional para popular o tenant de demonstração do PropertyFlow.
Complementa `demo-listings.json` e `seed-demo-listings.sql`.

Meta: **79 fotos** (15 imóveis × 5 + 1 terreno × 4), em 2 a 3 horas de trabalho.

---

## 1. Regra de ouro

Estas três coisas **não** entram na demo, em nenhuma hipótese:

1. **Foto de imóvel de cliente** — mesmo com autorização verbal. A demo é pública e o imóvel pode já ter sido vendido.
2. **Foto do Google Imagens, portais concorrentes ou anúncio de terceiro** — viola direito autoral e o proprio anúncio pode estar desatualizado.
3. **Foto com pessoa identificável, placa de carro, número de casa ou logo de marca** — cria implicação de endosso e expõe dado de terceiro.

A demo leva o selo `Demonstração com dados fictícios`. Isso cobre a **ficção do dado**, não a **origem da imagem**. Foto roubada continua sendo problema mesmo com selo.

---

## 2. O que é uma foto válida

| Item | Critério |
|---|---|
| Orientação | Horizontal (paisagem). O layout é uma grade; foto vertical quebra o corte. |
| Proporção | 3:2 ou 4:3. |
| Resolução | Mínimo 1600 px no lado maior; ideal 2400 px. |
| Formato de envio | JPEG. O painel otimiza e converte para WebP sozinho. |
| Peso | 300 KB a 1,5 MB por arquivo antes do envio. |
| Luz | Natural ou difusa. Evite flash direto, HDR exagerado e saturação de portal imobiliário. |
| Pessoas | Nenhuma. Nem de costas, nem desfocada no fundo. |
| Texto na imagem | Nenhum. Sem marca d'água, sem legenda, sem preço. |
| Consistência | As 5 fotos do mesmo imóvel devem parecer o **mesmo** imóvel (mesmo piso, mesma paleta). |

> Foto de banco de imagens não é o imóvel real — e não precisa ser. O que mata a credibilidade é a mistura: uma sala de luxo com uma cozinha popular no mesmo anúncio.

---

## 3. Onde buscar

### Opção A — Pexels (recomendada para começar)

Licença conferida em 03/11/2026 em `pexels.com/license`:

- Uso gratuito, inclusive comercial, sem atribuição obrigatória.
- Pode modificar (cropar, ajustar cor).
- **Não pode** vender cópia não modificada, redistribuir como banco de imagens, nem usar como marca.
- **Não pode** implicar endosso de pessoa ou marca retratada.

Busca: `https://www.pexels.com/search/living%20room%20natural%20light/`

### Opção B — Unsplash

Também gratuita para uso comercial, mas o site bloqueou verificação automática da licença em 03/11/2026. **Confira o texto vigente em `unsplash.com/license` antes de usar.** Se usar a API, a atribuição é obrigatória pelos termos da API.

### Opção C — Adobe Stock / Shutterstock (pago)

Use se quiser um resultado mais “corretora de alto padrão”. Custa entre US$ 10 e US$ 30 para 10 créditos. A licença padrão cobre uso comercial em site e social. Guarde a nota fiscal e o ID da imagem.

### Opção D — geradas por IA

Aceitável nesta demo, **desde que**:

- você revise em 100% (IA erra geometria de escada, reflexo, maçaneta, texto em livro);
- nenhuma imagem sugira pessoa real;
- o selo de demonstração continue visível no site.

Para o vídeo, prefira banco licenciado: foto de IA em tela cheia é onde o defeito aparece mais.

---

## 4. Brief por imóvel

`photo_files` já está definido no JSON. Use exatamente estes nomes.

| # | Slug | Fotos | Brief |
|---|---|---|---|
| 1 | `cobertura-duplex-moinhos` | 5 | living amplo com luz natural · terraço com vista · suíte com closet · cozinha integrada · banheiro com banheira |
| 2 | `apartamento-bela-vista` | 5 | living com marcenaria · varanda escritório · quarto de casal · cozinha clara · fachada do prédio |
| 3 | `studio-cidade-baixa` | 5 | ambiente único integrado · cozinha compacta · banheiro · vista da janela · fachada |
| 4 | `casa-tristeza` | 5 | fachada da casa · sala com portas de vidro · jardim · churrasqueira · quarto |
| 5 | `apartamento-auxiliadora` | 5 | sala com duas faces de luz · sala de jantar · suíte · cozinha · fachada arborizada |
| 6 | `sala-comercial-moinhos` | 5 | recepção · sala aberta com estações · sala fechada · copa · fachada do edifício |
| 7 | `cobertura-petropolis` | 5 | piscina com deck · living triplex · escada escultural · suíte principal · vista do terraço |
| 8 | `apartamento-menino-deus` | 5 | sala integrada · cozinha com bancada · quarto · banheiro · fachada |
| 9 | `casa-vila-assuncao` | 5 | fachada preservada · pátio com árvore · cozinha com ilha · living · quarto |
| 10 | `studio-bom-fim` | 5 | ambiente integrado · marcenaria · banheiro com box · janela · fachada |
| 11 | `terreno-belem-novo` | 4 | vista do terreno · frente para a rua · entorno residencial · mapa do lote* |
| 12 | `apartamento-rio-branco` | 5 | sacada com vista · sala · quarto · cozinha · fachada |
| 13 | `cobertura-bela-vista` | 5 | terraço ao pôr do sol · living com lareira · suíte · cozinha · vista |
| 14 | `casa-auxiliadora` | 5 | fachada preservada · living · quintal · quarto · escada |
| 15 | `sala-centro-historico` | 5 | sala com janelas amplas · hall de entrada · detalhe arquitetônico · vista da rua · fachada |
| 16 | `apartamento-tristeza` | 5 | varanda com vista · sala · quarto · cozinha · fachada |

\* O “mapa do lote” é o único caso em que a imagem não é foto. Gere um recorte de mapa estático (OpenStreetMap) sem pin de endereço exato, ou use uma foto aérea do terreno. Não invente um mapa com rua e número.

### Termos de busca que funcionam

| Ambiente | Pexels / Unsplash |
|---|---|
| Living | `living room natural light`, `minimal living room wood floor` |
| Suíte | `bedroom natural light white linen`, `master bedroom wardrobe` |
| Cozinha | `modern kitchen island`, `small apartment kitchen` |
| Banheiro | `bathroom bathtub natural light`, `shower glass bathroom` |
| Terraço | `rooftop terrace city view`, `balcony sunset city` |
| Fachada | `residential building facade`, `townhouse facade` |
| Jardim | `backyard garden trees`, `courtyard tree` |
| Comercial | `office reception desk`, `coworking open space` |
| Piscina | `rooftop pool deck` |
| Terreno | `empty residential lot`, `vacant land street` |

---

## 5. Nomenclatura e organização local

Crie uma pasta por imóvel, com o número da ordem na frente:

```
fotos-demo/
  01-cobertura-duplex-moinhos/
    01-living.jpg
    02-terraco.jpg
    03-suite.jpg
    04-cozinha.jpg
    05-banho.jpg
  02-apartamento-bela-vista/
    01-living.jpg
    02-varanda.jpg
    03-quarto.jpg
    04-cozinha.jpg
    05-fachada.jpg
  ...
  11-terreno-belem-novo/
    01-terreno.jpg
    02-frente.jpg
    03-entorno.jpg
```

Os nomes vêm de `photo_files` no JSON. Não renomeie na mão: se precisar, edite o JSON e rode `node gerar-seed.mjs` de novo.

---

## 6. Como subir (e o que o SQL não faz)

O seed insere **somente os anúncios**. As imagens ficam em `property_listing_images`, que exige `storage_path` de um arquivo que existe no bucket. **Não tente inserir imagens por SQL.**

1. Rode o seed primeiro (`seed-demo-listings.sql`), para os anúncios existirem.
2. Abra o painel: `/dashboard/propertyflow` no domínio da VOLYNX.
3. Selecione o tenant da demo (`aurora-demo`).
4. Em cada anúncio, envie as fotos na ordem do `photo_files`.
5. Defina a capa. A primeira foto deve ser a mais forte do imóvel, não a fachada por padrão.
6. Salve como **publicado**.

O painel calcula o caminho sozinho no formato:

```
{organization_id}/{site_id}/{property_id}/{hash}.webp
```

Não invente esse caminho. Ele é gerado por `buildPropertyFlowImagePath` a partir do hash do conteúdo.

---

## 7. Checklist antes de gravar o vídeo

- [ ] 16 anúncios publicados no tenant `aurora-demo`.
- [ ] 79 imagens carregadas (5 por imóvel, 4 no terreno).
- [ ] Nenhuma foto com pessoa, placa, número de casa ou logo.
- [ ] Nenhuma foto repetida entre dois imóveis.
- [ ] Capa de cada anúncio escolhida.
- [ ] Filtros retornando resultados: bairro, tipo e finalidade.
- [ ] Modal abrindo com a galeria completa.
- [ ] Teste no celular (viewport 390 px) sem overflow.
- [ ] Selo `Demonstração com dados fictícios` visível no rodapé ou na faixa superior.
- [ ] Uma foto de cada imóvel aberta em 100% para conferir se não há artefato de IA.

---

## 8. Aviso que precisa estar no site

Além do selo visual, inclua no rodapé do tenant da demo:

> **Demonstração com dados fictícios.** Imóveis, preços e nomes são inventados. As imagens são de banco licenciado e não representam os imóveis descritos.

Isso protege contra a leitura de que a Aurora Imóveis é uma corretora real anunciando imóveis reais.

---

## 9. Tempo estimado

| Etapa | Tempo |
|---|---|
| Escolher e baixar 79 fotos | 60–90 min |
| Revisar e cortar | 30–45 min |
| Subir e definir capas | 30–45 min |
| QA no celular + filtros | 15 min |
| **Total** | **2h15 a 3h15** |

Se o tempo apertar, faça **6 imóveis completos** em vez de 16 incompletos. O vídeo precisa de: 1 cobertura, 1 apartamento, 1 casa, 1 studio, 1 comercial e o terreno para o filtro de tipo. O resto entra depois.
