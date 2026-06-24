# Auditoria de Usuário — palavrasdouniverso.com
**Data:** 24 de junho de 2026  
**Método:** Auditoria completa como usuário real (não autenticado) via Chrome  
**Escopo:** Homepage, leitura gratuita, carta do dia, meu universo, baralho, fluxo de pagamento, toggle EN

---

## Resumo executivo

O produto visual é **excelente** — as artes das cartas são profissionais, o design dark é coeso, a copy tem personalidade real. O problema **não está na aparência**: está em 4 pontos concretos que estão causando abandono e os "erros" que os usuários estão reportando.

---

## 🔴 CRÍTICO — Loading em branco ~3 segundos

**Onde acontece:** Homepage, /baralho, provavelmente todas as páginas com hero dinâmico.

**O que o usuário vê:** Tela escura, completamente vazia, por 3 segundos antes de qualquer conteúdo aparecer. Sem spinner, sem skeleton, sem indicação de que algo está carregando.

**Por que os usuários reportam como "erro":** Eles acham que a página quebrou. Em mobile a percepção é ainda pior — usuários saem antes do conteúdo aparecer.

**Fix:** Adicionar skeleton screen ou um fade-in mínimo de ~300ms no hero. Qualquer indicador visual de carregamento resolve a percepção de "página quebrada".

---

## 🔴 CRÍTICO — Fluxo de pagamento perde contexto da compra

**Onde acontece:** Todos os CTAs pagos — "Quero clareza agora" (R$19,90), "Fazer leitura" (R$9,90), "Consultar amor" (R$12,90), "Entrar no Círculo" (R$29,90/mês).

**O que o usuário vê:**
1. Clica em "Quero clareza agora" 
2. É redirecionado para `/entrar?next=/?product=clareza_urgente#produtos`
3. Vê uma tela genérica: **"Continue seu caminho. Entre para proteger suas leituras, acessos e mensagens salvas em todos os seus dispositivos."**
4. Zero menção ao produto que estava prestes a comprar, sem preço, sem contexto

**Por que é problema:** O usuário não entende por que está numa tela de login quando queria pagar. A pergunta natural é "isso é um erro?". Muitos abandonam aqui.

**O `next` param está correto** — após o login redireciona de volta. Mas a tela de login precisa mostrar o contexto: "Para acessar *Clareza Urgente* (R$19,90), entre primeiro."

**Fix:** Ler o `?next` na tela de login. Se contiver `product=X`, mostrar um banner contextual com o nome e preço do produto que o usuário estava prestes a desbloquear.

---

## 🟡 MÉDIO — Nenhum upsell após a leitura gratuita

**Onde acontece:** Após completar o "Caminho das 3 Cartas" gratuito na homepage.

**O que o usuário vê:** As 3 cartas aparecem com descrição resumida → página termina → espaço vazio. Fim.

**Por que é problema:** O usuário acaba de ter uma experiência — está no momento de maior receptividade emocional. Não há nenhum CTA para aprofundar, comprar uma leitura mais detalhada, ou entrar no Círculo. É o maior ponto de conversão do produto e está vazio.

**Fix:** Após revelar as cartas, adicionar um bloco de upsell contextual:
- "Quer a leitura completa com interpretação por tema?" → Clareza Urgente (R$19,90)
- "Ou entre no Círculo para guardar este momento no seu histórico" → R$29,90/mês

---

## 🟡 MÉDIO — Cards do /baralho são não-clicáveis

**Onde acontece:** `/baralho` — página com as 78 cartas.

**O que o usuário vê:** Grid bonito com 78 cartas. O headline promete "Explore all 78 cards, their symbols, keywords, and upright and reversed readings." Clicar em qualquer carta → nada acontece. Sem hover state, sem modal, sem navegação.

**Por que é problema:** A promessa da página ("explore symbols, keywords...") não é cumprida. Usuários clicam nas cartas, nada acontece, acham que está quebrado.

**Fix:** Ou adicionar uma modal/drawer ao clicar em cada carta com a interpretação direta e reversa, ou adicionar um cursor pointer com tooltip mínimo indicando que há um detalhe disponível — mesmo que seja uma página futura.

---

## 🟡 MÉDIO — Scroll silencioso após selecionar intenção

**Onde acontece:** Na seção "Antes da pergunta" da homepage, ao clicar "Abrir leitura com esta intenção".

**O que o usuário vê:** Um scroll suave para baixo na página. Não há nenhuma transição visual, animação de portal, ou indicação de que uma nova seção foi revelada.

**Por que é confuso:** O usuário clicou um botão e ficou na mesma página, sem feedback visual de que algo mudou. Usuários menos atentos não percebem que a seção da leitura apareceu abaixo.

**Fix:** Adicionar uma transição mais pronunciada ao revelar a seção de leitura — um fade-in, um highlight ou pelo menos um `smooth scroll` com offset mais visível.

---

## 🟢 BAIXO — Placeholder do email não traduzido em EN

**Onde acontece:** Tela de login `/entrar` ao mudar para EN.

**O que o usuário vê:** A interface troca para inglês ("Continue your path", "Receive sign-in link") mas o placeholder do campo de email permanece `voce@exemplo.com` em português.

**Fix:** Adicionar chave de tradução para o placeholder: `"email_placeholder": { "pt": "voce@exemplo.com", "en": "you@example.com" }`.

---

## ✅ O que está funcionando bem

- **Design e artes**: Nível profissional. As cartas são genuinamente belas.
- **/carta-do-dia**: Carrega corretamente, imagem da carta aparece após scroll natural, CTAs "Salvar no Meu Universo" e "Fazer leitura de 3 cartas" claros e funcionais.
- **Salvar card sem login**: Salva no browser primeiro, sincroniza depois — bom padrão para usuários não autenticados.
- **/meu-universo sem login**: Estado vazio bem construído — mostra stats do browser (Salvas: 1), CTA "Criar meu universo" e "Fazer uma leitura primeiro" claros.
- **Toggle PT/EN**: Funciona em todas as páginas testadas, tradução consistente (exceto o placeholder).
- **Leitura gratuita (core flow)**: Selecionar intenção → digitar pergunta → clicar "Fazer minha leitura" → 3 cartas reveladas → funcionou sem erros.
- **Auth magic link**: Fluxo sem senha ("link expira e só pode ser usado uma vez") é limpo e moderno.
- **Seção de preços**: Clareza na diferenciação Gratuito / Leituras avulsas / Círculo R$29,90/mês.

---

## Plano de ação por prioridade

### Hoje (impacto direto nas reclamações dos usuários)
1. **Loading screen** — Qualquer skeleton ou fade-in no hero. Elimina 80% das reclamações de "página quebrada".
2. **Contexto no login** — Ler `?next` e mostrar o produto/preço na tela de autenticação. Elimina o abandono no funil de pagamento.

### Esta semana
3. **Upsell pós-leitura** — Bloco com 2 CTAs após revelar as 3 cartas.
4. **Cards do baralho clicáveis** — Modal mínimo com keywords e interpretação direta/reversa.

### Próximo sprint
5. **Transição de intenção para leitura** — Feedback visual mais claro ao revelar a seção.
6. **Placeholder traduzido** — 5 minutos de código.
