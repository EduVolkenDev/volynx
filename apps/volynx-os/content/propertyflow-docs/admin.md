# PropertyFlow — Guia do painel administrativo

Este guia é pra **quem vai operar o site no dia a dia**: adicionar propriedades, atender leads, curar a vitrine. Escrito pra corretor, não pra programador.

Disponível em **Professional** e **White-Label**. No Starter não tem painel — as propriedades ficam num arquivo JSON editado na mão.

Tempo pra aprender tudo: **30 minutos**. Depois, operação do dia a dia leva 15-30 min/dia.

---

## Parte 1 — Entrar no painel (2 minutos)

### Primeiro acesso

1. Abre o navegador e vai em `https://seusite.com.br/admin` (se ainda está testando localmente, `http://localhost:5173/admin`)
2. Vai aparecer uma tela de login. Digite seu email (o mesmo que você colocou em `VITE_ADMIN_EMAIL` no arquivo de configuração)
3. Clica em **"Enviar link mágico"** (ou "Send magic link")
4. Abre seu email. Em menos de 1 minuto chega um email do PropertyFlow com um link
5. Clica no link. Você está dentro.

### Próximos acessos

- O link mágico expira em 15 minutos, mas sua sessão fica ativa por 30 dias.
- Se precisar entrar de outro computador, repita o processo. Cada dispositivo tem sua própria sessão.

### "Não recebi o email do link mágico"

- Confere spam/lixo eletrônico
- Confere se o email que você digitou é EXATAMENTE o que está em `VITE_ADMIN_EMAIL`
- Se ainda não chegar em 5 minutos, vê no Supabase (Settings → Auth → Logs) se o email foi enviado. Se foi, é problema do seu provedor de email.

---

## Parte 2 — Tour do painel (5 minutos)

Depois do login, você está na **Visão Geral**. Menu lateral à esquerda tem:

- **Visão Geral** (🏠) — resumo: leads novos, visitas da semana, propriedades em destaque
- **Imóveis** (🏢) — lista, criar, editar, arquivar
- **Leads** (✉️) — inquéritos recebidos pelos formulários
- **Corretores** (👥) — só Professional+ com multi-agent ativo
- **Configurações** (⚙️) — ajustes gerais

No topo:

- **Campo de busca** — procura por endereço, título, email de lead
- **Sino de notificações** — leads novos, propriedades com views altos
- **Seu avatar** — sair, trocar conta

---

## Parte 3 — Adicionar a primeira propriedade (10 minutos)

No menu, clica **Imóveis → + Nova propriedade**.

O formulário tem **quatro abas**. Vou explicar cada uma.

### Aba 1: Básico

Informações essenciais da propriedade.

- **Título:** o que aparece no card e na página. Seja descritivo. Bom: `"Cobertura duplex com vista mar, Ipanema"`. Ruim: `"Apartamento"`.
- **Descrição:** texto longo. Aceita formatação (negrito, itálico, listas, links). Escreva como humano fala, não como anúncio de jornal.
  - Bom: "Cobertura de 280m² com vista 180° do mar. Sala de estar integrada com terraço coberto. Três suítes com closet. Garagem para dois carros. A 5 minutos do Posto 9."
  - Ruim: "Ótimo apto! 3 qts, 2 vgs, vista mar. Lazer completo. Oportunidade!!!"
- **Tipo:** Apartamento / Casa / Cobertura / Terreno / Comercial / Aluguel (configurável em `src/config/property-types.ts`)
- **Status:** À venda / Para alugar / Vendido / Alugado / Fora do mercado
- **Em destaque?** Toggle — se ligado, essa propriedade aparece na homepage e tem badge "Destaque".

### Aba 2: Localização

- **Endereço completo:** rua, número, bairro, cidade, estado, CEP
- **Pino no mapa:** PropertyFlow tenta localizar automaticamente pelo endereço. Se errar, você pode arrastar o pino pra posição correta.
- **Mostrar endereço exato?** Toggle. Se desligado, só aparece "Ipanema, Rio de Janeiro" no site público — útil pra imóveis de alto padrão onde o dono não quer exibir o número exato.

### Aba 3: Detalhes

- **Preço:** digite só números, sem pontos nem vírgulas. Exemplo: `2500000` pra R$ 2.500.000. O site formata automaticamente.
- **Moeda:** R$ / USD / EUR / GBP
- **Área:** em m² (padrão) ou sqft
- **Quartos** / **Banheiros** / **Vagas de garagem**
- **Ano de construção** / **Condição:** Novo, Seminovo, Usado, A reformar
- **Tags:** palavras-chave separadas por vírgula. Exemplos: `pet-friendly, portaria 24h, piscina, academia, varanda gourmet`. Aparecem no filtro.

### Aba 4: Mídia

- **Fotos:** arraste arquivos do seu computador pra dentro da caixa, ou clica pra escolher. **Primeira foto vira a capa.** Arraste pra reordenar.
  - Formato: JPG ou PNG
  - Tamanho ideal: **1920x1080** ou maior
  - Peso máximo: 10 MB por foto
  - Quantidade ideal: **entre 8 e 15 fotos**. Menos parece pobre, mais parece spam.
- **Vídeo do tour (opcional):** cole o link do YouTube, Vimeo ou URL de MP4 direto.
- **Planta baixa (opcional):** PDF ou imagem.

### Salvar

- **Salvar rascunho:** salva sem publicar. Fica visível só pra você.
- **Publicar:** salva e coloca no site público. Aparece imediatamente.

---

## Parte 4 — Dicas pra listings que convertem

Aprendi essas olhando o que funciona nas melhores imobiliárias:

**A primeira foto decide quase tudo.**
- Foto aberta, luz natural, quadro nivelado
- Evita: foto escura, com gente no enquadramento, vertical desfocada
- Se tiver vista, esteja visível

**Descrição tem 3 parágrafos no máximo.**
- Parágrafo 1: o que é (tamanho, tipo, posição)
- Parágrafo 2: o que tem de diferente (vista, reforma, detalhe especial)
- Parágrafo 3: vizinhança e acesso (o que tem perto, quanto tempo pro aeroporto)

**Preenche TODOS os detalhes.**
- Cliente filtra por "3 quartos". Se você não preencheu quartos, sua propriedade não aparece no filtro.

**Tags específicas ganham.**
- Tags genéricas (`moderno`, `bonito`) não ajudam ninguém.
- Tags específicas (`pet-friendly`, `home-office dedicado`, `vista mar frontal`) trazem buyer qualificado.

**Use 8–15 fotos, na ordem certa:**
1. Foto principal (capa)
2. Sala
3. Cozinha
4. Quartos
5. Banheiros
6. Varanda / área externa
7. Vista
8. Área comum do prédio (se tiver)

---

## Parte 5 — Gerenciar leads (10 minutos)

Toda vez que um cliente preenche o formulário de contato (em qualquer propriedade ou no formulário geral), vira um **lead** no painel.

### A página de Leads

Menu **Leads**. Você vê uma lista com:
- Nome, email, telefone, propriedade de origem (se tiver), quando chegou, status

Clica num lead pra abrir detalhes completos:

- **Mensagem completa** do cliente
- **Histórico** (quantas vezes ele visitou o site, quais propriedades viu)
- **Botão "Responder"** — envia email direto do painel, usando seu email configurado em `contact.email` do `brand.ts`. O cliente recebe como se você tivesse mandado do Gmail/Outlook.
- **Status:** Novo / Contatado / Visitando / Fechado / Frio
- **Atribuir a corretor** (só Pro+ com multi-agent)
- **Nota interna:** texto visível só pra você e sua equipe. Usa pra registrar "cliente preferiu visitar na quinta" ou "já fez uma proposta de 2.2M".

### Fluxo padrão de atendimento

1. Lead chega → você recebe email de notificação e vê aparecer no painel
2. Responde em **no máximo 2 horas** durante horário comercial. Quanto mais rápido, maior a conversão.
3. Muda status pra **"Contatado"**
4. Marca visita → status **"Visitando"**
5. Fechou negócio? Status **"Fechado"**. Sem retorno? Status **"Frio"** e arquiva.

### Notificação de leads por email

Toda vez que chega lead novo, um email de notificação vai automaticamente para:
- O email em `VITE_NOTIFY_LEADS_TO` (configurado no `.env.local`)
- Se multi-agent, para o corretor designado

**Se a notificação não estiver chegando:**
- Confere o `.env.local`, linha `VITE_NOTIFY_LEADS_TO`
- Confere se o provedor de email está conectado (Settings → Integrações)
- Clica em **"Enviar lead de teste"** — simula um lead e manda pra ver se chega

### Integrar leads com CRM externo (Pro+)

Se você já usa HubSpot, Pipedrive, Salesforce ou outro CRM, dá pra mandar os leads pra lá automaticamente.

**Configuração rápida:**
1. No CRM, gere uma URL de webhook que aceita POST com JSON
2. No PropertyFlow, Settings → Integrações → cola a URL
3. Pronto — todo lead novo também chega no CRM

Suporte nativo pra **HubSpot, Pipedrive, Salesforce** no White-Label. Ver [INTEGRATIONS.md](INTEGRATIONS.md).

---

## Parte 6 — Corretores e atribuição (Professional com multi-agent ativo)

Se você tem uma equipe, ative o **Multi-agent mode**.

### Ativar

- Configurações → Equipe → liga **"Multi-agent mode"**

### Adicionar corretor

- Equipe → **+ Novo corretor**
- Nome, email (pra login), foto, bio curta, idiomas que fala, especialidades
- O corretor recebe um email com link mágico. Clica e entra no próprio painel.

### Permissões

Cada corretor vê apenas:
- As propriedades dele
- Os leads atribuídos a ele
- Seu próprio perfil público no site

Não vê propriedades ou leads de outros corretores. Só o admin principal vê tudo.

### Atribuir propriedade a um corretor

Na página de edição da propriedade → aba **Básico** → campo **"Corretor responsável"** → seleciona.

### Página pública do corretor

Cada corretor ganha uma página em `/corretores/{slug}` (ex: `/corretores/maria-silva`). Lista todas as propriedades dele, com foto, bio, contato. Clientes podem filtrar propriedades por corretor.

---

## Parte 7 — Controlar o que aparece na homepage

Duas formas:

### Forma A: Toggle "Em destaque" (simples)

- Em cada propriedade, liga o toggle **"Em destaque"**
- PropertyFlow mostra as **6 mais recentemente marcadas como destaque** na homepage
- Qualquer pessoa da sua equipe pode fazer isso sem precisar de dev

### Forma B: Curadoria manual (avançado)

- Abre `src/content/homepage.ts`
- Troca:
  ```typescript
  featured: {
    show: true,
    count: 6,
    manualIds: ["prop_001", "prop_002", "prop_003"], // IDs específicos na ordem que quer
  }
  ```
- Precisa fazer deploy depois (git push → Vercel redeploy)

**Quando usar cada um:**
- **A** pra operação diária. Marketing/gerência liga e desliga sem ajuda.
- **B** pra landing page de lançamento onde a ordem das propriedades importa.

---

## Parte 8 — Analytics (Professional+)

Menu **Analytics**. Três métricas principais:

- **Visualizações por propriedade** — quais estão recebendo atenção
- **Conversão (leads / visualizações)** — quais estão transformando views em contatos
- **Leads por origem** — quais propriedades estão gerando negócio de verdade

**Padrões saudáveis:**
- Conversão de **2-5%** (a cada 100 pessoas que veem uma propriedade, 2-5 preenchem o formulário). Abaixo de 1%, revisa as fotos/descrição.
- Propriedades em destaque recebem **5x a 10x mais views** que as normais.

**Analytics avançado (White-Label apenas):**
- Métricas por corretor, por bairro, por faixa de preço
- Exportação em CSV pra análise no Excel
- Tendências temporais (semana vs mês vs trimestre)

---

## Parte 9 — Manutenção diária

O que fazer pra manter o site saudável:

**Toda manhã (10 minutos):**
- Abre **Leads**, filtra por **"Novo"**
- Responde cada um ou atribui a um corretor
- Arquiva os frios que não voltaram

**Toda sexta (30 minutos):**
- Revisa **Analytics** — quais propriedades performaram
- Desliga **Destaque** de propriedades paradas, liga pras novas
- Confere se alguma propriedade foi vendida na semana e atualiza status

**Uma vez por mês:**
- **Backup do banco de dados** (ver [SUPABASE.md](SUPABASE.md) parte 3)
- Revisa se tem propriedades há mais de 90 dias paradas — atualiza foto, descrição ou arquiva
- Confere se todos os emails de lead estão chegando normalmente

---

## Parte 10 — Problemas comuns

### Upload de foto falha
- **Foto muito grande:** comprima em **https://tinypng.com** antes de subir (sem perder qualidade visível)
- **Formato esquisito:** só JPG, PNG ou WebP funcionam
- **Espaço cheio:** no Supabase tem limite de 1GB no plano grátis. Ver Supabase → Storage pra ver quanto usou.

### Propriedade não aparece no site público
- Confere se o status está **"À venda"** ou **"Para alugar"** (status "Rascunho" não aparece)
- Se acabou de criar, espera 30 segundos — às vezes demora pra propagar

### Lead não está chegando
- Testa tu mesmo: vai no site público logado out, preenche o formulário, vê se aparece no painel
- Se não aparece no painel: problema de banco/Supabase. Olha no Supabase → Table Editor → tabela `leads`.
- Se aparece no painel mas email não chega: problema de provedor de email. Confere Settings → Integrações → Email.

### Email de notificação caindo no spam
- Configura SPF, DKIM e DMARC no domínio (uma vez só, seu provedor de DNS tem painel pra isso)
- Se usa Resend como provedor, verifica domínio em **https://resend.com/domains**

### Não consigo fazer login
- Email digitado está em `VITE_ADMIN_EMAIL` no `.env.local`?
- No Supabase → Auth → Users, seu email tem uma linha ativa?
- Link mágico não chegou? Checa spam. Ainda assim não? Gera outro.

### Propriedade sumiu
- Foi arquivada por alguém. Vai em **Imóveis → Filtros → Status: Arquivado** e desarquive.

---

## Referência rápida de atalhos

| Ação | Atalho |
|---|---|
| Nova propriedade | Dentro de /admin/properties, botão + |
| Busca global | `/` em qualquer página |
| Ir pra Leads | Menu lateral, ou `G L` |
| Ir pra Imóveis | Menu lateral, ou `G P` |
| Sair | Canto superior direito, avatar → Sair |

---

## Precisou de ajuda?

Email **support@volynx.world** com:
- Seu **order ID**
- O que estava tentando fazer
- Screenshot do erro (se houver)
- Tier que você comprou

Resposta em até 24h úteis. Janela de suporte:
- **Professional:** 90 dias a partir da compra
- **White-Label:** 12 meses a partir da compra (priority queue)

Fora da janela, suporte está disponível via documentação e comunidade (White-Label tem Discord dedicado).
