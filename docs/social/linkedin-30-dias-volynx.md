<!-- Extracted from Claude transcript: /Users/eduardovolken_1/.claude/projects/-Users-eduardovolken-1-VOLYNX--claude-worktrees-practical-elbakyan-32c38b/aeaa30ea-9d9e-4170-9f2e-dd3294ffccda.jsonl -->
<!-- Date recovered: 2026-05-12 -->

# Calendário LinkedIn 30 dias — Eduardo Volken / VOLYNX

A lógica do calendário: começamos com **build in public** (semana 1) porque é o ângulo mais fácil de "perdoar" um perfil novo — ninguém precisa te conhecer pra achar interessante um founder mostrando como construiu algo real. Na **semana 2** entramos em **opinião com osso** depois que o feed já te viu uma vez construindo — opinião sem credibilidade prévia soa arrogante, opinião depois de mostrar trabalho soa autoridade. **Semana 3** mistura **demo de produto** (carrossel, formato que LinkedIn premia em alcance) com mais opinião — agora o algoritmo já tem sinal sobre quem você é. **Semana 4** fecha com **bastidores reais** (vulnerabilidade) e o último build in public mais ambicioso — quem chegou até aqui já te segue ou tá perto, então pode receber o lado humano sem parecer performático.

Posts caem terça, quarta e quinta entre 8h-10h (BRT) como default — janela B2B de maior alcance no Brasil. Carrossel vai numa quarta (dia de maior peso pra nativo document). Posts de bastidores vão sexta tarde ou sábado manhã (audiência criadora, menos competição, mais comentário longo).

---

## Semana 1 — Apresentação via trabalho real

### Post 1 — Build in public

**Tipo:** texto + 1 screenshot do produto (Image Suite com a foto sendo processada no navegador, DevTools aberto mostrando network 0 requests)
**Dia/horário:** Terça, 08h30 BRT

**Hook:**
Removi a dependência que custava 400 dólares por mês e ninguém percebeu a diferença.

**Corpo:**
Removi a dependência que custava 400 dólares por mês e ninguém percebeu a diferença.

Migrei a remoção de fundo do VOLYNX de uma lib proprietária (imgly) pra um modelo open-source rodando direto no navegador do usuário — U²-Net em ONNX runtime.

O que isso muda na prática:

A imagem nunca sai do computador de quem tá usando. Zero upload, zero servidor processando, zero log de "ah mas onde foi parar aquela foto que eu mandei".

Custo marginal por uso: zero. Antes eu pagava por chamada de API. Agora o modelo baixa uma vez (~170MB cacheados) e roda no WebAssembly local.

Licença Apache-2.0 em vez de proprietária. Posso embarcar onde eu quiser sem renegociar nada.

O trade-off honesto: a primeira execução é mais lenta (modelo precisa carregar). Da segunda em diante, é instantâneo e funciona offline.

Pra quem tá construindo SaaS: toda dependência paga é uma dívida silenciosa. Vale a pena revisitar trimestralmente se o open-source já alcançou o que a versão paga oferecia há dois anos. Quase sempre alcançou.

A versão local tá rodando em produção há semanas. Ninguém abriu ticket reclamando.

Já fizeram essa troca de proprietário pra open-source em algum produto de vocês? Qual foi o resultado?

**Hashtags:** #buildinpublic #saas #opensource #webdev

---

### Post 2 — Build in public

**Tipo:** só texto
**Dia/horário:** Quarta, 09h00 BRT

**Hook:**
Escolhi Astro em vez de Next.js pro meu SaaS. Três meses depois, tenho opinião.

**Corpo:**
Escolhi Astro em vez de Next.js pro meu SaaS. Três meses depois, tenho opinião.

Quando comecei o VOLYNX, todo mundo no meu Twitter empurrava Next. App router, server components, edge runtime, o pacote.

Resisti. Fui de Astro 5 + Supabase + Stripe.

O que aconteceu:

Build time do site inteiro: 12 segundos. O dist final é estático, vai pro Cloudflare Pages, e o CDN serve em milissegundos no mundo todo. Sem cold start, sem servidor caindo às 3 da manhã.

Autenticação client-side com Supabase resolve 95% do que eu precisaria de SSR. Os outros 5% (Stripe checkout) rodam num Express minúsculo separado.

i18n eu fiz com 80 linhas de JavaScript vanilla lendo data-attributes. Sem framework de tradução, sem build-time generation. Troca de idioma é instantânea.

A parte impopular: Astro não é a resposta certa pra todo mundo. Se seu produto precisa de SSR real em cada request (dashboards pesados, multi-tenant complexo), Next ainda ganha.

Mas pra um SaaS onde 90% das páginas são marketing + algumas rotas autenticadas? Astro entrega mais rápido, mais barato e com muito menos cerimônia.

A escolha "padrão" do Twitter raramente é a escolha certa pro seu caso específico. Vale parar e perguntar o que você realmente precisa antes de instalar o framework que tá em alta.

Qual stack vocês usariam pra um SaaS solo hoje?

**Hashtags:** #astro #webdev #saas #indiehackers

---

### Post 3 — Opinião com osso

**Tipo:** só texto
**Dia/horário:** Quinta, 08h45 BRT

**Hook:**
Lancei o VOLYNX com tokens em vez de assinatura mensal. Sei que vou contra a maré.

**Corpo:**
Lancei o VOLYNX com tokens em vez de assinatura mensal. Sei que vou contra a maré.

Todo SaaS guru fala em MRR previsível, churn baixo, expansão de receita. Assinatura é a religião oficial.

Eu fui de pacotes de tokens. 12, 32, 80 ou 200. Você compra, usa quando quiser, não tem mensalidade.

Por que:

A maioria das ferramentas criativas é usada em rajadas. Você precisa gerar 40 coisas numa semana de campanha e depois nada por dois meses. Assinatura nesse padrão é desperdício — e o usuário sabe disso. Por isso ele cancela.

Tokens espelham consumo real. Ação classe A custa 1 token. Classe E custa 20. O usuário sente o custo da escolha dele, não paga por capacidade ociosa.

Não preciso fingir que "todo mundo usa todo dia". Posso construir features pesadas (processamento de imagem, gerador de portfolio, QR dinâmico) sem inflacionar o preço da mensalidade pra cobrir o usuário caro.

A contraparte honesta: receita menos previsível, gráfico mais feio pra investidor, métrica de retenção mais difícil de explicar.

Mas eu não tô levantando rodada. Tô construindo um produto que precisa fazer sentido pro usuário antes de fazer sentido pra planilha de SaaS metrics.

Assinatura virou default porque é confortável pra quem vende, não porque é justo pra quem compra.

Você cancelaria menos assinaturas se elas fossem cobradas por uso real?

**Hashtags:** #pricing #saas #indiehackers #founders

---

## Semana 2 — Opinião e profundidade técnica

### Post 4 — Opinião com osso

**Tipo:** só texto
**Dia/horário:** Terça, 09h00 BRT

**Hook:**
Processar imagem do usuário no seu servidor é uma decisão de produto, não uma decisão técnica.

**Corpo:**
Processar imagem do usuário no seu servidor é uma decisão de produto, não uma decisão técnica.

E é uma decisão ruim na maioria dos casos.

Quando você sobe a foto do usuário pro seu backend pra "processar", você assumiu três coisas que provavelmente não queria assumir:

Primeira: responsabilidade legal sobre aquele arquivo. Se a foto tem rosto de criança, documento, dado sensível — você tá no fluxo. LGPD não diferencia "eu só ia processar e descartar" de "eu armazenei".

Segunda: custo variável que escala com sucesso. Cada usuário novo é mais GPU, mais banda, mais storage temporário. Seu produto fica mais caro de operar exatamente quando ele tá indo bem.

Terceira: latência que você não controla. A rede do usuário, sua rede, a fila do servidor. Tudo entre o clique e o resultado.

No VOLYNX a remoção de fundo roda inteira no navegador. ONNX runtime + modelo U²-Net carregado uma vez. A imagem nunca sai do computador.

Foi mais trabalho de implementação? Sim. Algumas semanas a mais. Vale cada hora.

A regra que eu sigo agora: se o processamento pode rodar no cliente sem comprometer a experiência, ele vai rodar no cliente. Servidor é pra coisa que cliente não consegue fazer — não pra coisa que dá pra empurrar pra lá por preguiça arquitetural.

A web em 2026 tem WebAssembly, WebGPU, modelos quantizados rodando em telefone. A gente ainda tá fazendo upload de PNG pra Lambda como se fosse 2016.

Onde mais vocês veem essa preguiça arquitetural ainda dominante?

**Hashtags:** #webdev #privacy #saas #arquitetura

---

### Post 5 — Build in public

**Tipo:** texto + screenshot (dashboard do QR analytics mostrando scans por geografia)
**Dia/horário:** Quinta, 08h30 BRT

**Hook:**
QR code estático é folheto. QR code dinâmico é ativo.

**Corpo:**
QR code estático é folheto. QR code dinâmico é ativo.

Acabei de subir o módulo de QR dinâmico do VOLYNX e a diferença prática merece dois parágrafos.

Um QR estático é uma URL congelada dentro de um quadradinho. Você imprimiu errado? Imprimiu de novo. A campanha mudou? Imprimiu de novo. Quer saber quantas pessoas escanearam? Não sabe.

Um QR dinâmico é um redirecionador com identidade. O quadradinho aponta pra um endereço seu, e você decide pra onde aquele endereço manda em tempo real.

O que isso destrava:

Editar o destino depois de impresso. O cartaz já tá colado no metrô e você precisou trocar a landing page. Edita no painel, todo mundo que escanear daqui pra frente vai pro novo destino.

Analytics real. Quantos scans, em que dia, em que cidade, em que horário. Dado em vez de palpite.

Quotas por plano. Você não paga por scan ilimitado quando seu negócio só precisa de mil por mês.

A parte chata do backend que ninguém vê: rate limiting honesto, RLS no Supabase pra cada usuário só ver os QRs dele, cron job limpando scans antigos, tabela de logs separada pra não inflar a tabela principal.

Construir o que aparece na tela é 30% do trabalho. Os outros 70% são as guardrails invisíveis que fazem o produto não explodir no segundo mês.

Quem usa QR dinâmico em campanha hoje? O que vocês acompanham além do número total de scans?

**Hashtags:** #buildinpublic #marketing #saas #produto

---

## Semana 3 — Demonstração e segunda onda de opinião

### Post 6 — Demo do produto (carrossel)

**Tipo:** carrossel nativo (PDF de 8 slides)
**Dia/horário:** Quarta, 09h00 BRT

**Hook (também slide 1):**
Como remover o fundo de 20 fotos sem mandar nenhuma pra servidor nenhum.

**Corpo (texto que acompanha o carrossel no post):**
Como remover o fundo de 20 fotos sem mandar nenhuma pra servidor nenhum.

Fiz um passo a passo do Image Suite do VOLYNX rodando 100% no navegador. Modelo open-source, sem upload, sem fila.

Funciona pra foto de produto, foto de pessoa, screenshot de tela. O modelo (U²-Net) foi treinado pra segmentação de objeto saliente — ele acerta a borda mesmo em cabelo, contorno irregular, transparência sutil.

A primeira foto demora alguns segundos porque o modelo precisa baixar uma vez. Da segunda em diante é instantâneo, e funciona offline depois disso.

Quem trabalha com produto, e-commerce, portfolio: salva o carrossel. Vai economizar tempo.

Link da ferramenta no primeiro comentário.

**Estrutura dos slides:**

- **Slide 1 (capa/hook):** Texto grande sobre fundo escuro — "Como remover o fundo de 20 fotos sem mandar nenhuma pra servidor nenhum." Subtítulo pequeno: "Image Suite do VOLYNX. 100% no navegador."
- **Slide 2:** Screenshot da tela inicial do Image Suite com a área de drop. Anotação: "Arrasta a foto aqui. Nenhum upload acontece."
- **Slide 3:** Screenshot do DevTools aberto na aba Network durante o processamento. Anotação: "Zero requests. A imagem nunca sai do seu computador."
- **Slide 4:** Antes/depois de uma foto de produto com fundo branco virando transparente. Anotação: "Borda limpa, sem halo."
- **Slide 5:** Antes/depois de foto de pessoa com cabelo solto. Anotação: "Funciona em cabelo. É onde quase todo modelo falha."
- **Slide 6:** Grid de 6 thumbnails processadas em batch. Anotação: "Processa em lote. Resultado fica no navegador."
- **Slide 7:** Comparação visual: "Servidor: upload + fila + download. Local: processa direto. Mesma qualidade, sem rede no meio."
- **Slide 8 (CTA):** "Testa grátis em volynx.world/image — link no primeiro comentário. Segue pra mais coisa rodando no browser que servidor não precisa fazer."

**Hashtags:** #design #produtividade #webdev #ecommerce

---

### Post 7 — Opinião com osso

**Tipo:** só texto
**Dia/horário:** Quinta, 08h45 BRT

**Hook:**
"Onde tá o time?" — perguntou um investidor olhando meu deck. Não tem time. Sou eu.

**Corpo:**
"Onde tá o time?" — perguntou um investidor olhando meu deck. Não tem time. Sou eu.

A reação dele foi a esperada: solo founder técnico não escala, precisa de co-founder, precisa de marketing, precisa de vendas.

Provavelmente ele tem razão pra um tipo de empresa. Não tem razão pro tipo que eu tô construindo.

Solo técnico em 2026 tem três alavancas que time de 5 pessoas em 2018 não tinha:

Primeira: a stack ficou absurda. Astro builda em segundos, Supabase resolve auth e banco numa tarde, Stripe processa cobrança em três arquivos. O trabalho que demandava dois backend e um devops agora demanda atenção e bom gosto.

Segunda: modelo open-source de qualidade. Eu rodo segmentação de imagem com U²-Net que era state-of-art em 2020 e hoje é um arquivo de 170MB. Isso era licença de meio milhão de dólares cinco anos atrás.

Terceira: distribuição direta. Não preciso de SDR, não preciso de agência. Posts honestos no LinkedIn alcançam quem precisa alcançar, se o produto for honesto também.

A parte que ninguém posta: solo técnico é solitário, é lento em algumas coisas que time faz rápido, e tem dias que você só queria alguém pra revisar PR.

Mas a métrica não é "quão confortável é construir". É "o produto sai e ele é bom?". E pra muita categoria de SaaS hoje, sai melhor com uma pessoa decidindo tudo do que com cinco discutindo tudo.

Co-founder não é requisito. É decisão.

Quem aqui é solo founder técnico? Como tá indo?

**Hashtags:** #solofounder #indiehackers #saas #empreendedorismo

---

### Post 8 — Opinião com osso

**Tipo:** texto + 1 foto (foto do Eduardo no setup de trabalho, ou foto candid trabalhando)
**Dia/horário:** Sexta, 14h00 BRT

**Hook:**
Tem uma diferença entre "lancei rápido" e "lancei cedo". Eu lancei cedo. Não recomendo.

**Corpo:**
Tem uma diferença entre "lancei rápido" e "lancei cedo". Eu lancei cedo. Não recomendo.

Lançar rápido é botar na rua um produto pequeno e bem feito. Uma feature, funcionando bem, cobrada certo, com documentação.

Lançar cedo é botar na rua um produto que ainda tá pensando em voz alta. Três features pela metade, preço chutado, página de pricing que muda toda semana.

Eu fiz a segunda versão antes de aprender que existia diferença.

O VOLYNX hoje tem Image Suite, Kits, QR dinâmico, PropertyFlow e Portfolio. Cinco produtos sob uma marca. Lançados quase juntos, porque eu queria mostrar amplitude.

Erro. O usuário que chega não consegue te explicar o que você faz pra outra pessoa. E se ele não consegue explicar, ele não recomenda. E se ele não recomenda, você tá pagando por todo tráfego.

O que tô fazendo agora: cada peça de conteúdo, cada anúncio, cada conversa, foca em UM produto. Image Suite essa semana. Kits no mês que vem. Quando alguém entender o que é Image Suite e amar, eu mostro Kits. Não antes.

Amplitude impressiona quem já te conhece. Profundidade conquista quem nunca ouviu falar de você.

Se você tá perto de lançar, escolhe a feature mais clara e mais defensável e lança SÓ ela. As outras quatro entram quando a primeira tiver tração.

Cedo demais é pior que devagar. Devagar você corrige. Cedo demais você re-explica pelo resto da vida do produto.

Quem aqui já lançou cedo demais? Como reorganizou depois?

**Hashtags:** #founders #produto #lancamento #indiehackers

---

## Semana 4 — Vulnerabilidade e fechamento

### Post 9 — Bastidores reais

**Tipo:** só texto
**Dia/horário:** Sábado, 09h30 BRT

**Hook:**
Passei dois dias caçando um bug que era uma tag script com atributo defer.

**Corpo:**
Passei dois dias caçando um bug que era uma tag script com atributo defer.

Conto porque talvez economize a semana de alguém.

No VOLYNX o header mostra quantos tokens o usuário tem. Número simples, vem do Supabase, renderiza no canto da tela.

Tava aparecendo "—" pra metade dos usuários. Pra outra metade aparecia certo. Mesmo navegador, mesma rota, comportamento diferente.

Primeiro dia: achei que era cache do Cloudflare. Não era. Limpei tudo, voltou o problema.

Segundo dia: achei que era race condition no Supabase auth. Comecei a colocar await em coisa que já era await. Não era.

A real: o script que buscava os tokens (vx-tokens.js) tava com `defer` na tag. O script inline do header rodava antes do deferred terminar de carregar. Pra usuário com conexão rápida, o deferred chegava a tempo. Pra usuário com conexão lenta ou primeira visita, o inline lia `window.VxTokens` que ainda não existia, e renderizava o traço.

A correção foi feia: polling no inline esperando o objeto existir, cache local com fallback, fetch direto se polling estourar timeout.

A lição que ficou: defer e async são otimização real, mas quebram qualquer suposição de ordem entre scripts. Se um script depende do outro, ou eles viram um só, ou o dependente precisa esperar explícito.

Bug bobo. Custou dois dias. Tô anotando aqui pra não cair de novo — e pra quem tiver caindo agora ter onde procurar.

Qual foi o bug mais embaraçoso que vocês caçaram esse ano?

**Hashtags:** #webdev #debugging #javascript #devlife

---

### Post 10 — Bastidores reais

**Tipo:** só texto, ou texto + 1 foto candid (Eduardo num momento real, não foto de banco de imagem)
**Dia/horário:** Quinta, 09h00 BRT (encerrando a semana 4)

**Hook:**
Cancelei uma chamada com investidor essa semana porque eu tava errado sobre o que queria.

**Corpo:**
Cancelei uma chamada com investidor essa semana porque eu tava errado sobre o que queria.

A chamada tava marcada há duas semanas. Eu tinha preparado deck, números, projeção. Dormi mal na noite anterior.

Acordei e percebi que tava preparando aquela chamada com a mesma energia de quem prepara entrevista de emprego. Querendo agradar. Antecipando objeção. Ensaiando resposta pra pergunta que talvez nem viesse.

Aí caiu a ficha: eu não queria capital. Eu queria validação.

Capital eu pego quando tiver problema que dinheiro resolve. Hoje meu problema é distribuição, e dinheiro não resolve distribuição direto — resolve via marketing pago, que não casa com o tipo de produto que eu tô construindo agora.

Validação eu não devia estar pegando de investidor. Investidor avalia se ele faz dinheiro com você, não se seu produto é bom. São duas coisas correlacionadas mas não iguais.

Mandei mensagem cancelando. Reagendei pra daqui a seis meses, quando eu tiver número que justifique a conversa.

Postei isso aqui porque tem muito founder solo lendo, marcando reunião com investidor no terceiro mês de produto, voltando da reunião com a autoestima rachada porque o investidor disse "interessante, me manda quando tiver mais tração".

A reunião nunca era pra acontecer. Você só queria que alguém com terno te dissesse que tava no caminho certo. Custou caro em emoção, custou dia de trabalho, e a resposta tava dentro de você o tempo todo.

Faz a reunião quando o produto pede. Não quando a sua insegurança pede.

Já passaram por isso? Como reorganizaram a régua interna depois?

**Hashtags:** #founders #solofounder #empreendedorismo #saas

---

## Notas finais sobre execução

**Primeiros 60 minutos depois de cada post:** Eduardo responde toda menção e todo comentário com extensão real (pelo menos 1-2 frases), não com "valeu!". Esse é o sinal de qualidade que o feed usa pra decidir se distribui mais.

**Antes de publicar:** 15 minutos comentando em 5 posts de outros founders/devs brasileiros relevantes. Comentário substantivo, não emoji. Isso "esquenta" o algoritmo e a audiência antes do post sair.

**Link do produto:** sempre no primeiro comentário, nunca no corpo do post. LinkedIn pune link externo no body.

**Reciclagem:** o post 1 (U²-Net) e o post 6 (carrossel Image Suite) cobrem o mesmo produto em formatos diferentes — se o carrossel performar bem, vale fazer versão em vídeo curto pro próximo ciclo. O post 7 (solo founder) e o post 10 (cancelar investidor) são candidatos a virarem newsletter de abertura quando o canal newsletter for ligado.

**O que não fizemos de propósito:** nenhum post de "5 lições que aprendi", nenhuma frase motivacional, nenhum "estou animado pra compartilhar". Cada post tem ou um fato técnico defensável, ou uma opinião com posição clara, ou uma história específica com data e número. É isso que diferencia um founder técnico brasileiro de uma conta genérica de LinkedIn.
