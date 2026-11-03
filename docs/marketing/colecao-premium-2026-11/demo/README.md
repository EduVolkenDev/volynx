# Demo PropertyFlow — pacote completo

Tudo o que é preciso para gravar o vídeo demo sem usar a sua voz.

Marca fictícia: **Aurora Imóveis** · Porto Alegre/RS · 16 imóveis · BRL
Selo obrigatório: `Demonstração com dados fictícios`

## Estado atual (2026-11-03)

- Tenant `propertyflow-jp` publicado em `https://propertyflow-jp.volynx.world/`.
- **16 anúncios publicados**, 3 em destaque (10 venda, 6 aluguel).
- Marca, cores e tier `white-label` aplicados; template `classic-grid`.
- **Pendente:** as 79 fotos. Sem foto, o card mostra a inicial do tipo como placeholder.

---

## Arquivos

| Arquivo | O que é |
|---|---|
| `demo-listings.json` | Fonte de verdade. 16 imóveis com texto PT/EN, preço, bairro, features e brief de fotos. |
| `gerar-seed.mjs` | Gera o SQL e os CSVs a partir do JSON. Valida antes de escrever. |
| `seed-demo-listings.sql` | Seed pronto para o SQL editor do Supabase. Insere só anúncios. |
| `demo-listings.csv` | Conferência em planilha. |
| `demo-listings-en.csv` | Campos EN (o schema não tem tabela de tradução). |
| `FOTOS-DA-DEMO.md` | Onde buscar, o que evitar, brief por imóvel, nomenclatura e upload. |
| `../ROTEIRO-SEM-VOZ.md` | Vídeo silencioso com legendas (recomendado), TTS e locutor. |
| `../ROTEIRO-DEMO-PROPERTYFLOW.md` | Roteiro original com VO, storyboard e cortes. |
| `../shotlist.csv` | Os 14 planos, 60s. |

---

## Passo 1 — Tenant da demo

O tenant já está provisionado e é o alvo padrão do seed:

| Campo | Valor |
|---|---|
| Nome | `Aurora Imóveis` |
| Subdomínio | `propertyflow-jp` |
| URL pública | `https://propertyflow-jp.volynx.world/` |
| Template | `classic-grid` |
| Tier | `white-label` |
| Status | publicado |
| Domínio próprio | **vazio** |
| Idiomas | `pt` e `en` |

> O seed **recusa** rodar em site com domínio próprio. É proposital: demo não entra em tenant de cliente.
>
> Se o subdomínio for outro, use `--site` ao gerar o SQL.

---

## Passo 2 — Gerar o SQL

```bash
cd docs/marketing/colecao-premium-2026-11/demo
node gerar-seed.mjs --site propertyflow-jp
```

Saída esperada:

```
seed-demo-listings.sql gerado para o tenant "propertyflow-jp" (insert-only).
  anúncios: 16
  destaques: 3
  venda: 10 · aluguel: 6
  com texto EN completo: 16/16
  fotos previstas: 79
```

Para atualizar anúncios já existentes sem duplicar:

```bash
node gerar-seed.mjs --site propertyflow-jp --upsert
```

---

## Passo 3 — Rodar no Supabase

1. Abra o SQL editor do projeto VOLYNX.
2. Cole **todo** o conteúdo de `seed-demo-listings.sql`.
3. Execute.

O bloco `DO` é atômico: ou insere os 16, ou não insere nada. Ele aborta com mensagem clara se:

- o subdomínio não existir;
- mais de um site usar o mesmo subdomínio;
- o site não for `property-flow`;
- o site tiver domínio próprio;
- o site não tiver `organization_id`.

No fim, o script faz um `select` dos 16 anúncios para conferência.

### Conferir depois

```sql
select count(*) as anuncios, count(*) filter (where status = 'published') as publicados
from public.property_listings
where site_id = (
  select id from public.sites
  where lower(subdomain) = lower('propertyflow-jp')
  order by updated_at desc
  limit 1
);
```

Esperado: `16 | 16`.

---

## Passo 4 — Subir as fotos

Siga `FOTOS-DA-DEMO.md`.

Resumo:

- 79 imagens (5 por imóvel, 4 no terreno).
- Upload **pelo painel**, nunca por SQL.
- O caminho no bucket é gerado automaticamente.
- A primeira foto de cada anúncio é a capa.

---

## Passo 5 — Publicar e verificar

1. Confirme o tenant como publicado.
2. Abra `https://propertyflow-jp.volynx.world/`.
3. Teste os filtros de bairro, tipo e finalidade.
4. Abra um imóvel e navegue pela galeria.
5. Teste no celular (390 px).

Se o subdomínio não resolver, confira o roteamento de tenant antes de gravar. O vídeo não pode começar com uma tela de erro.

---

## Passo 6 — Gravar

Use `../ROTEIRO-SEM-VOZ.md`, seção **A. Demo silenciosa**.

- 60s, 14 planos.
- 69 palavras na tela.
- 1080×1920 e 1920×1080.
- Música instrumental baixa ou silêncio.
- Selo de demo visível durante todo o vídeo.

---

## Limpeza (se precisar refazer)

```sql
-- Remove os anúncios da demo. As linhas de imagem caem por cascade,
-- mas os arquivos no bucket precisam ser removidos à parte.
delete from public.property_listings
where site_id = (
  select id from public.sites
  where lower(subdomain) = lower('propertyflow-jp')
  order by updated_at desc
  limit 1
);
```

Não rode isso em tenant de cliente.

---

## O que o schema não guarda

`title_en`, `summary_en` e `description_en` existem no JSON, mas **não há tabela de tradução** no schema atual. Eles não vão para o banco. Servem para:

- legenda e SRT em inglês;
- exportação futura;
- conteúdo do vídeo em EN.

Se o site precisar de catálogo em dois idiomas, isso é uma mudança de produto, não um ajuste de seed.

---

## Limites desta demo

- As imagens são de banco licenciado, não dos imóveis descritos.
- Os 16 imóveis são inventados.
- Não há depoimento, venda ou resultado real.
- O case Jhonatan Peterson foi desativado de propósito e **não** entra aqui.

A demo prova que o produto funciona. Não prova que ele já gerou receita para alguém. O vídeo não pode sugerir o contrário.
