# PropertyFlow — Guia do Supabase

Este guia explica **o que é o Supabase, por que o PropertyFlow usa, e como mantê-lo seguro e saudável**. Disponível em **Professional** e **White-Label** (Starter não usa Supabase).

Escrito pra não-programador. Termos técnicos explicados quando aparecem.

---

## O que é o Supabase, em plain English

Pensa no Supabase como um **armário digital** onde todas as informações do seu PropertyFlow ficam guardadas. As propriedades que você cadastra, os leads que chegam, os corretores da sua equipe, as fotos dos imóveis — tudo isso mora lá.

**Sem o Supabase, seu PropertyFlow seria uma vitrine vazia.** Com ele, é uma operação de verdade.

**Por que a gente usa o Supabase e não outra coisa:**
- É **grátis** pra começar (até 500MB de dados e 1GB de arquivos — suficiente pra uma imobiliária pequena/média)
- Funciona **automaticamente** — você não precisa configurar servidor, backup, segurança
- Tem **painel visual** — você pode ver os dados sem escrever código
- Integra **autenticação** (login por email mágico) sem você fazer nada
- Se um dia precisar escalar, paga e cresce — sem migração

Se você já tem conhecimento técnico e quer usar outro banco (PostgreSQL próprio, Firebase), dá pra trocar. Mas não recomendo pra quem não é dev.

---

## Parte 1 — O que já está funcionando

Depois que você seguiu o [SETUP.md](SETUP.md), o Supabase já está:

- ✓ **Criado** — você tem um projeto Supabase ativo
- ✓ **Conectado** — PropertyFlow lê e escreve dados nele
- ✓ **Com as tabelas certas** — `properties`, `leads`, `admins`, `agents` (se multi-agent)
- ✓ **Com permissões seguras** — o público só consegue LER propriedades, não editar

Você não precisa fazer mais nada pro PropertyFlow funcionar. Este guia é pra **operar** o Supabase: ver dados, fazer backup, entender segurança.

---

## Parte 2 — Entrar no painel do Supabase

1. Vá em **https://supabase.com**
2. Clica **"Sign in"** no canto superior direito
3. Entra com a mesma conta que você usou no setup (GitHub geralmente)
4. Na lista de projetos, clica no nome do seu projeto (`propertyflow-producao` ou similar)

Você está no **painel do projeto**. No menu esquerdo você vê vários ícones. Os importantes:

- **Table Editor** (📋) — onde você vê e edita os dados (propriedades, leads, etc)
- **Authentication** (🔐) — lista de usuários admin que podem fazer login no seu painel
- **Storage** (📁) — onde as fotos das propriedades ficam guardadas
- **Database** (🗄️) — configurações avançadas de banco de dados
- **Settings** (⚙️) — configurações gerais do projeto

---

## Parte 3 — Backup dos seus dados (IMPORTANTE)

**Faça backup uma vez por mês, no mínimo.** Propriedades, leads e fotos são dados valiosos. Se o Supabase ficar fora do ar (raro) ou você apagar algo sem querer (comum), o backup salva teu pescoço.

### Backup rápido (clique-clique, 2 minutos)

1. No painel do Supabase, menu esquerdo, clica **"Database"**
2. Sub-menu → clica **"Backups"**
3. Clica **"Create backup now"**

Pronto. O Supabase guarda o backup no plano grátis por 7 dias. Pro backup com retenção maior, precisa do plano Pro ($25/mês).

### Backup completo (recomendado mensal)

Isso baixa um arquivo pro SEU computador — mais seguro.

1. Na pasta do PropertyFlow, abre o Terminal
2. Roda o comando:
   ```
   npm run db:backup
   ```
3. Ele baixa dois arquivos num formato de data/hora:
   - `backups/2026-04-21-143022-data.sql` (os dados: propriedades, leads, etc)
   - `backups/2026-04-21-143022-storage.zip` (as fotos)
4. **Guarda esses arquivos em um lugar seguro:** Google Drive, Dropbox, HD externo. Os dois. Não num só.

### Restaurar de um backup

Se algo der errado:

1. Cria um novo projeto Supabase (do zero) ou usa o atual
2. Roda:
   ```
   npm run db:restore backups/2026-04-21-143022
   ```
3. Todos os dados voltam. Fotos também.

**Recomendação:** testa uma restauração uma vez, pra saber que funciona. Cria um projeto Supabase temporário, roda o restore, vê se os dados aparecem, apaga o projeto.

---

## Parte 4 — Ver e editar dados direto no Supabase

Às vezes você quer ver o que está guardado (ou corrigir algo rápido) sem passar pelo painel admin do PropertyFlow.

### Ver uma propriedade

1. Supabase → **Table Editor** (menu esquerdo)
2. Na lista de tabelas, clica **`properties`**
3. Aparece uma planilha com todas as suas propriedades. Cada linha é uma propriedade.

Você pode:
- Rolar horizontalmente pra ver todos os campos
- Clicar numa célula pra editar direto (como Excel)
- Clicar numa linha pra ver em detalhe (painel à direita abre)

### Ver leads

- Table Editor → **`leads`**
- Cada linha é um inquérito que chegou

### Ver usuários admin

- Menu esquerdo → **Authentication** → **Users**
- Lista de emails que podem fazer login no `/admin`
- Pra adicionar alguém, clica **"Invite user"** e digita o email. Essa pessoa precisa também estar em `src/config/admins.ts`.

### Ver fotos

- Menu esquerdo → **Storage**
- Vai ter um bucket chamado `property-images`. Clica.
- Cada pasta é uma propriedade. Cada arquivo é uma foto.

### Atenção ao editar direto

Editar dados direto no Supabase **funciona**, mas:
- Sem validação (você pode criar inconsistência)
- Sem histórico (não dá pra desfazer)
- Sem notificação (se você muda status de "Novo" pra "Fechado" aqui, não dispara email)

**Regra:** use Table Editor pra ver e pra correções pontuais (fixing typo no endereço, por exemplo). Use o painel admin do PropertyFlow pra operação normal.

---

## Parte 5 — Segurança (precisa saber)

O Supabase usa uma coisa chamada **Row Level Security (RLS)**. É um sistema que decide "quem pode ver o quê" nos dados.

### Como está configurado no PropertyFlow

Por padrão (já configurado no setup):

- **Público** (pessoas na internet sem login) pode:
  - Ler propriedades com status "À venda" ou "Para alugar"
  - **Não** pode ler leads, admins, backups — nada sensível
  - **Não** pode editar NADA

- **Admins** (você, logado no `/admin`) podem:
  - Ler e editar tudo

- **Corretores** (se multi-agent ativo) podem:
  - Ler e editar apenas as propriedades e leads atribuídos a eles

Isso já está seguro. Você não precisa fazer nada.

### Quando a segurança poderia quebrar

- Se alguém com acesso técnico ao seu Supabase mudar as regras RLS manualmente
- Se você der a sua chave `service_role` (chave secreta) pra alguém ou colocar ela em código que vai pro navegador

**A chave `anon`** (que está no `.env.local` e vai pro navegador) é segura de expor — ela só consegue fazer o que o RLS permite pro público. **A chave `service_role` é secreta** — ela bypassa tudo. Nunca exponha ela em código do navegador, só em scripts de backend que rodam no seu servidor.

### Checklist de segurança mensal

- [ ] Vai em **Settings → API** no Supabase. Confere se tem só você (ou pessoas autorizadas) com acesso.
- [ ] Vai em **Authentication → Users**. Remove qualquer admin que não deveria mais ter acesso.
- [ ] Se suspeitar que a `anon key` vazou, clica **"Reset"** em Settings → API. Atualiza o `.env.local` e redeployta no Vercel.

---

## Parte 6 — Quando você vai precisar pagar

O plano grátis do Supabase é **suficiente** pra:
- Até ~500 propriedades ativas (dependendo de quantas fotos por propriedade)
- Até ~100 mil visualizações de páginas por mês
- Até 1GB de fotos

Você vai bater um desses limites quando:
- Sua imobiliária crescer pra >500 imóveis ativos
- O site começar a receber tráfego sério (anúncios pagos, SEO forte)
- Acumular muitas fotos de alta resolução

### O que acontece quando bate limite

O Supabase **te avisa antes** (email com "você está com 80% do limite"). Não derruba o site sem aviso.

Quando acontecer:

1. **Plano Pro ($25/mês):** resolve 99% dos casos. 8GB de dados, 100GB de arquivos, backups diários com 7 dias de retenção.
2. **Upgrade dentro do painel:** Settings → Subscription → Upgrade to Pro. 1 clique.

Não precisa pagar com antecedência. Paga quando precisar.

---

## Parte 7 — Atualizar o banco (migrations)

Quando o PropertyFlow lança uma nova versão que muda a estrutura do banco (exemplo: adiciona o campo "tour video URL" que antes não existia), você precisa rodar **migrations**.

### Quando isso vai acontecer

Toda vez que você atualizar pra uma nova versão do PropertyFlow (minor ou major), o email de release notes vai dizer: "esta versão inclui uma migration do banco".

### Como rodar

1. **Faça backup antes** (Parte 3 deste guia)
2. No Terminal, pasta do PropertyFlow, roda:
   ```
   npm run db:migrate
   ```
3. Espera ~30 segundos
4. Se aparecer "migrations applied successfully", deu certo
5. Se aparecer erro, **restaura o backup** e email pra gente

### Por que backup antes

Migration é a operação mais arriscada no banco. 99% das vezes roda liso. No 1% que não roda, você precisa do backup pra restaurar ao estado de antes e tentar de novo depois que a gente te ajudar a descobrir o problema.

---

## Parte 8 — Problemas comuns

### "Database connection error" no site
**Causa:** chaves do Supabase erradas no `.env.local` ou no Vercel.

**Fix:**
1. Vai no Supabase → Settings → API → copia as chaves de novo
2. Confere `.env.local` no seu computador
3. Confere no Vercel → Settings → Environment Variables
4. Redeploy se mudou no Vercel

### Foto subiu mas não aparece no site
**Causa:** arquivo muito grande ou formato errado.

**Fix:**
1. Supabase → Storage → `property-images` → acha a foto que subiu
2. Se ela está lá: problema é no frontend (cache do navegador). `Ctrl+Shift+R`.
3. Se ela não está: o upload falhou. Confere tamanho (max 10MB) e formato (JPG/PNG/WebP).

### Deletei uma propriedade sem querer
**Fix:** 
- **Nas últimas 7 dias:** Supabase → Database → Backups → restaura o backup automático mais recente antes da deleção. **Cuidado:** isso sobrescreve TUDO. Você perde qualquer mudança depois do backup.
- **Mais de 7 dias:** só se você tem backup manual (ver Parte 3).

### Lead sumiu
**Provavelmente:** status foi mudado pra "Arquivado", não deletado.
- Vai em leads, filtros → mostrar arquivados → procura

**Se foi realmente deletado:** mesmo procedimento de "deletei propriedade sem querer".

### "Permission denied" ao tentar ver dados no Table Editor
**Causa:** você não está logado com a conta certa no Supabase.

**Fix:** sai e entra de novo. Confere que você está no projeto certo (canto superior esquerdo tem o nome).

### Email de reset de senha não chega
**Causa:** o Supabase usa um email padrão que pode cair em spam.

**Fix:** 
- Checa spam
- Supabase → Authentication → Email Templates → configura SMTP próprio (tipo Resend) — leva 10 minutos, resolve pra sempre

---

## Parte 9 — Comandos úteis de referência

Dentro da pasta do PropertyFlow, no Terminal:

```bash
# Ver o status do banco
npm run db:status

# Aplicar migrations novas (depois de atualizar o PropertyFlow)
npm run db:migrate

# Fazer backup (salva em ./backups/)
npm run db:backup

# Restaurar de um backup
npm run db:restore backups/2026-04-21-143022

# Seedar com dados de demonstração (CUIDADO — apaga tudo que tem no banco)
npm run db:seed

# Resetar o banco pra estado vazio inicial (CUIDADO — apaga tudo)
npm run db:reset
```

Os comandos **CUIDADO** são destrutivos. Use só se souber o que está fazendo, e sempre com backup antes.

---

## Parte 10 — Quando pedir ajuda

Coisas que você pode fazer sozinho com este guia:
- Backup e restore
- Ver dados no painel
- Entender segurança
- Atualizar versão

Coisas em que provavelmente vai precisar do nosso suporte:
- Estrutura do banco quebrou (erros estranhos de migration)
- Suspeita de vazamento de dados
- Performance degradou muito (site lento)
- Quer customizações avançadas (tabelas novas, campos novos)

Email **support@volynx.world** com:
- Seu order ID
- Screenshot do erro ou descrição detalhada
- O que você tentou antes de pedir ajuda

Resposta em 24h úteis (priority queue pra White-Label).

---

## Próximos passos

- **Aprenda o painel admin:** [ADMIN.md](ADMIN.md)
- **Customize a marca:** [CUSTOMIZATION.md](CUSTOMIZATION.md)
- **Multi-tenant (White-Label):** [MULTI_TENANT.md](MULTI_TENANT.md)

Se chegou até aqui e faz backup todo mês, teu Supabase está saudável. Volta neste guia só se der problema.
