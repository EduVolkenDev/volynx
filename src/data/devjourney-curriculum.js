/**
 * Canonical Dev Journey curriculum map.
 *
 * The long-form PDFs remain the source for the complete lesson copy. This
 * manifest is the product contract used by the student experience: stable IDs,
 * ordering, tier access and the minimum guidance every lesson must expose.
 */
export const DEVJOURNEY_CURRICULUM = [
  {
    id: "block-0",
    number: "0",
    tier: "social",
    titleEn: "Start here",
    titlePt: "Comece aqui",
    summaryEn: "Set up your workspace and learn how to know when something worked.",
    summaryPt: "Prepare seu ambiente e aprenda a reconhecer quando algo funcionou.",
    lessons: [
      {
        id: "B0-L00",
        titleEn: "Your first 90 minutes",
        titlePt: "Seus primeiros 90 minutos",
        kindEn: "Onboarding",
        kindPt: "Onboarding",
        durationEn: "20–30 min",
        durationPt: "20–30 min",
        objectiveEn: "Understand the journey, open the tools and finish one small visible win.",
        objectivePt: "Entender a jornada, abrir as ferramentas e concluir uma pequena vitória visível.",
        beforeEn: "You need a computer, an internet connection and permission to install applications.",
        beforePt: "Você precisa de um computador, internet e permissão para instalar aplicativos.",
        stepsEn: [
          "Read the course map once before opening the editor.",
          "Create a folder named devjourney-inicio and open it in VS Code.",
          "Create index.html and write a heading that introduces you.",
          "Open the page in the browser and describe what you can see.",
        ],
        stepsPt: [
          "Leia o mapa do curso uma vez antes de abrir o editor.",
          "Crie uma pasta chamada devjourney-inicio e abra no VS Code.",
          "Crie index.html e escreva um título que apresente você.",
          "Abra a página no navegador e descreva o que consegue ver.",
        ],
        expectedEn: "A browser page shows your heading. If you can see it, your editor and browser are connected to the same project.",
        expectedPt: "Uma página no navegador mostra seu título. Se você consegue vê-lo, editor e navegador estão ligados ao mesmo projeto.",
        stuckEn: "If the browser shows a blank page, check that the file is named index.html, saved, and opened from the same folder.",
        stuckPt: "Se o navegador mostrar uma página vazia, confira se o arquivo se chama index.html, foi salvo e está na mesma pasta aberta.",
        exerciseEn: "Change the heading to include your name and one reason you want to learn programming.",
        exercisePt: "Altere o título para incluir seu nome e um motivo pelo qual quer aprender programação.",
        sandbox: {
          html: `<!doctype html>
<main>
  <h1>Meu primeiro projeto</h1>
  <p>Estou começando minha jornada como programador.</p>
</main>`,
          css: `body {
  margin: 0;
  padding: 2rem;
  font-family: system-ui, sans-serif;
  background: #10101c;
  color: #f8f7ff;
}

main {
  max-width: 38rem;
  margin: 0 auto;
}`,
          js: "",
        },
      },
      {
        id: "B0-L01",
        titleEn: "Tools, requirements and compatibility",
        titlePt: "Ferramentas, requisitos e compatibilidade",
        kindEn: "Setup",
        kindPt: "Setup",
        durationEn: "15–20 min",
        durationPt: "15–20 min",
        objectiveEn: "Know which tools the course uses and remove setup surprises before coding.",
        objectivePt: "Saber quais ferramentas o curso usa e eliminar surpresas de configuração antes de programar.",
        beforeEn: "Finish B0-L00 and keep the same project folder available.",
        beforePt: "Conclua B0-L00 e mantenha a mesma pasta do projeto disponível.",
        stepsEn: [
          "Install VS Code and a current browser such as Chrome, Edge, Firefox or Safari.",
          "Install Live Server in VS Code for lessons that load local JSON or modules.",
          "Confirm that you can save a file and refresh the browser without losing your work.",
        ],
        stepsPt: [
          "Instale o VS Code e um navegador atualizado, como Chrome, Edge, Firefox ou Safari.",
          "Instale o Live Server no VS Code para as aulas que carregam JSON local ou módulos.",
          "Confirme que consegue salvar um arquivo e atualizar o navegador sem perder seu trabalho.",
        ],
        expectedEn: "VS Code opens the project folder, Live Server starts a local URL, and a refresh displays your saved change.",
        expectedPt: "O VS Code abre a pasta do projeto, o Live Server inicia uma URL local e uma atualização mostra sua alteração salva.",
        stuckEn: "A file opened by double-click is enough for basic HTML. Use Live Server as soon as the lesson uses fetch, JSON or modules.",
        stuckPt: "Abrir o arquivo com duplo clique basta para HTML básico. Use o Live Server quando a aula usar fetch, JSON ou módulos.",
        exerciseEn: "Write down the local URL shown by Live Server and explain, in one sentence, why the server is needed.",
        exercisePt: "Anote a URL local mostrada pelo Live Server e explique, em uma frase, por que o servidor é necessário.",
        sandbox: {
          html: `<!doctype html>
<main>
  <h1>Servidor local ativo</h1>
  <p id="status">Edite o HTML, CSS ou JavaScript e execute.</p>
</main>`,
          css: `body {
  margin: 0;
  padding: 2rem;
  font-family: system-ui, sans-serif;
  background: #10101c;
  color: #f8f7ff;
}

main { max-width: 38rem; margin: 0 auto; }`,
          js: `const status = document.querySelector("#status");
if (status) status.textContent = "A página foi renderizada com sucesso.";`,
        },
      },
      {
        id: "B0-L02",
        titleEn: "The success checklist",
        titlePt: "O checklist de sucesso",
        kindEn: "Checkpoint",
        kindPt: "Checkpoint",
        durationEn: "10–15 min",
        durationPt: "10–15 min",
        objectiveEn: "Learn a repeatable way to verify your own work before asking for help.",
        objectivePt: "Aprender uma forma repetível de verificar seu trabalho antes de pedir ajuda.",
        beforeEn: "Have your project open in the browser and editor.",
        beforePt: "Deixe seu projeto aberto no navegador e no editor.",
        stepsEn: [
          "Change one visible value and save it.",
          "Refresh the page and confirm the change is still there.",
          "Open the browser console and look for errors.",
          "Record what you expected, what happened and what you tried.",
        ],
        stepsPt: [
          "Altere um valor visível e salve.",
          "Atualize a página e confirme que a alteração continua lá.",
          "Abra o console do navegador e procure erros.",
          "Registre o que esperava, o que aconteceu e o que tentou.",
        ],
        expectedEn: "You can explain whether the problem is in the file, the browser, the server or the expected result.",
        expectedPt: "Você consegue explicar se o problema está no arquivo, no navegador, no servidor ou no resultado esperado.",
        stuckEn: "Use the 20-minute rule: investigate for 20 focused minutes, then ask with the exact error and the smallest reproduction.",
        stuckPt: "Use a regra dos 20 minutos: investigue por 20 minutos focados e peça ajuda com o erro exato e a menor reprodução possível.",
        exerciseEn: "Create a short note called CHECKPOINT.md with your expected result and one screenshot of the working page.",
        exercisePt: "Crie uma nota chamada CHECKPOINT.md com o resultado esperado e uma captura da página funcionando.",
      },
    ],
  },
  {
    id: "block-1",
    number: "1",
    tier: "social",
    titleEn: "Web foundations",
    titlePt: "Fundamentos da web",
    summaryEn: "Build a clean page with structure, visual hierarchy and the first interaction.",
    summaryPt: "Construa uma página limpa com estrutura, hierarquia visual e a primeira interação.",
    lessons: [
      {
        id: "B1-L01",
        titleEn: "HTML: structure before style",
        titlePt: "HTML: estrutura antes do estilo",
        kindEn: "Foundation",
        kindPt: "Fundamento",
        durationEn: "30–40 min",
        durationPt: "30–40 min",
        objectiveEn: "Create a semantic page whose content still makes sense before CSS exists.",
        objectivePt: "Criar uma página semântica cujo conteúdo ainda faça sentido antes do CSS existir.",
        beforeEn: "Complete the Start Here lessons and keep Live Server available.",
        beforePt: "Conclua as aulas Comece aqui e mantenha o Live Server disponível.",
        stepsEn: [
          "Create header, main and footer landmarks.",
          "Add one clear heading, a short paragraph and a list of next actions.",
          "Use a button for an action and a link for navigation.",
          "Open the page and read it from top to bottom without styling.",
        ],
        stepsPt: [
          "Crie as áreas semânticas header, main e footer.",
          "Adicione um título claro, um parágrafo curto e uma lista de próximos passos.",
          "Use button para ação e link para navegação.",
          "Abra a página e leia de cima a baixo sem estilização.",
        ],
        expectedEn: "The page has a meaningful structure in the Elements panel and a logical reading order.",
        expectedPt: "A página tem uma estrutura significativa no painel Elements e uma ordem de leitura lógica.",
        stuckEn: "If everything looks like plain text, that is expected. HTML decides what the content is; CSS decides how it looks.",
        stuckPt: "Se tudo parece texto simples, isso é esperado. HTML decide o que o conteúdo é; CSS decide como ele aparece.",
        exerciseEn: "Replace the example content with a mini profile: name, goal, three skills you want to learn and one link.",
        exercisePt: "Troque o conteúdo de exemplo por um mini perfil: nome, objetivo, três habilidades que quer aprender e um link.",
        sandbox: {
          html: `<!doctype html>
<header>
  <strong>Dev Journey</strong>
</header>
<main>
  <h1>Meu mini perfil</h1>
  <p>Estou aprendendo a construir para a web.</p>
  <h2>Próximos passos</h2>
  <ul>
    <li>Praticar HTML</li>
    <li>Publicar meu projeto</li>
  </ul>
</main>
<footer>Construído por mim.</footer>`,
          css: `body {
  margin: 0;
  padding: 2rem;
  font-family: system-ui, sans-serif;
  background: #10101c;
  color: #f8f7ff;
}

main, header, footer { max-width: 38rem; margin: 0 auto; }
header { padding-bottom: 2rem; color: #8cffd2; }
footer { padding-top: 2rem; color: #aaa6bd; }`,
          js: "",
        },
      },
      {
        id: "B1-L02",
        titleEn: "CSS: hierarchy and responsive layout",
        titlePt: "CSS: hierarquia e layout responsivo",
        kindEn: "Visual system",
        kindPt: "Sistema visual",
        durationEn: "35–45 min",
        durationPt: "35–45 min",
        objectiveEn: "Turn the semantic page into a readable interface that works on small screens.",
        objectivePt: "Transformar a página semântica em uma interface legível que funcione em telas pequenas.",
        beforeEn: "Finish B1-L01 and confirm the page structure is correct.",
        beforePt: "Conclua B1-L01 e confirme que a estrutura da página está correta.",
        stepsEn: [
          "Create a small spacing and color system with CSS custom properties.",
          "Style the main content with a readable max-width and clear focus states.",
          "Use flex or grid without fixed widths that force horizontal scrolling.",
          "Test at a narrow viewport before calling the page finished.",
        ],
        stepsPt: [
          "Crie um pequeno sistema de espaçamento e cores com propriedades customizadas de CSS.",
          "Estilize o conteúdo com largura máxima legível e estados de foco claros.",
          "Use flex ou grid sem larguras fixas que causem rolagem horizontal.",
          "Teste em uma viewport estreita antes de considerar a página pronta.",
        ],
        expectedEn: "The page remains readable at mobile width, has visible keyboard focus and does not overflow horizontally.",
        expectedPt: "A página continua legível no celular, tem foco visível pelo teclado e não cria rolagem horizontal.",
        stuckEn: "Start with one column. Add complexity only when the content needs it; responsive design is a content decision too.",
        stuckPt: "Comece com uma coluna. Adicione complexidade apenas quando o conteúdo precisar; responsividade também é uma decisão de conteúdo.",
        exerciseEn: "Add a card grid that becomes one column under 720px and verify it with keyboard navigation.",
        exercisePt: "Adicione uma grade de cards que vire uma coluna abaixo de 720px e verifique a navegação pelo teclado.",
        sandbox: {
          html: `<main>
  <h1>Grade responsiva</h1>
  <div class="cards">
    <article><h2>HTML</h2><p>Estrutura.</p></article>
    <article><h2>CSS</h2><p>Apresentação.</p></article>
    <article><h2>JS</h2><p>Interação.</p></article>
  </div>
</main>`,
          css: `body {
  margin: 0;
  padding: 2rem;
  font-family: system-ui, sans-serif;
  background: #10101c;
  color: #f8f7ff;
}

main { max-width: 48rem; margin: 0 auto; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
article { padding: 1rem; border: 1px solid #3a3a53; border-radius: .8rem; background: #1b1b2b; }
@media (max-width: 720px) { .cards { grid-template-columns: 1fr; } }`,
          js: "",
        },
      },
      {
        id: "B1-L03",
        titleEn: "JavaScript: one useful interaction",
        titlePt: "JavaScript: uma interação útil",
        kindEn: "Interaction",
        kindPt: "Interação",
        durationEn: "35–45 min",
        durationPt: "35–45 min",
        objectiveEn: "Connect a user action to a visible, accessible result.",
        objectivePt: "Conectar uma ação do usuário a um resultado visível e acessível.",
        beforeEn: "Finish the HTML and CSS page and identify one action the user needs.",
        beforePt: "Finalize a página HTML e CSS e identifique uma ação de que o usuário precisa.",
        stepsEn: [
          "Select the element you need with a stable id or class.",
          "Listen for the correct event instead of changing the page on a timer.",
          "Update textContent and announce important feedback with aria-live.",
          "Test the same action with mouse and keyboard.",
        ],
        stepsPt: [
          "Selecione o elemento necessário com um id ou classe estável.",
          "Escute o evento correto em vez de alterar a página por um timer.",
          "Atualize textContent e anuncie feedback importante com aria-live.",
          "Teste a mesma ação com mouse e teclado.",
        ],
        expectedEn: "A button changes one part of the page and the user receives clear feedback about what happened.",
        expectedPt: "Um botão altera uma parte da página e o usuário recebe um feedback claro sobre o que aconteceu.",
        stuckEn: "Check the console first, then verify that your script loads after the HTML element exists.",
        stuckPt: "Confira primeiro o console e depois verifique se o script carrega depois de o elemento HTML existir.",
        exerciseEn: "Add a theme or greeting toggle. The button must have a label, focus state and feedback that explains the new state.",
        exercisePt: "Adicione um botão de tema ou saudação. O botão precisa ter label, foco visível e feedback explicando o novo estado.",
      },
    ],
  },
  {
    id: "block-2",
    number: "2",
    tier: "social",
    titleEn: "JavaScript, DOM and JSON",
    titlePt: "JavaScript, DOM e JSON",
    summaryEn: "Use data and interaction to turn a static page into a small application.",
    summaryPt: "Use dados e interação para transformar uma página estática em uma pequena aplicação.",
    lessons: [
      {
        id: "B2-L01",
        titleEn: "Values, conditions and decisions",
        titlePt: "Valores, condições e decisões",
        kindEn: "JavaScript",
        kindPt: "JavaScript",
        durationEn: "35–45 min",
        durationPt: "35–45 min",
        objectiveEn: "Represent simple rules in code and explain why each branch exists.",
        objectivePt: "Representar regras simples em código e explicar por que cada caminho existe.",
        beforeEn: "Know how to load a JavaScript file and read a console message.",
        beforePt: "Saiba carregar um arquivo JavaScript e ler uma mensagem no console.",
        stepsEn: [
          "Store a value in a variable with a name that explains its meaning.",
          "Write one condition for the normal case and one for the alternative.",
          "Show the result in the interface, not only in the console.",
          "Try an empty, unexpected or boundary value before moving on.",
        ],
        stepsPt: [
          "Guarde um valor em uma variável com nome que explique seu significado.",
          "Escreva uma condição para o caso normal e outra para a alternativa.",
          "Mostre o resultado na interface, não apenas no console.",
          "Teste um valor vazio, inesperado ou no limite antes de avançar.",
        ],
        expectedEn: "The interface explains both the successful path and what the user should do when a value is invalid.",
        expectedPt: "A interface explica tanto o caminho de sucesso quanto o que o usuário deve fazer quando um valor é inválido.",
        stuckEn: "Read the condition aloud. If you cannot say what it means in normal language, simplify the rule first.",
        stuckPt: "Leia a condição em voz alta. Se não consegue dizer o que ela significa em linguagem comum, simplifique a regra primeiro.",
        exerciseEn: "Build a small eligibility message with a valid path, an invalid path and a visible explanation for each.",
        exercisePt: "Crie uma pequena mensagem de elegibilidade com caminho válido, inválido e explicação visível para cada um.",
        sandbox: {
          html: `<!doctype html>
<main>
  <h1>Meu painel</h1>
  <button id="action" type="button">Ver mensagem</button>
  <p id="feedback" aria-live="polite">Nenhuma ação executada.</p>
</main>`,
          css: `body {
  margin: 0;
  padding: 2rem;
  font-family: system-ui, sans-serif;
  background: #10101c;
  color: #f8f7ff;
}

main { max-width: 38rem; margin: 0 auto; }
button { padding: .7rem 1rem; border-radius: .6rem; border: 0; cursor: pointer; }`,
          js: `const button = document.querySelector("#action");
const feedback = document.querySelector("#feedback");

button?.addEventListener("click", () => {
  feedback.textContent = "A interação funcionou.";
});`,
        },
      },
      {
        id: "B2-L02",
        titleEn: "DOM lists and JSON data",
        titlePt: "Listas no DOM e dados JSON",
        kindEn: "Data",
        kindPt: "Dados",
        durationEn: "45–60 min",
        durationPt: "45–60 min",
        objectiveEn: "Render a data list, add a new item and keep the interaction understandable.",
        objectivePt: "Renderizar uma lista de dados, adicionar um item e manter a interação compreensível.",
        beforeEn: "Complete B2-L01 and have a JSON file beside the page.",
        beforePt: "Conclua B2-L01 e tenha um arquivo JSON ao lado da página.",
        stepsEn: [
          "Start the local server before using fetch with a JSON file.",
          "Render each item with textContent and a semantic control for actions.",
          "Show loading, success and error states in the interface.",
          "Test an empty list and a malformed response before finishing.",
        ],
        stepsPt: [
          "Inicie o servidor local antes de usar fetch com um arquivo JSON.",
          "Renderize cada item com textContent e um controle semântico para as ações.",
          "Mostre estados de carregamento, sucesso e erro na interface.",
          "Teste uma lista vazia e uma resposta inválida antes de finalizar.",
        ],
        expectedEn: "The list renders from data, the user understands how to add or remove an item, and failures have a recovery message.",
        expectedPt: "A lista é renderizada a partir dos dados, o usuário entende como adicionar ou remover item e falhas têm mensagem de recuperação.",
        stuckEn: "A fetch error often means the page was opened from file://. Start Live Server and try the local http:// URL.",
        stuckPt: "Um erro de fetch geralmente significa que a página foi aberta por file://. Inicie o Live Server e tente a URL local http://.",
        exerciseEn: "Turn the starter project into a project board with an accessible remove button for every card.",
        exercisePt: "Transforme o projeto starter em um quadro de projetos com botão acessível de remover em cada card.",
      },
      {
        id: "B2-L03",
        titleEn: "Functions and the final Social project",
        titlePt: "Funções e o projeto final Social",
        kindEn: "Checkpoint",
        kindPt: "Checkpoint",
        durationEn: "60–90 min",
        durationPt: "60–90 min",
        objectiveEn: "Combine structure, style, interaction and data into one project you can publish.",
        objectivePt: "Combinar estrutura, estilo, interação e dados em um projeto que você consegue publicar.",
        beforeEn: "Finish the previous Social lessons and choose a small problem with a clear user.",
        beforePt: "Conclua as aulas anteriores do Social e escolha um problema pequeno com um usuário claro.",
        stepsEn: [
          "Write the project goal and the one action that matters most.",
          "Build the smallest working version before adding visual polish.",
          "Check responsive layout, keyboard access, labels, feedback and console errors.",
          "Publish it, write a README and record what you would improve next.",
        ],
        stepsPt: [
          "Escreva o objetivo do projeto e a ação mais importante.",
          "Construa a menor versão funcional antes de adicionar polish visual.",
          "Verifique responsividade, teclado, labels, feedback e erros no console.",
          "Publique, escreva um README e registre o que melhoraria depois.",
        ],
        expectedEn: "A stranger can open the live URL, understand the purpose, complete the main action and recover from an error.",
        expectedPt: "Uma pessoa desconhecida consegue abrir a URL publicada, entender o propósito, realizar a ação principal e se recuperar de um erro.",
        stuckEn: "Reduce scope. A small finished project teaches more than a large unfinished one.",
        stuckPt: "Reduza o escopo. Um projeto pequeno e concluído ensina mais que um projeto grande inacabado.",
        exerciseEn: "Submit your Social project with a public repository, live URL, README and a short explanation of one technical decision.",
        exercisePt: "Prepare seu projeto Social com repositório público, URL publicada, README e uma explicação curta de uma decisão técnica.",
      },
    ],
  },
  {
    id: "block-3",
    number: "3",
    tier: "pro",
    titleEn: "React app, incrementally",
    titlePt: "Aplicação React, passo a passo",
    summaryEn: "Move from DOM scripts to components, state and a maintainable UI.",
    summaryPt: "Passe de scripts no DOM para componentes, estado e uma UI sustentável.",
    lessons: [
      { id: "B3-L01", titleEn: "Components and lists", titlePt: "Componentes e listas", kindEn: "React", kindPt: "React", durationEn: "45–60 min", durationPt: "45–60 min", objectiveEn: "Break a screen into components with clear responsibilities.", objectivePt: "Dividir uma tela em componentes com responsabilidades claras.", beforeEn: "Unlock Pro and complete the Social project.", beforePt: "Libere o Pro e conclua o projeto Social.", stepsEn: ["Create a Vite app and run it locally.", "Extract a reusable card component.", "Render a list from data and give each item a stable key."], stepsPt: ["Crie um app Vite e rode localmente.", "Extraia um componente de card reutilizável.", "Renderize uma lista a partir de dados e dê uma key estável a cada item."], expectedEn: "The page is made of understandable components and the list renders without console warnings.", expectedPt: "A página é formada por componentes compreensíveis e a lista renderiza sem warnings no console.", stuckEn: "When a component does two unrelated jobs, split it only after identifying the shared data.", stuckPt: "Quando um componente faz dois trabalhos sem relação, divida-o depois de identificar os dados compartilhados.", exerciseEn: "Add an empty state and a loading state to the project list.", exercisePt: "Adicione estados de lista vazia e carregamento à lista de projetos." },
      { id: "B3-L02", titleEn: "State, validation and persistence", titlePt: "Estado, validação e persistência", kindEn: "React", kindPt: "React", durationEn: "45–60 min", durationPt: "45–60 min", objectiveEn: "Make a form predictable and preserve useful work across refreshes.", objectivePt: "Tornar um formulário previsível e preservar trabalho útil após atualizar.", beforeEn: "Understand props and rendered lists.", beforePt: "Entenda props e listas renderizadas.", stepsEn: ["Model the form state.", "Validate before updating the list.", "Persist only the data the interface needs and explain the trade-off."], stepsPt: ["Modele o estado do formulário.", "Valide antes de atualizar a lista.", "Persista apenas os dados necessários e explique o trade-off."], expectedEn: "Invalid input is explained, valid input appears once, and refresh does not destroy the expected local state.", expectedPt: "Entrada inválida é explicada, entrada válida aparece uma vez e atualizar não destrói o estado local esperado.", stuckEn: "Keep one source of truth for each value; duplicated state is a common cause of confusing UI.", stuckPt: "Mantenha uma fonte de verdade para cada valor; estado duplicado costuma gerar UI confusa.", exerciseEn: "Add a clear empty state and a reset action without losing accessibility.", exercisePt: "Adicione um estado vazio claro e uma ação de reset sem perder acessibilidade." },
      { id: "B3-L03", titleEn: "API or local data and publish", titlePt: "API ou dados locais e publicação", kindEn: "Delivery", kindPt: "Entrega", durationEn: "45–60 min", durationPt: "45–60 min", objectiveEn: "Handle real loading and failure states before publishing the React project.", objectivePt: "Tratar carregamento e falhas reais antes de publicar o projeto React.", beforeEn: "Finish the component and state lessons.", beforePt: "Conclua as aulas de componentes e estado.", stepsEn: ["Load from the API with a local fallback.", "Disable or label actions while loading.", "Build and inspect the production output before publishing."], stepsPt: ["Carregue da API com fallback local.", "Desabilite ou identifique ações durante o carregamento.", "Gere e inspecione a saída de produção antes de publicar."], expectedEn: "The app explains where data came from and what to do when the API is unavailable.", expectedPt: "O app explica de onde vieram os dados e o que fazer quando a API está indisponível.", stuckEn: "Separate network failure from data-shape failure; they need different messages.", stuckPt: "Separe falha de rede de falha no formato dos dados; elas precisam de mensagens diferentes.", exerciseEn: "Publish the app and include the build command and known limitations in the README.", exercisePt: "Publique o app e inclua no README o comando de build e as limitações conhecidas." },
    ],
  },
  {
    id: "block-4",
    number: "4",
    tier: "bundle",
    titleEn: "Express API and integration",
    titlePt: "API Express e integração",
    summaryEn: "Understand the boundary between browser, API, validation and data.",
    summaryPt: "Entenda a fronteira entre navegador, API, validação e dados.",
    lessons: [
      { id: "B4-L01", titleEn: "Health and the first endpoint", titlePt: "Health e o primeiro endpoint", kindEn: "Backend", kindPt: "Backend", durationEn: "35–45 min", durationPt: "35–45 min", objectiveEn: "Run an Express API locally and verify it deliberately.", objectivePt: "Rodar uma API Express localmente e verificá-la de propósito.", beforeEn: "Complete the Pro track and install Node.js LTS.", beforePt: "Conclua a trilha Pro e instale Node.js LTS.", stepsEn: ["Start the API and call /health.", "Explain the request and response in plain language.", "Return JSON with a predictable shape."], stepsPt: ["Inicie a API e chame /health.", "Explique request e response em linguagem simples.", "Retorne JSON com formato previsível."], expectedEn: "You can show a successful health response and explain what it proves—and what it does not prove.", expectedPt: "Você consegue mostrar uma resposta de health bem-sucedida e explicar o que ela prova — e o que não prova.", stuckEn: "Check the port, the terminal output and the exact path before changing code.", stuckPt: "Confira a porta, a saída do terminal e o caminho exato antes de mudar o código.", exerciseEn: "Add a /projetos endpoint with an explicit empty-state response.", exercisePt: "Adicione um endpoint /projetos com resposta explícita para estado vazio." },
      { id: "B4-L02", titleEn: "Validation and integration", titlePt: "Validação e integração", kindEn: "Backend", kindPt: "Backend", durationEn: "45–60 min", durationPt: "45–60 min", objectiveEn: "Connect the React app to an API without hiding loading or error states.", objectivePt: "Conectar o app React à API sem esconder estados de carregamento ou erro.", beforeEn: "Have /health and /projetos working locally.", beforePt: "Tenha /health e /projetos funcionando localmente.", stepsEn: ["Validate the request body on the server.", "Return useful HTTP status codes.", "Handle CORS intentionally and document the local setup."], stepsPt: ["Valide o body da requisição no servidor.", "Retorne status HTTP úteis.", "Trate CORS de forma intencional e documente o setup local."], expectedEn: "The browser shows clear API success and failure states and the server rejects invalid data.", expectedPt: "O navegador mostra estados claros de sucesso e falha e o servidor rejeita dados inválidos.", stuckEn: "A 200 response is not enough; inspect the response body and the browser network panel.", stuckPt: "Uma resposta 200 não basta; inspecione o body e o painel Network do navegador.", exerciseEn: "Add POST validation and a documented example request.", exercisePt: "Adicione validação ao POST e um exemplo de requisição documentado." },
      { id: "B4-L03", titleEn: "Delete, limitations and refactor", titlePt: "Delete, limitações e refactor", kindEn: "Checkpoint", kindPt: "Checkpoint", durationEn: "45–60 min", durationPt: "45–60 min", objectiveEn: "Name the limits of an educational API and improve its clarity before delivery.", objectivePt: "Nomear os limites de uma API educacional e melhorar sua clareza antes da entrega.", beforeEn: "Complete the create and read flows.", beforePt: "Conclua os fluxos de criação e leitura.", stepsEn: ["Add DELETE with an explicit result.", "Document in-memory storage and open CORS as learning-only choices.", "Refactor names and add a small error boundary."], stepsPt: ["Adicione DELETE com resultado explícito.", "Documente armazenamento em memória e CORS aberto como escolhas apenas educacionais.", "Faça refactor dos nomes e adicione um pequeno tratamento de erro."], expectedEn: "The project is honest about scope and another person can run it by following the README.", expectedPt: "O projeto é honesto sobre seu escopo e outra pessoa consegue rodá-lo seguindo o README.", stuckEn: "Do not call a local in-memory API production-ready; make the limitation part of the lesson.", stuckPt: "Não chame uma API local em memória de pronta para produção; transforme a limitação em parte da aula.", exerciseEn: "Write a short architecture note describing browser, API and data responsibilities.", exercisePt: "Escreva uma nota curta de arquitetura descrevendo as responsabilidades do navegador, API e dados." },
    ],
  },
  {
    id: "block-5",
    number: "5",
    tier: "bundle",
    titleEn: "Deploy, validation and portfolio proof",
    titlePt: "Deploy, validação e prova de portfólio",
    summaryEn: "Publish responsibly and prove what your project actually does.",
    summaryPt: "Publique com responsabilidade e prove o que seu projeto realmente faz.",
    lessons: [
      { id: "B5-L01", titleEn: "Publish the project", titlePt: "Publique o projeto", kindEn: "Deploy", kindPt: "Deploy", durationEn: "45–60 min", durationPt: "45–60 min", objectiveEn: "Move from a local project to a reproducible public URL.", objectivePt: "Sair de um projeto local para uma URL pública reproduzível.", beforeEn: "Complete the Bundle project and README.", beforePt: "Conclua o projeto Bundle e o README.", stepsEn: ["Push the repository.", "Configure the hosting build command and output directory.", "Open the public URL on a second device or private window."], stepsPt: ["Envie o repositório.", "Configure o comando de build e a pasta de saída do hosting.", "Abra a URL pública em outro dispositivo ou janela anônima."], expectedEn: "The public URL loads the intended build and the README explains how it was produced.", expectedPt: "A URL pública carrega o build esperado e o README explica como ele foi produzido.", stuckEn: "Compare local preview with the deployed output; a local success does not prove deployment success.", stuckPt: "Compare o preview local com o publicado; sucesso local não prova sucesso no deploy.", exerciseEn: "Record the live URL, build command and one known limitation.", exercisePt: "Registre a URL live, o comando de build e uma limitação conhecida." },
      { id: "B5-L02", titleEn: "Actions that validate real work", titlePt: "Actions que validam trabalho real", kindEn: "Quality", kindPt: "Qualidade", durationEn: "35–45 min", durationPt: "35–45 min", objectiveEn: "Understand the difference between a workflow that runs and a workflow that validates.", objectivePt: "Entender a diferença entre um workflow que roda e um workflow que valida.", beforeEn: "Have a reproducible project command available.", beforePt: "Tenha um comando reproduzível do projeto disponível.", stepsEn: ["Install dependencies in CI.", "Run the real build or checks.", "Read the failed run and fix the cause instead of bypassing it."], stepsPt: ["Instale dependências no CI.", "Rode o build ou checks reais.", "Leia a execução que falhou e corrija a causa em vez de ignorá-la."], expectedEn: "The workflow fails when the project is broken and passes when the documented checks pass.", expectedPt: "O workflow falha quando o projeto está quebrado e passa quando os checks documentados passam.", stuckEn: "An echo statement proves only that the runner executed a command, not that your app works.", stuckPt: "Um echo prova apenas que o runner executou um comando, não que o app funciona.", exerciseEn: "Replace the placeholder validation with the project's real install and build commands.", exercisePt: "Troque a validação placeholder pelos comandos reais de instalação e build." },
      { id: "B5-L03", titleEn: "Final review and certificate evidence", titlePt: "Revisão final e evidências do certificado", kindEn: "Final checkpoint", kindPt: "Checkpoint final", durationEn: "30–45 min", durationPt: "30–45 min", objectiveEn: "Prepare a truthful project handoff and understand the current manual review boundary.", objectivePt: "Preparar uma entrega verdadeira e entender o limite atual da revisão manual.", beforeEn: "Have a public repository, live URL and successful documented checks.", beforePt: "Tenha repositório público, URL publicada e checks documentados bem-sucedidos.", stepsEn: ["Run the responsive and accessibility checklist.", "Explain one technical decision and one limitation.", "Submit only when repository, live URL and evidence are ready."], stepsPt: ["Rode o checklist responsivo e de acessibilidade.", "Explique uma decisão técnica e uma limitação.", "Envie apenas quando repositório, URL e evidências estiverem prontos."], expectedEn: "A reviewer can reproduce the project, understand your authorship and see what was actually validated.", expectedPt: "Um revisor consegue reproduzir o projeto, entender sua autoria e ver o que foi realmente validado.", stuckEn: "Certification is manual today. Keep the evidence organized and use support until the final submission pipeline is active.", stuckPt: "A certificação é manual hoje. Organize as evidências e use o suporte até a pipeline final estar ativa.", exerciseEn: "Create a final README section called Evidence with links and a concise reflection.", exercisePt: "Crie no README uma seção Evidence com links e uma reflexão concisa." },
    ],
  },
];

export const DEVJOURNEY_LESSONS = DEVJOURNEY_CURRICULUM.flatMap((block) =>
  block.lessons.map((lesson) => ({ ...lesson, blockId: block.id, blockNumber: block.number, tier: block.tier, blockTitleEn: block.titleEn, blockTitlePt: block.titlePt }))
);

export const DEVJOURNEY_TIER_ORDER = { social: 0, pro: 1, bundle: 2 };

export function getDevJourneyLesson(lessonId) {
  return DEVJOURNEY_LESSONS.find((lesson) => lesson.id === lessonId) || DEVJOURNEY_LESSONS[0];
}
