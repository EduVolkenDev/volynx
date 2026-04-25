# PropertyFlow — Toolkit de migração (White-Label)

Este guia mostra como **trazer dados de propriedades de outros sistemas** (Imovelweb, VivaReal, ZAP, Aglow, planilhas) pro PropertyFlow, sem digitar uma propriedade de cada vez.

**Disponível apenas no White-Label.** Tiers menores migram manualmente pelo painel admin.

Tempo de migração típico:
- **≤50 propriedades:** 30 min a 1h
- **50-500 propriedades:** 1h a 4h
- **500+ propriedades:** meio dia, dependendo de fotos

---

## Parte 1 — Estratégia geral

Migração tem 3 passos:

1. **Exportar** dados do sistema antigo pra um arquivo (geralmente CSV)
2. **Transformar** o arquivo pro formato que o PropertyFlow espera
3. **Importar** via comando no Terminal ou pelo painel

O toolkit cobre os 3. Você vai precisar de:

- Acesso ao sistema antigo (pra exportar)
- Terminal do PropertyFlow rodando localmente ou no servidor
- ~1 hora pra a primeira migração (depois fica rápido)
- **Backup completo ANTES** de qualquer import

---

## Parte 2 — Exportar do sistema antigo

Os principais sistemas do Brasil e como exportar:

### Imovelweb

1. Login no painel
2. Menu **"Meus Imóveis"** → **"Exportar"** (no canto superior direito)
3. Escolhe **"Exportar em CSV"**
4. Baixa o arquivo

Formato típico: CSV com colunas `titulo, tipo, bairro, cidade, preco, quartos, banheiros, garagem, descricao, fotos`

### VivaReal (Grupo ZAP)

1. Acesso corretor: `canal.vivareal.com.br`
2. Menu **"Ferramentas"** → **"Exportação de Anúncios"**
3. Baixa em CSV ou XML

### ZAP Imóveis

1. Painel do corretor
2. **"Meus anúncios"** → **"Exportar todos"**
3. Formato XML (padrão DOMUS). O toolkit converte XML pra o formato PropertyFlow.

### Aglow

1. Aglow → **"Relatórios"** → **"Imóveis"**
2. Filtro "Todos ativos"
3. **"Exportar CSV"**

### Rezult, Siga-me, Jetimob e outros sistemas brasileiros

Quase todos exportam em CSV ou XML padrão DOMUS. O toolkit aceita ambos.

### Planilha Excel ou Google Sheets

Se os imóveis estão numa planilha:
1. Baixa em formato **CSV** (File → Export → CSV)
2. Usa o template do toolkit (próxima seção) pra alinhar colunas

### Sistema customizado ou esotérico

Se tem API, usa ela. Se tem banco, exporta em CSV com as colunas certas. **O que o PropertyFlow precisa por propriedade (mínimo):**

- `titulo` (texto, obrigatório)
- `tipo` (apartamento/casa/cobertura/terreno/comercial)
- `status` (venda/aluguel/vendido)
- `preco` (número)
- `cidade`, `bairro` (texto)
- `descricao` (texto longo)
- `quartos`, `banheiros`, `vagas`, `area_m2` (números)
- `fotos` (URLs separadas por vírgula OU caminhos locais)

Qualquer outro campo (ano, condição, tags, endereço exato, etc) é opcional.

---

## Parte 3 — Template de CSV (formato PropertyFlow)

Se precisa criar um CSV do zero ou re-organizar um export, use este template. Está em `tools/migrate/template.csv`:

```csv
slug,title,type,status,price,currency,address_street,address_number,neighborhood,city,state,country,postal_code,latitude,longitude,show_exact_address,bedrooms,bathrooms,parking,area_m2,year_built,condition,description,tags,images,featured,agent_email
apt-ipanema-001,Apartamento vista mar Ipanema,apartment,for_sale,2500000,BRL,Av Vieira Souto,1234,Ipanema,Rio de Janeiro,RJ,BR,22420-000,-22.9847,-43.2018,true,3,2,2,145,2015,new,"Apartamento com vista mar 180 graus, três suítes...","vista-mar,portaria-24h,varanda-gourmet",https://exemplo.com/foto1.jpg|https://exemplo.com/foto2.jpg,true,eduardo@silvaimoveis.com.br
casa-jardim-botanico-002,Casa Jardim Botanico,house,for_rent,15000,BRL,Rua Jardim Botanico,500,Jardim Botanico,Rio de Janeiro,RJ,BR,22460-000,-22.9684,-43.2232,false,4,3,3,280,1998,renovated,"Casa de 4 quartos em condomínio fechado...","condominio-fechado,piscina","https://exemplo.com/casa1.jpg",false,ana@silvaimoveis.com.br
```

**Colunas importantes explicadas:**

- `slug`: ID único da propriedade, só letras minúsculas, números e traços. Exemplo: `apt-vista-mar-ipanema-001`. Se deixar vazio, o toolkit gera automático.
- `type`: `apartment`, `house`, `penthouse`, `land`, `commercial`, `rental` (os valores que você configurou em `property-types.ts`)
- `status`: `for_sale`, `for_rent`, `sold`, `rented`, `off_market`
- `currency`: `BRL`, `USD`, `EUR`, `GBP`
- `images`: URLs separadas por pipe `|` (não vírgula, porque descrições têm vírgulas)
- `tags`: separadas por vírgula
- `featured`: `true` ou `false`
- `agent_email`: se multi-agent ativo, atribui a esse corretor

---

## Parte 4 — Converter arquivos de outros formatos

### Converter CSV de Imovelweb

```bash
npm run migrate:convert -- \
  --from imovelweb \
  --input ./exports/imovelweb-2026-04-21.csv \
  --output ./migrations/propertyflow-ready.csv
```

Converte automaticamente as colunas do Imovelweb pro formato PropertyFlow. Te avisa se alguma propriedade está incompleta (falta título ou preço, por exemplo) e te deixa decidir se pula ou aborta.

### Converter XML DOMUS (ZAP, VivaReal)

```bash
npm run migrate:convert -- \
  --from domus \
  --input ./exports/zap-listings.xml \
  --output ./migrations/propertyflow-ready.csv
```

### Converter de planilha Excel

```bash
npm run migrate:convert -- \
  --from xlsx \
  --input ./exports/planilha-antiga.xlsx \
  --output ./migrations/propertyflow-ready.csv \
  --mapping ./config/custom-mapping.json
```

O arquivo `custom-mapping.json` diz qual coluna da sua planilha corresponde a qual coluna do PropertyFlow:

```json
{
  "titulo": "title",
  "tipo_imovel": "type",
  "finalidade": "status",
  "valor": "price",
  "descricao_completa": "description",
  "imagens": "images"
}
```

Cria esse mapping uma vez e usa sempre. Dez minutos pra configurar.

### Converter sistemas que não têm suporte nativo

Se seu sistema não está na lista:

1. Exporta em CSV (qualquer formato)
2. Abre no Excel/Google Sheets
3. Reorganiza as colunas pra bater com o template (Parte 3 acima)
4. Salva como CSV
5. Importa com `npm run migrate:convert -- --from csv --input ...`

Vai consumir uma hora na primeira vez. Nas seguintes, já sabe o caminho.

---

## Parte 5 — Fotos: a parte mais tensa

Fotos são o que mais consome tempo e storage. 3 estratégias:

### Estratégia A: Manter URLs originais (mais rápida)

Se o sistema antigo expõe fotos por URL pública (`https://imovelweb.com/foto123.jpg`), você pode simplesmente manter as URLs no CSV. PropertyFlow carrega as fotos direto da URL original.

**Prós:** instantâneo, zero storage.
**Contras:** dependência do sistema antigo (se ele sair do ar, suas fotos somem).

Útil pra **migração provisória** enquanto você transiciona.

### Estratégia B: Baixar todas e subir no Supabase (recomendada)

```bash
npm run migrate:download-images -- --input ./migrations/propertyflow-ready.csv --output ./migrations/images/
```

O toolkit:
1. Lê cada URL do CSV
2. Baixa a imagem
3. Salva em `./migrations/images/` organizado por slug
4. Comprime (otimiza pra web sem perder qualidade)
5. Gera nome de arquivo único

Depois:

```bash
npm run migrate:upload-images -- --input ./migrations/images/ --tenant silvaimoveis
```

Sobe tudo no Supabase Storage (bucket `property-images/silvaimoveis/`). Pra 500 propriedades × 10 fotos cada, leva ~30 minutos.

**Prós:** dados 100% seus, sem dependência.
**Contras:** tempo e storage (~2MB por foto otimizada).

### Estratégia C: Importar sem fotos e cadastrar manualmente

Se as fotos do sistema antigo são ruins, use a migração pra trazer só metadados (título, preço, descrição) e fotografe tudo de novo com qualidade premium.

```bash
npm run migrate:import -- --input ./migrations/propertyflow-ready.csv --skip-images
```

Propriedades entram sem fotos. Seu time sobe foto por foto pelo painel admin (lento mas garante qualidade).

---

## Parte 6 — Rodar a migração

Depois do CSV pronto e fotos resolvidas:

### Dry run (teste sem gravar no banco)

```bash
npm run migrate:import -- \
  --input ./migrations/propertyflow-ready.csv \
  --tenant silvaimoveis \
  --dry-run
```

Simula a importação. Te diz:
- Quantas propriedades seriam criadas
- Se há erros no CSV (linha X com problema)
- Warnings (campo faltando, valor suspeito)

**Sempre rode dry-run primeiro.** Uma vez.

### Import real

```bash
npm run migrate:import -- \
  --input ./migrations/propertyflow-ready.csv \
  --tenant silvaimoveis
```

Processa linha por linha. Pra 500 propriedades leva ~5 minutos.

**No final, mostra um relatório:**
```
✓ Imported: 487
⚠ Skipped (warnings): 8
✗ Failed: 5
Log saved to: migrations/reports/import-2026-04-21.log
```

Linhas que falharam ou foram puladas ficam no log com motivo. Você pode corrigir e re-importar só elas.

### Import incremental (adiciona mais depois)

Se mês que vem mais 50 propriedades entram no sistema antigo:

```bash
npm run migrate:import -- \
  --input ./migrations/novas-abril.csv \
  --tenant silvaimoveis \
  --mode append
```

Adiciona sem apagar as existentes. Detecta duplicatas pelo `slug` — se já existe, **atualiza** em vez de criar duplicada.

---

## Parte 7 — Migrações especiais

### Migração de leads (contatos antigos)

Se o sistema antigo tinha clientes/contatos, você pode trazê-los como leads arquivados:

CSV formato:
```csv
name,email,phone,message,source_property_slug,created_at,status
Maria Silva,maria@exemplo.com,+5521999999999,"Tenho interesse",apt-ipanema-001,2024-03-15,contacted
```

```bash
npm run migrate:leads -- --input ./leads-antigos.csv --tenant silvaimoveis
```

### Migração de corretores

```bash
npm run migrate:agents -- --input ./corretores.csv --tenant silvaimoveis
```

CSV formato:
```csv
name,email,phone,photo_url,bio,specialties,languages
Ana Santos,ana@silvaimoveis.com.br,+5521988888888,https://...,Especialista em Ipanema desde 2010,"venda,aluguel","pt,en"
```

Depois da import, cada corretor recebe um email com link mágico pra configurar a conta.

### Reverter uma migração

Se algo deu errado:

```bash
npm run migrate:revert -- --report migrations/reports/import-2026-04-21.log
```

Remove todas as propriedades criadas naquele import específico. Só funciona se você não fez mudanças manuais depois.

Pra reversão total (voltar ao estado antes da migração):

```bash
npm run db:restore backups/[timestamp-antes-da-migracao]
```

---

## Parte 8 — Pós-migração: checklist

Depois de importar, **antes de mostrar o site pro cliente**, confira:

- [ ] **Contagem bate:** quantidade de propriedades no PropertyFlow = quantidade no sistema antigo (menos as que foram arquivadas/descontinuadas de propósito)
- [ ] **Amostra de 10 propriedades aleatórias:** cada uma tem foto, descrição, preço, endereço corretos
- [ ] **Filtros funcionam:** filtra por tipo, bairro, preço — retorna resultados esperados
- [ ] **Detalhe da propriedade:** abre uma propriedade, vê galeria, formulário de contato, mapa
- [ ] **Site público em produção:** testa em `[tenant].minhaplataforma.com.br`, não só localhost
- [ ] **Leads chegam:** submete formulário de teste, confere se chega no painel e email
- [ ] **Cliente revisou:** mostra pro cliente antes de remover o sistema antigo

---

## Parte 9 — Problemas comuns

### CSV tem caracteres estranhos (á, ç, ã viram lixo)
- **Causa:** encoding errado. CSV salvou em Latin-1 ou Windows-1252 em vez de UTF-8.
- **Fix:** abre no Google Sheets, File → Download → CSV UTF-8. Ou no Excel: Save As → CSV UTF-8.

### Import para na linha X
- Abre o log em `migrations/reports/`
- Procura "Line X: error"
- Corrige o CSV (geralmente é vírgula dentro de uma célula sem aspas, ou valor numérico com texto)
- Re-roda `npm run migrate:import` com `--start-from-line X`

### Fotos não aparecem depois da migração
- Se usou Estratégia A (URLs externas): as URLs quebraram. Re-exporta do sistema antigo, URLs atualizadas.
- Se usou Estratégia B: confere se `npm run migrate:upload-images` rodou de verdade e retornou sucesso. Olha no Supabase → Storage → bucket.

### Slugs duplicados
- Se duas propriedades têm o mesmo slug no CSV, o import falha
- Gera slug automático: deixa a coluna `slug` VAZIA no CSV, o toolkit gera baseado no título

### "Tenant not found" durante import
- Verifica que o tenant existe: `npm run tenant:list`
- Usa exatamente o mesmo `slug` do tenant no `--tenant`

### Import super lento (>30 minutos pra 500 propriedades)
- Provavelmente está fazendo upload de foto durante o import
- Separa em dois passos: primeiro importa sem fotos (`--skip-images`), depois `npm run migrate:upload-images` em background

---

## Parte 10 — Ferramentas manuais no painel

Pra imobiliárias pequenas ou ajustes pontuais, o painel admin tem:

- **Importar CSV** (Propriedades → Importar) — interface visual, faz upload de CSV e importa
- **Exportar propriedades** (Propriedades → Exportar) — útil pra backups manuais ou pra migrar pra outra instância

Limite do importador visual: **100 propriedades por vez**. Acima disso, use o CLI.

---

## Resumo dos comandos

```bash
# Converter arquivos
npm run migrate:convert -- --from imovelweb --input ... --output ...
npm run migrate:convert -- --from domus --input ... --output ...
npm run migrate:convert -- --from xlsx --input ... --output ... --mapping ...

# Fotos
npm run migrate:download-images -- --input ... --output ...
npm run migrate:upload-images -- --input ... --tenant ...

# Importar
npm run migrate:import -- --input ... --tenant ... --dry-run
npm run migrate:import -- --input ... --tenant ...
npm run migrate:import -- --input ... --tenant ... --mode append

# Leads e corretores
npm run migrate:leads -- --input ... --tenant ...
npm run migrate:agents -- --input ... --tenant ...

# Reverter
npm run migrate:revert -- --report ...
npm run db:restore backups/[timestamp]
```

---

## Próximos passos

- **Configurar integrações de CRM** pro novo fluxo de leads: [INTEGRATIONS.md](INTEGRATIONS.md)
- **Customizar a marca** pros tenants: [MULTI_TENANT.md](MULTI_TENANT.md) Parte 4
- **Remover atribuição Volynx:** [WHITE_LABEL.md](WHITE_LABEL.md)

Trava em alguma migração específica: **support@volynx.world** com o log de erro e o sistema de origem. Resposta em 24h úteis (priority White-Label).
