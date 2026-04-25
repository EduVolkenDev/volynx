# PropertyFlow — Guia de instalação

Este guia leva você **da pasta baixada até seu site no ar**, sem precisar de programador.

Tempo total: **45 minutos a 1h30**, dependendo do quão confortável você está com computador.

Você vai instalar uma ferramenta (Node.js), rodar quatro comandos simples, e publicar na internet. É tudo. Não precisa saber programar.

---

## Antes de começar — o que você precisa ter

**No seu computador:**
- Windows, Mac ou Linux (qualquer um funciona)
- Pelo menos 15 minutos sem interrupção
- Acesso à internet

**Contas gratuitas que você vai criar durante o processo:**
- Uma conta no **Supabase** (onde os dados das propriedades ficam) — só Professional e White-Label
- Uma conta no **Vercel** ou **Netlify** (onde o site vai rodar)
- Um **domínio** (opcional, mas recomendado) — tipo `minhaimobiliaria.com.br`

Se alguma dessas palavras assusta, **não se preocupe** — vamos explicar cada uma na hora em que você for usar.

---

## Glossário de 60 segundos

Termos que você vai ver aparecer. Leia uma vez e volte aqui sempre que precisar.

- **Terminal (ou Prompt de Comando):** a tela preta onde você digita comandos. Intimidador, mas a gente só vai usar 4 comandos no total.
- **Node.js:** uma ferramenta que faz o PropertyFlow funcionar no seu computador. Você instala uma vez, nunca mais pensa nisso.
- **npm:** gerenciador que baixa as peças do PropertyFlow pra você. Vem junto com o Node.js.
- **Variável de ambiente:** uma configuração que você guarda num arquivo de texto. Tipo um "cofrinho de senhas" pro site.
- **Deploy:** ato de publicar o site na internet. "Fazer deploy" = "publicar".
- **Domínio:** o endereço do seu site. Tipo `minhaimobiliaria.com.br`.

Beleza. Bora lá.

---

## Passo 1 — Baixar e descompactar o PropertyFlow (5 minutos)

Você já tem o arquivo **propertyflow-[seu-tier]-v1.0.0.zip** no seu computador (veio no email de entrega).

**No Windows:**
1. Ache o arquivo no Explorador de Arquivos (geralmente em "Downloads")
2. Clique com o botão direito no arquivo
3. Escolha **"Extrair tudo..."**
4. Escolha uma pasta onde descompactar (sugestão: **Documentos**)
5. Clique **"Extrair"**

**No Mac:**
1. Ache o arquivo no Finder (geralmente em "Downloads")
2. Dê dois cliques nele
3. Uma pasta nova vai aparecer ao lado do arquivo ZIP

**No Linux:**
- Você sabe o que fazer.

**Resultado esperado:** você agora tem uma pasta chamada algo como `propertyflow-starter` (ou `-professional` / `-white-label`). Dentro dela tem arquivos como `package.json`, uma pasta `src`, uma `public`, etc.

---

## Passo 2 — Instalar o Node.js (10 minutos, só na primeira vez)

O Node.js é a ferramenta que faz tudo funcionar. Instala uma vez, serve pra sempre.

**Como saber se você já tem:**
1. Abra o Terminal (Mac) ou Prompt de Comando (Windows)
   - **Mac:** aperte `Command + Espaço`, digite "Terminal", aperte Enter
   - **Windows:** aperte a tecla Windows, digite "cmd", aperte Enter
2. Digite exatamente isso e aperte Enter:
   ```
   node --version
   ```
3. **Se aparecer algo tipo `v20.11.0`** ou número maior: ✓ você já tem, **pule pro Passo 3**.
4. **Se aparecer "command not found" ou "não é reconhecido":** você precisa instalar. Continue abaixo.

**Instalando o Node.js:**
1. Abra seu navegador e vá em **https://nodejs.org**
2. Na página, vai ter dois botões grandes. Clica no da **esquerda** (o que diz "LTS" — significa "versão estável").
3. Um arquivo vai baixar. Quando terminar:
   - **Windows:** dê dois cliques no arquivo `.msi`, clique "Next" em todas as telas, clique "Install", espere terminar, clique "Finish".
   - **Mac:** dê dois cliques no arquivo `.pkg`, clique "Continue" em todas as telas, digite sua senha quando pedir, espere terminar.
4. **Feche o Terminal** (ou Prompt) que estava aberto e **abra de novo**. Isso é importante — precisa reiniciar pra reconhecer.
5. Teste de novo com `node --version`. Agora deve mostrar o número.

> **Se ainda não funcionar:** reinicie o computador. Em 99% dos casos resolve.

---

## Passo 3 — Abrir a pasta do PropertyFlow no Terminal (2 minutos)

Agora você vai navegar até a pasta que descompactou.

**Jeito fácil (recomendo):**
1. Abra a pasta do PropertyFlow no Explorador/Finder
2. **No Windows:** clique na barra de endereço do Explorador (em cima), apague o caminho que estiver lá, digite `cmd` e aperte Enter. O Prompt vai abrir JÁ dentro da pasta.
3. **No Mac:** abra o Terminal, digite `cd ` (com espaço depois), e arraste a pasta do PropertyFlow lá pra dentro do Terminal. Aperte Enter.

**Como saber se deu certo:**
- Digite `ls` (Mac/Linux) ou `dir` (Windows) e aperte Enter.
- Você deve ver uma lista com nomes tipo `package.json`, `src`, `public`, `README.md`.
- Se aparecer isso, você está no lugar certo. ✓

---

## Passo 4 — Instalar as peças do PropertyFlow (5-10 minutos)

Esse passo baixa tudo que o PropertyFlow precisa pra funcionar. Roda uma vez, leva um tempinho.

No Terminal (ainda dentro da pasta do PropertyFlow), digite exatamente isso:

```
npm install
```

Aperte Enter.

**O que vai aparecer:**
- Muita letrinha passando rápido na tela. Isso é **normal**.
- Pode demorar 3 a 10 minutos dependendo da sua internet.
- No final, vai aparecer algo como "added 342 packages".

**Se aparecer avisos amarelos ("warning"):** ignora. É normal.
**Se aparecer erros vermelhos e parar tudo:** ver seção **Problemas comuns** no final deste guia.

---

## Passo 5 — Configurar o arquivo de segredos (10 minutos)

Toda aplicação web moderna tem um arquivo de "segredos" (senhas, chaves, configurações). No PropertyFlow ele se chama **`.env.local`** e você precisa preencher.

No Terminal, digite:

```
cp .env.example .env.local
```
(Mac/Linux)

ou

```
copy .env.example .env.local
```
(Windows)

Aperte Enter. Isso cria uma cópia do arquivo de exemplo que você vai editar.

**Agora edite o arquivo:**
1. Abra a pasta do PropertyFlow no Explorador/Finder
2. Ache o arquivo `.env.local` (se não aparecer, ative "Mostrar arquivos ocultos" no seu explorador)
3. Clique com o botão direito → **"Abrir com" → "Bloco de Notas"** (Windows) ou **"TextEdit"** (Mac)

Você vai ver algo como:

```
# Supabase
VITE_SUPABASE_URL=cole-aqui-depois
VITE_SUPABASE_ANON_KEY=cole-aqui-depois

# Site
VITE_SITE_URL=http://localhost:5173

# Admin (primeira conta)
VITE_ADMIN_EMAIL=seuemail@exemplo.com

# Tier (starter | professional | white-label)
VITE_PROPERTYFLOW_TIER=professional
```

### Se você comprou o tier **Starter:**

- Troque `VITE_PROPERTYFLOW_TIER` por **starter**
- Pode **ignorar** as linhas do Supabase (deixe como estão) — Starter não usa backend
- Troque `VITE_ADMIN_EMAIL` pelo seu email real
- Salve o arquivo e feche

**Pula pro Passo 7.**

### Se você comprou **Professional** ou **White-Label:**

Você precisa criar uma conta no **Supabase** pra guardar as propriedades. Continue pro Passo 6.

---

## Passo 6 — Criar conta no Supabase (só Professional e White-Label, 15 minutos)

O Supabase é o "armário" onde ficam as informações das suas propriedades (fotos, preços, descrições, leads). É grátis pra começar. Uma imobiliária pequena nunca paga nada.

**Passo 6.1: Criar conta**
1. Abra seu navegador e vá em **https://supabase.com**
2. Clique em **"Start your project"** (botão verde no canto superior direito)
3. Clique em **"Continue with GitHub"** (ou crie conta com email)
4. Se for via GitHub, aceite as permissões

**Passo 6.2: Criar um "projeto" (o armário vazio)**
1. Clique em **"New project"**
2. Selecione a organização (vai ter uma default com seu nome)
3. **Name:** digite `propertyflow-producao` (ou qualquer nome, é só pra você identificar)
4. **Database Password:** gere uma senha forte (clique no ícone de dado 🎲 se tiver). **GUARDE essa senha em algum lugar seguro** — tipo num gerenciador de senhas ou num papel físico. Se perder, não dá pra recuperar.
5. **Region:** escolha a mais perto dos seus clientes. Brasil → **East US (Virginia)** é rápido. Portugal/Europa → **EU West**. UK → **EU West** também.
6. **Pricing Plan:** **Free** (sempre).
7. Clique **"Create new project"**.

**Espera ~2 minutos** enquanto o Supabase monta tudo. Você vai ver uma tela com várias setinhas rodando.

**Passo 6.3: Pegar as chaves que você precisa**

Quando terminar, você vai estar no painel do projeto. Do lado esquerdo, vai ter um menu. Faça o seguinte:

1. No menu esquerdo, clique no ícone de **engrenagem** (Settings) lá no final
2. Clique em **"API"** (sub-menu que aparece)
3. Você vai ver uma página com duas informações importantes:
   - **Project URL** (começa com `https://abcdef...supabase.co`)
   - **Project API keys** — copie a que diz **`anon public`** (não a `service_role` — essa é secreta)

**Passo 6.4: Colocar as chaves no `.env.local`**

Volta no arquivo `.env.local` que você abriu antes:

```
VITE_SUPABASE_URL=https://abcdef...supabase.co       ← cola a Project URL aqui
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...longa-string   ← cola a anon key aqui
```

Salve o arquivo e feche.

**Passo 6.5: Criar as tabelas no Supabase**

Volta no Terminal (ainda dentro da pasta do PropertyFlow). Digite:

```
npm run db:setup
```

Aperte Enter.

Isso cria as tabelas de propriedades, leads, admins no Supabase. Dura uns 30 segundos.

**Se aparecer "database setup complete":** ✓ seguiu.

**Se aparecer erro de conexão:** volta e confere se as chaves no `.env.local` foram coladas SEM aspas e SEM espaços antes/depois.

---

## Passo 7 — Rodar o PropertyFlow no seu computador (2 minutos)

Agora você vai ver o site funcionando **localmente**, antes de colocar na internet.

No Terminal, digite:

```
npm run dev
```

Aperte Enter.

**O que vai aparecer:**

```
VITE v7.0.0  ready in 847 ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.10:5173/
```

**Abra o navegador e vá em http://localhost:5173**

Deve aparecer o PropertyFlow rodando com propriedades de demonstração.

**Teste:**
- Clica numa propriedade → deve abrir a página dela
- Clica no toggle de idioma (canto superior direito) → muda pra português
- Digita no campo de busca → resultados filtram

Se tudo aparecer e funcionar: 🎉 **o PropertyFlow está rodando no seu computador.**

**Pra parar:** volta no Terminal e aperte `Ctrl + C`. Pra rodar de novo, `npm run dev`.

---

## Passo 8 — Publicar na internet pelo Vercel (15 minutos)

Rodar no seu computador só funciona enquanto você está na frente dele. Pra ficar 24/7 online, a gente usa o **Vercel** — um serviço gratuito que coloca seu site no ar.

**Passo 8.1: Colocar os arquivos num repositório Git**

"Git" é um sistema onde o Vercel busca os arquivos. Você vai usar o **GitHub**, que é grátis.

1. Vá em **https://github.com** e crie uma conta (se não tem)
2. No canto superior direito, clique no **+** e depois em **"New repository"**
3. **Repository name:** `meu-propertyflow` (qualquer nome)
4. **IMPORTANTE:** marque **"Private"** (porque a licença proíbe você deixar o código público)
5. **NÃO** marque nenhum dos checkboxes de "Add a README", "Add .gitignore", "Add license"
6. Clique **"Create repository"**
7. Na próxima tela, **copie a URL que aparece** (algo como `https://github.com/seu-usuario/meu-propertyflow.git`)

Agora volta no Terminal (dentro da pasta do PropertyFlow) e digita os comandos abaixo, UM POR VEZ, apertando Enter entre cada um:

```
git init
git add .
git commit -m "Initial setup"
git branch -M main
git remote add origin COLE-A-URL-AQUI
git push -u origin main
```

(substitua `COLE-A-URL-AQUI` pela URL que você copiou do GitHub)

Se pedir login do GitHub, use seu usuário. Se pedir senha, GitHub agora pede um **"Personal Access Token"** em vez de senha:
- Vá em **https://github.com/settings/tokens**
- Clique **"Generate new token" → "Generate new token (classic)"**
- Marca a caixa **"repo"** (a primeira)
- Clica "Generate token" no final
- Copia o token que aparece e usa como senha no Terminal

**Passo 8.2: Conectar ao Vercel**

1. Vá em **https://vercel.com/signup**
2. Clique em **"Continue with GitHub"** e autorize
3. No painel do Vercel, clique **"Add New..." → "Project"**
4. Vai listar seus repositórios do GitHub. Clica **"Import"** no `meu-propertyflow`
5. Numa tela de configuração:
   - **Framework Preset:** deve detectar "Vite" automaticamente
   - **Build Command:** `npm run build` (padrão)
   - **Output Directory:** `dist` (padrão)
   - Expande **"Environment Variables"** e cole cada linha do seu `.env.local` como uma variável separada. Exemplo:
     - Name: `VITE_SUPABASE_URL` / Value: `https://...supabase.co`
     - Name: `VITE_SUPABASE_ANON_KEY` / Value: `eyJhbGciOi...`
     - etc.
   - **Importante:** troca `VITE_SITE_URL=http://localhost:5173` por `VITE_SITE_URL=https://o-site-que-o-vercel-der.vercel.app` DEPOIS da primeira publicação.
6. Clica **"Deploy"**

**Espera 2-3 minutos** enquanto o Vercel compila e publica.

Quando terminar, aparece uma tela com um preview do site e um botão **"Visit"**. Clica nele → seu PropertyFlow está **NO AR**.

A URL vai ser algo tipo `meu-propertyflow-abc123.vercel.app`. Feia, mas funciona. No próximo passo a gente coloca seu domínio real.

---

## Passo 9 — Conectar seu domínio (10 minutos)

**Se você não tem domínio ainda:**
- Compra um em **https://registro.br** (domínios .br), **https://godaddy.com** ou **https://cloudflare.com/products/registrar/**
- Custa ~R$40/ano pra `.com.br`, ~$10/ano pra `.com`

**No Vercel:**
1. No painel do projeto, clica na aba **"Settings"**
2. Clica **"Domains"** no menu esquerdo
3. Digite seu domínio (ex: `minhaimobiliaria.com.br`) e clica **"Add"**
4. O Vercel vai mostrar DNS records pra você adicionar

**No seu provedor de domínio (Registro.br, GoDaddy, Cloudflare):**
1. Entra no painel do domínio
2. Procura por **"DNS"** ou **"Zone"** ou **"Name servers"**
3. Adiciona os records que o Vercel mostrou. Geralmente são:
   - Um **A record** apontando pra `76.76.21.21`
   - Um **CNAME record** `www` apontando pra `cname.vercel-dns.com`

**Espera de 10 minutos a 24 horas** (geralmente 30 min) pro DNS propagar. O Vercel te avisa quando estiver pronto.

Depois que propagar, volta no Vercel → Settings → Environment Variables → edita `VITE_SITE_URL` pra `https://seudominio.com.br` → redeploy (botão no canto superior direito → Redeploy).

🎉 **Seu PropertyFlow está no ar no seu domínio.**

---

## Passo 10 — Entrar no painel admin (2 minutos, Professional e White-Label)

No Starter você adiciona propriedades editando o arquivo JSON. No Professional/White-Label você tem um painel visual.

1. Vá em `https://seudominio.com.br/admin`
2. Digite o email que você colocou em `VITE_ADMIN_EMAIL` no passo 5
3. Clica **"Send magic link"**
4. Vai um email pra você com um link. Clica no link.
5. Pronto — você está dentro do painel.

A partir daí, segue **[docs/ADMIN.md](ADMIN.md)** pra aprender a usar o painel.

---

## Problemas comuns (e como resolver)

### "node: command not found" ou "não é reconhecido"
**Causa:** Node.js não instalado, ou você não reiniciou o Terminal depois de instalar.
**Fix:** Feche TODOS os terminals abertos. Abre um novo. Testa `node --version`. Se não funcionar, reinicia o computador.

### `npm install` fica travado em "fetching" por mais de 10 minutos
**Causa:** Internet lenta ou bloqueada.
**Fix:** Tenta de novo. Se persistir, conecta numa rede diferente (celular como roteador, por exemplo).

### Erro `EACCES` no `npm install` (Mac/Linux)
**Causa:** Problema de permissão.
**Fix:** Roda `sudo chown -R $USER:$(id -gn) ~/.npm` e tenta de novo. (Só faz isso se souber o que está fazendo. Se em dúvida, email.)

### "Supabase connection error"
**Causa:** Chaves no `.env.local` coladas errado.
**Fix:** Volta no Passo 6.4. Confere que:
- Não tem aspas nas chaves
- Não tem espaços no início/fim
- `VITE_SUPABASE_URL` termina com `.supabase.co` e não com barra `/`

### `npm run dev` funciona mas a página localhost:5173 fica em branco
**Causa:** Variáveis de ambiente não carregaram.
**Fix:** Para o servidor (`Ctrl+C` no terminal). Confere que o arquivo se chama **`.env.local`** (com ponto no início, exatamente assim). Roda `npm run dev` de novo.

### Vercel build falhou com "missing environment variable"
**Causa:** Você não colou todas as variáveis no Vercel.
**Fix:** Settings → Environment Variables → adicione a que está faltando → redeploy.

### DNS não propagou depois de 1 hora
**Causa:** Configuração DNS errada ou cache do seu provedor.
**Fix:** Testa em **https://www.whatsmydns.net** — digita seu domínio e vê se está resolvendo globalmente. Se estiver verde no mundo todo mas ainda não carrega pra você, é cache local — tenta em outro navegador, celular com 4G, ou aguarda.

### Algo diferente está acontecendo
**Email com screenshot:** `support@volynx.world` com:
- Seu **order ID** (tá no email de compra)
- O **passo exato** onde travou
- **Screenshot** do erro
- Qual **tier** você comprou

Respondemos em 24h úteis. Se for bug crítico bloqueando o setup, mais rápido.

---

## Já publicou? Próximos passos

1. **Customize o visual:** [CUSTOMIZATION.md](CUSTOMIZATION.md) — troca cores, logo, textos. Sem tocar em código.
2. **Adiciona propriedades:** [ADMIN.md](ADMIN.md) — aprende o painel. (Só Professional/White-Label. Starter: edita o JSON direto.)
3. **Configura emails de leads:** vem no [ADMIN.md](ADMIN.md) também — pra você receber notificação quando alguém preenche o formulário de contato.

Se chegou até aqui, **você não precisa mais de programador.** Você fez. 🎉

— A equipe VOLYNX
