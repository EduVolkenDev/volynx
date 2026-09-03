/**
 * Small public demonstrations of the three outcomes described on the
 * Dev Journey landing page. They are intentionally self-contained so the
 * marketing page can prove the interaction without loading a full app or
 * exposing student materials.
 */
export const DEVJOURNEY_OUTCOME_PREVIEWS = {
  landing: {
    titleEn: "Responsive landing page",
    titlePt: "Landing page responsiva",
    labelEn: "Live example / Social Sprint",
    labelPt: "Exemplo ao vivo / Sprint Social",
    noteEn: "A small interaction from the kind of page you will build.",
    notePt: "Uma pequena interação do tipo de página que você vai construir.",
    html: `<main class="demo demo-landing">
  <header class="demo-nav"><span class="demo-logo">N</span><strong>Northstar</strong><span class="demo-nav__status">LIVE PROJECT</span></header>
  <section class="demo-hero">
    <span class="demo-kicker">A clearer way forward</span>
    <h1>Launch with clarity.</h1>
    <p>A focused page with one message, one action and a layout that adapts to every screen.</p>
    <button id="demo-action" type="button">See the first step</button>
    <span id="demo-status" class="demo-status" aria-live="polite">Ready to explore.</span>
  </section>
  <div class="demo-features"><span><b>01</b><strong>Structure</strong><small>Content with a clear order.</small></span><span><b>02</b><strong>Responsive</strong><small>Comfortable on every screen.</small></span><span><b>03</b><strong>Action</strong><small>Feedback the visitor can see.</small></span></div>
</main>`,
    css: `:root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; min-width: 280px; background: radial-gradient(circle at 86% 8%, rgba(143,112,255,.25), transparent 40%), linear-gradient(145deg, #111427, #090b15 70%); color: #f8f7ff; }
.demo { min-height: 100vh; padding: 22px; }
.demo-nav { display: flex; align-items: center; gap: 9px; color: rgba(255,255,255,.82); font-size: 13px; letter-spacing: .04em; }
.demo-logo { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid rgba(140,255,210,.72); border-radius: 9px; color: #8cffd2; font-weight: 800; }
.demo-nav__status { margin-left: auto; color: rgba(140,255,210,.75); font-size: 8px; font-weight: 800; letter-spacing: .14em; }
.demo-hero { max-width: 520px; padding: 54px 0 38px; }
.demo-kicker { color: #8cffd2; font-size: 9px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
h1 { max-width: 8ch; margin: 10px 0 14px; font-size: clamp(2.4rem, 8vw, 4.7rem); line-height: .94; letter-spacing: -.07em; }
.demo-hero p { max-width: 38ch; margin: 0 0 22px; color: rgba(244,246,255,.68); font-size: 13px; line-height: 1.6; }
button { border: 0; border-radius: 999px; padding: 11px 15px; color: #081018; background: linear-gradient(100deg, #8cffd2, #b7ff8c); cursor: pointer; font: inherit; font-size: 11px; font-weight: 800; }
button:focus-visible { outline: 2px solid #f3e1a0; outline-offset: 3px; }
.demo-status { display: block; margin-top: 12px; color: rgba(243,225,160,.88); font-size: 11px; }
.demo-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.14); }
.demo-features span { display: grid; gap: 4px; min-width: 0; }
.demo-features b { color: rgba(243,225,160,.92); font-size: 9px; letter-spacing: .12em; }
.demo-features strong { font-size: 12px; }
.demo-features small { color: rgba(244,246,255,.55); font-size: 10px; line-height: 1.35; }
@media (max-width: 420px) { .demo { padding: 18px; } .demo-hero { padding-top: 42px; } .demo-features { gap: 8px; } .demo-features small { font-size: 9px; } }`,
    js: `const action = document.querySelector("#demo-action");
const status = document.querySelector("#demo-status");
action?.addEventListener("click", () => { status.textContent = "The primary action is working."; action.textContent = "Step complete ✓"; });`,
  },
  app: {
    titleEn: "Working web app",
    titlePt: "Web app funcional",
    labelEn: "Live example / Pro",
    labelPt: "Exemplo ao vivo / Pro",
    noteEn: "A working interface with state, data and visible feedback.",
    notePt: "Uma interface funcional com estado, dados e feedback visível.",
    html: `<main class="demo demo-app">
  <header class="app-head"><div><span class="demo-kicker">Project board</span><h1>Build with clarity.</h1></div><span class="app-count" id="app-count">3 tasks</span></header>
  <form class="app-form" id="app-form"><input id="app-input" aria-label="New task" placeholder="Add a small task" /><button id="app-add" type="button">Add</button></form>
  <ul class="app-list" id="app-list"><li><span class="task-dot task-dot--done"></span><span><strong>Define the first screen</strong><small>Complete</small></span></li><li><span class="task-dot"></span><span><strong>Connect the interaction</strong><small>In progress</small></span></li><li><span class="task-dot"></span><span><strong>Check the mobile view</strong><small>Next</small></span></li></ul>
</main>`,
    css: `:root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; min-width: 280px; background: linear-gradient(145deg, #12172a, #090b15); color: #f8f7ff; }
.demo { min-height: 100vh; padding: 22px; }
.demo-kicker { color: #8cffd2; font-size: 9px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
.app-head { display: flex; align-items: end; justify-content: space-between; gap: 12px; }
h1 { margin: 10px 0 18px; font-size: clamp(1.8rem, 7vw, 3.5rem); line-height: .96; letter-spacing: -.07em; }
.app-count { color: rgba(243,225,160,.9); font-size: 10px; font-weight: 800; white-space: nowrap; }
.app-form { display: flex; gap: 8px; margin-bottom: 18px; }
input { min-width: 0; flex: 1; border: 1px solid rgba(255,255,255,.15); border-radius: 10px; padding: 11px 12px; color: #fff; background: rgba(255,255,255,.06); font: inherit; font-size: 11px; }
input:focus-visible { outline: 2px solid #8cffd2; outline-offset: 2px; }
button { border: 0; border-radius: 10px; padding: 0 14px; color: #081018; background: #8cffd2; cursor: pointer; font: inherit; font-size: 11px; font-weight: 800; }
button:focus-visible { outline: 2px solid #f3e1a0; outline-offset: 3px; }
.app-list { display: grid; gap: 9px; padding: 0; margin: 0; list-style: none; }
.app-list li { display: flex; align-items: center; gap: 11px; padding: 13px; border-top: 1px solid rgba(255,255,255,.12); }
.task-dot { flex: 0 0 auto; width: 9px; height: 9px; border: 1px solid rgba(243,225,160,.75); border-radius: 50%; }
.task-dot--done { border-color: #8cffd2; background: #8cffd2; box-shadow: 0 0 12px rgba(140,255,210,.45); }
.app-list li span:last-child { display: grid; gap: 3px; min-width: 0; }
.app-list strong { font-size: 12px; }
.app-list small { color: rgba(244,246,255,.53); font-size: 10px; }
@media (max-width: 420px) { .demo { padding: 18px; } }`,
    js: `const add = document.querySelector("#app-add");
const input = document.querySelector("#app-input");
const list = document.querySelector("#app-list");
const count = document.querySelector("#app-count");
add?.addEventListener("click", () => { const value = input?.value.trim(); if (!value) return; const item = document.createElement("li"); item.innerHTML = '<span class="task-dot"></span><span><strong></strong><small>New task</small></span>'; item.querySelector("strong").textContent = value; list?.append(item); input.value = ""; count.textContent = list.children.length + " tasks"; });`,
  },
  final: {
    titleEn: "Published final project",
    titlePt: "Projeto final publicado",
    labelEn: "Live example / Bundle",
    labelPt: "Exemplo ao vivo / Bundle",
    noteEn: "A finish line with a clear status, evidence and next action.",
    notePt: "Uma etapa final com status, evidências e próximo passo claros.",
    html: `<main class="demo demo-final">
  <header class="final-head"><div><span class="demo-kicker">Launch checklist</span><h1>Ready to publish.</h1></div><strong id="final-progress">0 / 3 ready</strong></header>
  <p class="final-intro">A real project is not finished when it runs once. It is finished when you can show how it works.</p>
  <div class="final-list"><button class="final-item" type="button"><span class="final-mark">○</span><span><b>Responsive layout</b><small>Works on mobile and desktop</small></span></button><button class="final-item" type="button"><span class="final-mark">○</span><span><b>Accessible interaction</b><small>Keyboard and feedback checked</small></span></button><button class="final-item" type="button"><span class="final-mark">○</span><span><b>Live URL + README</b><small>Ready for someone else to review</small></span></button></div>
</main>`,
    css: `:root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; min-width: 280px; background: radial-gradient(circle at 90% 0%, rgba(243,225,160,.18), transparent 42%), linear-gradient(145deg, #15152a, #090b15); color: #f8f7ff; }
.demo { min-height: 100vh; padding: 22px; }
.demo-kicker { color: #f3e1a0; font-size: 9px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
.final-head { display: flex; align-items: end; justify-content: space-between; gap: 10px; }
h1 { margin: 10px 0 18px; font-size: clamp(2rem, 7vw, 3.7rem); line-height: .94; letter-spacing: -.07em; }
.final-head strong { color: #8cffd2; font-size: 10px; white-space: nowrap; }
.final-intro { max-width: 38ch; margin: 0 0 20px; color: rgba(244,246,255,.64); font-size: 12px; line-height: 1.6; }
.final-list { border-top: 1px solid rgba(255,255,255,.14); }
.final-item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 0; border: 0; border-bottom: 1px solid rgba(255,255,255,.12); color: #f8f7ff; background: transparent; cursor: pointer; text-align: left; font: inherit; }
.final-item:focus-visible { outline: 2px solid #8cffd2; outline-offset: 3px; }
.final-mark { display: grid; place-items: center; flex: 0 0 auto; width: 22px; height: 22px; border: 1px solid rgba(243,225,160,.75); border-radius: 50%; color: rgba(243,225,160,.9); font-size: 15px; }
.final-item > span:last-child { display: grid; gap: 3px; min-width: 0; }
.final-item b { font-size: 12px; }
.final-item small { color: rgba(244,246,255,.53); font-size: 10px; }
.final-item.is-done .final-mark { border-color: #8cffd2; color: #081018; background: #8cffd2; }
.final-item.is-done small { color: rgba(140,255,210,.78); }
@media (max-width: 420px) { .demo { padding: 18px; } }`,
    js: `const items = [...document.querySelectorAll(".final-item")];
const progress = document.querySelector("#final-progress");
items.forEach((item) => item.addEventListener("click", () => { item.classList.toggle("is-done"); item.querySelector(".final-mark").textContent = item.classList.contains("is-done") ? "✓" : "○"; const done = items.filter((entry) => entry.classList.contains("is-done")).length; progress.textContent = done + " / 3 ready"; }));`,
  },
};
