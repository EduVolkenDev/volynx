#!/usr/bin/env node
/**
 * VOLYNX — Dev Journey ZIP packager
 *
 * Generates clean, public-ready ZIPs of the Dev Journey kits.
 * Source folders live OUTSIDE the repo (under ~/DevJourney-Formated-Final and ~/Downloads).
 * Output ZIPs land in ./dist-deliverables/  (NOT in public/, NOT committed to git).
 *
 * Usage:
 *   node scripts/package-devjourney.mjs                # all configured tiers
 *   node scripts/package-devjourney.mjs --tier=social  # specific tier
 *   node scripts/package-devjourney.mjs --dry-run      # plan only
 *
 * Cleanup rules (always applied):
 *   - .DS_Store, __MACOSX (macOS metadata)
 *   - *.odt              (replaced by .pdf in our kit)
 *   - SETUP-Hotmart.md   (legacy platform binding — we run on VOLYNX)
 *   - Any file containing "hotmart" in name
 *
 * Output naming:
 *   dist-deliverables/devjourney-social.zip
 *   dist-deliverables/devjourney-pro.zip
 *   dist-deliverables/devjourney-bundle.zip
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, cpSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const HOME = homedir();
const DJ_PRO_BUNDLE_ROOT = join(HOME, "Downloads/dev-journey-pro-and-bundle");
const COURSE_UPDATED_AT = "2026-05-06";
const COMMON_TRACK_EXTRAS = [
  {
    src: join(DJ_PRO_BUNDLE_ROOT, "02-COMO-USAR-O-CURSO.pdf"),
    dest: "00_START_HERE/COMO-USAR-O-CURSO.pdf",
  },
  {
    src: join(DJ_PRO_BUNDLE_ROOT, "05-REGRAS-DO-CERTIFICADO-E-CHECKPOINTS.pdf"),
    dest: "00_START_HERE/CERTIFICADO-E-CHECKPOINTS.pdf",
  },
  {
    src: join(DJ_PRO_BUNDLE_ROOT, "REQUISITOS-E-COMPATIBILIDADE.pdf"),
    dest: "00_START_HERE/REQUISITOS-E-COMPATIBILIDADE.pdf",
  },
  {
    src: join(DJ_PRO_BUNDLE_ROOT, "glossario_bloco1.pdf"),
    dest: "01_GLOSSARIOS/GLOSSARIO_BLOCO1.pdf",
  },
  {
    src: join(DJ_PRO_BUNDLE_ROOT, "glossario_bloco2.pdf"),
    dest: "01_GLOSSARIOS/GLOSSARIO_BLOCO2.pdf",
  },
];

const BRAND_ASSETS = [
  {
    src: join(REPO_ROOT, "public/assets/devjourney/new-devjourney-asset.webp"),
    dest: "02_BRAND_ASSETS/new-devjourney-asset.webp",
    label: "Official Dev Journey course asset",
  },
  {
    src: join(REPO_ROOT, "public/assets/devjourney/digitalpresence.webp"),
    dest: "02_BRAND_ASSETS/digitalpresence.webp",
    label: "Digital Presence bonus visual",
  },
];

const OPTIONAL_ICON_PACK = {
  src: join(REPO_ROOT, "public/assets/icons-store/Abstract-Free"),
  dest: "03_VOLYNX_FREE_ICON_PACK/abstract-free",
  label: "VOLYNX Abstract Free Icon Pack",
};

// ── Configuration ──────────────────────────────────────────────
const TIERS = {
  social: {
    label: "Social Sprint",
    sources: [
      // Best-package source per project memory (audit 2026-05-04)
      join(HOME, "DevJourney-Formated-Final/HOTMART PRODUCT/DevJourney_SOCIAL_Hotmart_Kit_v1"),
    ],
    extraFiles: [],
    readme: socialReadme(),
  },
  pro: {
    label: "Pro Track",
    sources: [
      join(DJ_PRO_BUNDLE_ROOT, "02-TRACK-PRO"),
    ],
    extraFiles: COMMON_TRACK_EXTRAS,
    readme: proReadme(),
  },
  bundle: {
    label: "Bundle Track",
    sources: [
      join(DJ_PRO_BUNDLE_ROOT, "03-TRACK-BUNDLE"),
    ],
    extraFiles: COMMON_TRACK_EXTRAS,
    readme: bundleReadme(),
  },
};

const EXCLUDE_GLOBS = [
  ".DS_Store",
  "__MACOSX",
  "Thumbs.db",
];
const EXCLUDE_EXT = [".odt"];
const EXCLUDE_NAME_CONTAINS = ["hotmart"];

const OUT_DIR = join(REPO_ROOT, "dist-deliverables");

// ── CLI args ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const tierArg = (args.find((a) => a.startsWith("--tier=")) || "").split("=")[1];

// ── Logging ────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};
function log(msg) { process.stdout.write(msg + "\n"); }
function info(msg) { log(`${c.cyan}→${c.reset} ${msg}`); }
function ok(msg) { log(`${c.green}✓${c.reset} ${msg}`); }
function warn(msg) { log(`${c.yellow}⚠${c.reset} ${msg}`); }
function err(msg) { log(`${c.red}✗${c.reset} ${msg}`); }

// ── Helpers ────────────────────────────────────────────────────
function shouldExclude(absPath) {
  const name = basename(absPath);
  if (EXCLUDE_GLOBS.includes(name)) return true;
  if (EXCLUDE_EXT.some((ext) => name.toLowerCase().endsWith(ext))) return true;
  if (EXCLUDE_NAME_CONTAINS.some((needle) => name.toLowerCase().includes(needle))) return true;
  return false;
}

function cleanTree(rootPath) {
  let removed = 0;
  function walk(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch (_) { return; }
    for (const entry of entries) {
      const full = join(dir, entry);
      let st;
      try { st = statSync(full); } catch (_) { continue; }
      if (shouldExclude(full)) {
        rmSync(full, { recursive: true, force: true });
        removed++;
        continue;
      }
      if (st.isDirectory()) walk(full);
    }
  }
  walk(rootPath);
  return removed;
}

function fileCount(rootPath) {
  let count = 0;
  function walk(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch (_) { return; }
    for (const entry of entries) {
      const full = join(dir, entry);
      let st;
      try { st = statSync(full); } catch (_) { continue; }
      if (st.isDirectory()) walk(full);
      else count++;
    }
  }
  walk(rootPath);
  return count;
}

function copyExtraFiles(rootPath, extraFiles = []) {
  let copied = 0;
  let missing = 0;

  for (const file of extraFiles) {
    if (!existsSync(file.src)) {
      missing++;
      continue;
    }

    const destPath = join(rootPath, file.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    cpSync(file.src, destPath);
    copied++;
  }

  return { copied, missing };
}

function brandAssetsReadme(tierKey, copiedAssets) {
  const tierName = tierDisplayName(tierKey);
  const assetsList = copiedAssets
    .map((asset) => `- ${asset.dest.replace("02_BRAND_ASSETS/", "")}: ${asset.label}`)
    .join("\n");

  return `# Brand assets — Dev Journey ${tierName}

Atualizado em ${COURSE_UPDATED_AT}.

Esta pasta contém os assets visuais oficiais do Dev Journey aprovados para este pacote.

## Arquivos inclusos

${assetsList}

## Como usar

- Use o new-devjourney-asset.webp como capa, hero ou imagem de apresentação do curso.
- Use o digitalpresence.webp como bônus visual para páginas sobre presença digital, serviços ou portfolio.
- Se precisar de ícones para o próprio site, use o pack opcional em 03_VOLYNX_FREE_ICON_PACK/.

## Cuidados

- Nao distorça a proporção dos assets.
- Nao revenda, redistribua ou empacote esses assets como biblioteca independente.
- Em projeto de portfólio, mantenha a marca como referência educacional do Dev Journey, não como se a VOLYNX fosse dona do seu projeto.
`;
}

function injectBrandAssets(rootPath, tierKey) {
  const brandRoot = join(rootPath, "02_BRAND_ASSETS");
  rmSync(brandRoot, { recursive: true, force: true });
  mkdirSync(brandRoot, { recursive: true });

  const copiedAssets = [];
  let missing = 0;

  for (const asset of BRAND_ASSETS) {
    if (!existsSync(asset.src)) {
      missing++;
      continue;
    }

    const destPath = join(rootPath, asset.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    cpSync(asset.src, destPath);
    copiedAssets.push(asset);
  }

  writeFileSync(
    join(brandRoot, "README-BRAND-ASSETS.md"),
    brandAssetsReadme(tierKey, copiedAssets),
    "utf8"
  );

  return { copied: copiedAssets.length, missing };
}

function iconPackReadme(tierKey, copiedCount) {
  const tierName = tierDisplayName(tierKey);

  return `# VOLYNX Free Icon Pack — Dev Journey ${tierName}

Atualizado em ${COURSE_UPDATED_AT}.

Este é um bônus opcional para o aluno usar no próprio site, portfolio ou projeto final do Dev Journey.

## O que vem aqui

- Pack: ${OPTIONAL_ICON_PACK.label}
- Quantidade: ${copiedCount} ícones .webp
- Pasta: ${OPTIONAL_ICON_PACK.dest}/

## Como usar

1. Copie apenas os ícones que combinam com seu projeto.
2. Coloque na pasta de assets do seu site.
3. Use em cards, seções de features, blocos de serviços ou detalhes visuais.
4. Otimize tamanho/dimensões se o projeto final ficar pesado.

## Licença de uso para alunos

Você pode usar estes ícones em projetos próprios e em portfolio criado durante o Dev Journey.

Você não pode revender, redistribuir como pack independente, publicar como biblioteca de assets ou remover o contexto VOLYNX para vender como coleção própria.
`;
}

function injectOptionalIconPack(rootPath, tierKey) {
  const packRoot = join(rootPath, "03_VOLYNX_FREE_ICON_PACK");
  rmSync(packRoot, { recursive: true, force: true });
  mkdirSync(packRoot, { recursive: true });

  if (!existsSync(OPTIONAL_ICON_PACK.src)) {
    return { copied: 0, missing: 1 };
  }

  const destRoot = join(rootPath, OPTIONAL_ICON_PACK.dest);
  mkdirSync(destRoot, { recursive: true });

  const files = readdirSync(OPTIONAL_ICON_PACK.src)
    .filter((file) => file.toLowerCase().endsWith(".webp"))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  for (const file of files) {
    cpSync(join(OPTIONAL_ICON_PACK.src, file), join(destRoot, file));
  }

  writeFileSync(
    join(packRoot, "README-ICON-PACK.md"),
    iconPackReadme(tierKey, files.length),
    "utf8"
  );

  return { copied: files.length, missing: 0 };
}

function packageTier(tierKey) {
  const tier = TIERS[tierKey];
  if (!tier) {
    err(`Unknown tier: ${tierKey}`);
    return false;
  }

  const validSources = tier.sources.filter((s) => existsSync(s));
  if (validSources.length === 0) {
    warn(`Skipping ${tierKey}: no source folders configured or accessible.`);
    return false;
  }

  info(`Packaging ${c.yellow}${tierKey}${c.reset} (${tier.label})`);

  const zipPath = join(OUT_DIR, `devjourney-${tierKey}.zip`);
  const stagingRoot = join(OUT_DIR, `_staging_${tierKey}`);
  const packageRoot = join(stagingRoot, `devjourney-${tierKey}`);

  if (dryRun) {
    log(`  ${c.dim}sources:${c.reset}`);
    validSources.forEach((s) => log(`    - ${s}`));
    if (tier.extraFiles?.length) {
      log(`  ${c.dim}shared extras:${c.reset}`);
      tier.extraFiles.forEach((f) => log(`    - ${f.src} -> ${f.dest}`));
    }
    log(`  ${c.dim}target:${c.reset} ${zipPath}`);
    return true;
  }

  // Reset staging
  rmSync(stagingRoot, { recursive: true, force: true });
  mkdirSync(packageRoot, { recursive: true });

  // Copy each source under a folder named after its basename
  for (const src of validSources) {
    cpSync(src, packageRoot, { recursive: true });
  }

  // Clean junk
  const removed = cleanTree(packageRoot);
  if (removed > 0) ok(`  removed ${removed} junk entries (.DS_Store, __MACOSX, .odt, hotmart-*)`);

  const extras = copyExtraFiles(packageRoot, tier.extraFiles);
  if (extras.copied > 0) ok(`  copied ${extras.copied} shared guide file(s)`);
  if (extras.missing > 0) warn(`  skipped ${extras.missing} missing shared guide file(s)`);

  // Inject VOLYNX README
  if (tier.readme) {
    const readmePath = join(packageRoot, "README.md");
    writeFileSync(readmePath, tier.readme, "utf8");
    ok(`  wrote VOLYNX README.md`);
  }

  const guideFiles = startHereGuides(tierKey);
  for (const guide of guideFiles) {
    const guidePath = join(packageRoot, guide.dest);
    mkdirSync(dirname(guidePath), { recursive: true });
    writeFileSync(guidePath, guide.content, "utf8");
  }
  if (guideFiles.length > 0) ok(`  wrote ${guideFiles.length} updated start-here guide(s)`);

  const brandAssets = injectBrandAssets(packageRoot, tierKey);
  if (brandAssets.copied > 0) ok(`  wrote ${brandAssets.copied} updated brand asset(s)`);
  if (brandAssets.missing > 0) warn(`  skipped ${brandAssets.missing} missing brand asset(s)`);

  const iconPack = injectOptionalIconPack(packageRoot, tierKey);
  if (iconPack.copied > 0) ok(`  wrote optional icon pack (${iconPack.copied} icon(s))`);
  if (iconPack.missing > 0) warn(`  skipped optional icon pack source`);

  // Count + size after cleanup
  const count = fileCount(packageRoot);

  // Remove old ZIP, create new
  rmSync(zipPath, { force: true });

  const zipResult = spawnSync(
    "zip",
    ["-r", "-q", join("..", basename(zipPath)), basename(packageRoot)],
    { cwd: stagingRoot, stdio: "inherit" }
  );

  if (zipResult.status !== 0) {
    err(`  zip failed (exit ${zipResult.status})`);
    return false;
  }

  // Cleanup staging
  rmSync(stagingRoot, { recursive: true, force: true });

  const sz = statSync(zipPath).size;
  const mb = (sz / (1024 * 1024)).toFixed(2);
  ok(`  ${zipPath} — ${count} files, ${mb} MB`);
  return true;
}

// ── README templates (replace Hotmart-era copy) ────────────────
function tierDisplayName(tierKey) {
  if (tierKey === "social") return "Social Sprint";
  if (tierKey === "pro") return "Pro Track";
  return "Bundle Track";
}

function tierPathSummary(tierKey) {
  if (tierKey === "social") {
    return `## Ordem recomendada — Social Sprint

1. Bloco 0: setup, conta VOLYNX, GitHub e checklist.
2. Bloco 1: HTML + CSS + primeiro comportamento visível.
3. Bloco 2: JavaScript, DOM, validação e JSON.
4. Publicação: suba o projeto em GitHub Pages, Netlify, Vercel ou outro host estático.
5. Registro: mantenha repo, URL live e README prontos para revisão manual.`;
  }

  if (tierKey === "pro") {
    return `## Ordem recomendada — Pro Track

1. Bloco 0: setup completo, conta VOLYNX, GitHub, Node.js LTS e checklist.
2. Blocos 1 e 2: revise fundamentos e use os starters como base.
3. Bloco 3: abra o projeto React com Vite, rode localmente e avance por features pequenas.
4. Publicação: publique o app e atualize README com repo + URL live.
5. Registro: mantenha repo, URL live e evidências prontos para revisão manual.`;
  }

  return `## Ordem recomendada — Bundle Track

1. Bloco 0: setup completo, conta VOLYNX, GitHub, Node.js LTS e checklist.
2. Blocos 1 e 2: valide fundamentos antes de entrar em React.
3. Bloco 3: construa o app React incremental.
4. Bloco 4: conecte API/arquitetura sem pular o checklist anti-bug.
5. Bloco 5: publique, documente e organize a entrega final.
6. Arsenal: use como biblioteca de aceleradores depois de entender a base, não como atalho cego.`;
}

function tierPackageMap(tierKey) {
  if (tierKey === "social") {
    return `## Onde está cada coisa neste ZIP

- 00_START_HERE/: comece por aqui. Os arquivos Markdown atualizados valem mais do que qualquer instrução antiga.
- 01_SOCIAL/DOCS/: PDFs e glossários dos Blocos 1 e 2.
- 01_SOCIAL/PROJECTS/: starters dos projetos Social.
- 02_BRAND_ASSETS/: new-devjourney-asset, digitalpresence e guia de uso.
- 03_VOLYNX_FREE_ICON_PACK/: pack opcional de ícones para site/portfólio.
- TEMPLATES/: modelos de README e entrega.`;
  }

  if (tierKey === "pro") {
    return `## Onde está cada coisa neste ZIP

- 00_START_HERE/: guias atuais de início, setup, entrega e certificação.
- 01_GLOSSARIOS/: glossários rápidos dos blocos iniciais.
- 02_BRAND_ASSETS/: new-devjourney-asset, digitalpresence e guia de uso.
- 03_VOLYNX_FREE_ICON_PACK/: pack opcional de ícones para site/portfólio.
- PDFs/: materiais do Bloco 0 ao Bloco 3.
- Projetos/Start-Projects/: starters dos blocos iniciais.
- Projetos/Bloco-3-React-App/: starter React incremental com Vite.`;
  }

  return `## Onde está cada coisa neste ZIP

- 00_START_HERE/: guias atuais de início, setup, entrega e certificação.
- 01_GLOSSARIOS/: glossários rápidos dos blocos iniciais.
- 02_BRAND_ASSETS/: new-devjourney-asset, digitalpresence e guia de uso.
- 03_VOLYNX_FREE_ICON_PACK/: pack opcional de ícones para site/portfólio.
- PDFs/: materiais do Bloco 0 ao Bloco 5 + Arsenal Cheatcodes.
- Projetos/Start-Projects/: starters dos blocos iniciais.
- Projetos/ProBundle-Projects/: React, API Express e exemplo de deploy.
- Arsenal/: projetos reutilizáveis e bônus práticos.`;
}

function startHereGuides(tierKey) {
  const tierName = tierDisplayName(tierKey);
  return [
    {
      dest: "00_START_HERE/00-LEIA-PRIMEIRO.md",
      content: `# Comece aqui — Dev Journey ${tierName}

Atualizado em ${COURSE_UPDATED_AT}.

Bem-vindo ao Dev Journey dentro da VOLYNX.

A VOLYNX já está no ar, então a fonte oficial do curso agora é a plataforma:

- Área do aluno: https://volynx.world/dev-journey/student/
- Checklist online: https://volynx.world/dev-journey/checklist/
- Página do curso: https://volynx.world/dev-journey/
- Recuperação de compras/downloads: https://volynx.world/delivery/
- Suporte: https://volynx.world/support/

## Antes de estudar

1. Entre na sua conta VOLYNX.
2. Abra a Área do Aluno.
3. Baixe o ZIP correto para seu tier.
4. Leia este arquivo antes dos PDFs.
5. Siga o arquivo 01-ORDEM-DE-ESTUDO.md.
6. Rode o setup pelo arquivo 02-SETUP-ATUALIZADO.md.
7. Use o checklist online para marcar apenas o que realmente funciona na tela.

## Fonte de verdade

Se algum PDF antigo ou material dentro do ZIP mencionar um fluxo diferente, Hotmart, formulário já ativo ou outro caminho legado, considere este arquivo e a Área do Aluno como a versão atual.

O Dev Journey é autoguiado, mas não é solto: você trabalha com arquivos, checklists, projeto publicado e revisão manual quando a etapa de submissão estiver ativa.

## Status atual

- Social Sprint: grátis com login.
- Pro e Bundle: liberados por tier da conta.
- Progresso: salvo no checklist online quando você está logado.
- Downloads: feitos pelo vault da Área do Aluno.
- Certificação: revisão manual. A automação completa de validação entra em fase pós-lançamento.
- Submissão formal: a Área do Aluno mostra o status atual. Se estiver marcada como Fase 2, mantenha repo + URL live prontos e use o suporte quando precisar solicitar revisão.
`,
    },
    {
      dest: "00_START_HERE/01-ORDEM-DE-ESTUDO.md",
      content: `# Ordem de estudo — Dev Journey ${tierName}

Atualizado em ${COURSE_UPDATED_AT}.

${tierPathSummary(tierKey)}

## Regra principal

Nao marque uma etapa como pronta porque voce "leu". Marque quando existir algo funcionando na tela, com repo organizado e sem erro no Console.

## Rotina segura por bloco

1. Leia o objetivo do bloco.
2. Abra o starter certo.
3. Rode localmente.
4. Faça uma mudança pequena.
5. Veja funcionar na tela.
6. Faça commit.
7. Atualize README quando tiver algo publicável.
8. Marque o checklist online.

${tierPackageMap(tierKey)}

## Quando travar

Use a regra dos 20 minutos:

1. Volte um passo.
2. Rode o exemplo original.
3. Compare arquivo por arquivo.
4. Leia o erro no Console/Terminal.
5. Se ainda travar, anote o erro exato e mande no suporte.
`,
    },
    {
      dest: "00_START_HERE/02-SETUP-ATUALIZADO.md",
      content: `# Setup atualizado — Dev Journey

Atualizado em ${COURSE_UPDATED_AT}.

Este arquivo existe para evitar problema de instrução antiga. Use ele como checklist principal de setup.

## Ferramentas essenciais

- Navegador moderno: Chrome, Edge, Firefox ou Safari atualizado.
- Editor: VS Code recomendado.
- Extensão útil no VS Code: Live Server.
- Conta GitHub com email verificado.
- Git instalado.
- Node.js LTS instalado para Pro/Bundle e para qualquer projeto com Vite.

## Health check no terminal

Rode:

    node -v
    npm -v
    git --version

Se algum comando nao aparecer, instale ou reinstale a ferramenta correspondente antes de avançar.

## Git — configuração inicial

Troque pelos seus dados:

    git config --global user.name "SEU NOME"
    git config --global user.email "SEU EMAIL"
    git config --global init.defaultBranch main

Conferir:

    git config --global --list

## Organização recomendada

Crie uma pasta simples, sem acentos e sem espaços:

    VOLYNX/DevJourney/

Dentro dela, use uma pasta por projeto:

    bloco-1-fundamentos/
    bloco-2-dom-json/
    bloco-3-react-app/
    bloco-4-api/
    bloco-5-deploy/
    projeto-final/

## Rodando projetos HTML/CSS/JS

Para arquivos simples, abra com Live Server no VS Code.

Se o projeto usa fetch para carregar JSON, nao abra direto como file://. Use Live Server, Vite ou outro servidor local.

## Rodando projetos React/Vite

Dentro da pasta do projeto:

    npm install
    npm run dev

Abra a URL que o terminal mostrar, normalmente http://localhost:5173/.

## Antes de publicar

- Console do navegador sem erro vermelho.
- Layout legível no mobile.
- README com o que é, como rodar, link do deploy e link do repo.
- Commits com progresso real.
- URL live abrindo em aba anônima.
`,
    },
    {
      dest: "00_START_HERE/03-ENTREGA-E-CERTIFICACAO.md",
      content: `# Entrega, revisão e certificação

Atualizado em ${COURSE_UPDATED_AT}.

## O que preparar

Para qualquer revisão manual, deixe pronto:

- Nome completo usado na conta VOLYNX.
- Email da conta VOLYNX.
- Tier do Dev Journey: Social, Pro ou Bundle.
- Link do repositório GitHub.
- Link do projeto publicado.
- README atualizado.
- Checklist online marcado apenas com itens que funcionam.
- Observação curta dizendo onde você travou ou o que quer que seja revisado.

## Status honesto da submissão

A certificação existe como revisão manual, mas a pipeline automática de validação está em fase pós-lançamento.

Se a Área do Aluno mostrar "Fase 2" ou "Em breve" no card de submissão, isso significa:

1. Continue estudando normalmente.
2. Publique o projeto.
3. Mantenha repo + URL live prontos.
4. Use o suporte se precisar solicitar revisão antes do formulário final estar ativo.

## Critério mínimo de revisão

- Projeto abre.
- Projeto funciona no navegador.
- Não há erro crítico no Console.
- README explica como rodar.
- Link publicado funciona fora da sua máquina.
- O que foi marcado no checklist aparece no projeto.

## O que não conta como pronto

- Só print sem URL live.
- Repo vazio ou sem README.
- Projeto que só funciona na sua máquina.
- Erro no Console ignorado.
- Copiar arquivo sem conseguir explicar o básico do que ele faz.
`,
    },
  ];
}

function socialReadme() {
  return `# Dev Journey — Social Sprint

Bem-vindo ao Dev Journey Social Sprint pela VOLYNX.

Este pacote contém:
- 00_START_HERE/ — Comece Aqui atualizado, setup, ordem de estudo e regras de certificação
- 01_SOCIAL/ — Bloco 1 (HTML/CSS/JS), Bloco 2 (DOM/JSON), glossários e projetos starter
- 02_BRAND_ASSETS/ — new-devjourney-asset, digitalpresence e guia de uso
- 03_VOLYNX_FREE_ICON_PACK/ — pack opcional de ícones para site/portfólio
- TEMPLATES/ — templates de README de projeto e entrega

## Como funciona

1. Comece por \`00_START_HERE/00-LEIA-PRIMEIRO.md\`
2. Siga \`00_START_HERE/01-ORDEM-DE-ESTUDO.md\`
3. Rode o setup por \`00_START_HERE/02-SETUP-ATUALIZADO.md\`
4. Use o checklist online em https://volynx.world/dev-journey/checklist/
5. Quando terminar, deixe repo + URL live prontos. A revisão/certificação é manual; a Área do Aluno mostra quando a submissão formal estiver ativa.

## Suporte

- Área do aluno: https://volynx.world/dev-journey/student/
- Suporte: https://volynx.world/support/

## Próximos passos

Ao terminar o Social, você pode subir pra **Pro** (Bloco 3 — React App) ou **Bundle** (Blocos 4-5 + Arsenal Kit). Compare em https://volynx.world/dev-journey/#upgrade

---

VOLYNX • Building a Smarter Future
`;
}

function proReadme() {
  return `# Dev Journey — Pro Track

Bem-vindo ao Dev Journey Pro pela VOLYNX.

Este pacote contém:
- 00_START_HERE/ — Comece Aqui atualizado, compatibilidade, uso do curso e certificação
- 01_GLOSSARIOS/ — glossários dos blocos 1 e 2 para consulta rápida
- 02_BRAND_ASSETS/ — new-devjourney-asset, digitalpresence e guia de uso
- 03_VOLYNX_FREE_ICON_PACK/ — pack opcional de ícones para site/portfólio
- PDFs/ — materiais do Bloco 0 ao Bloco 3
- Projetos/Start-Projects/ — starters dos blocos iniciais
- Projetos/Bloco-3-React-App/ — projeto React incremental com Vite

## Como usar

1. Comece por \`00_START_HERE/00-LEIA-PRIMEIRO.md\`
2. Siga \`00_START_HERE/01-ORDEM-DE-ESTUDO.md\`
3. Rode o setup por \`00_START_HERE/02-SETUP-ATUALIZADO.md\`
4. Passe pelos PDFs do Bloco 0 antes de abrir o React starter
5. Use os projetos starter como base e evolua até o app React
6. Quando terminar, deixe repo + URL live prontos para revisão manual pela Área do Aluno/Suporte

## Suporte

- Área do aluno: https://volynx.world/dev-journey/student/
- Checklist: https://volynx.world/dev-journey/checklist/
- Suporte: https://volynx.world/support/

## Próximos passos

Ao concluir o Pro, o próximo nível é o **Bundle**, que libera Blocos 4-5, deploy/certificação e o Arsenal Kit.

---

VOLYNX • Building a Smarter Future
`;
}

function bundleReadme() {
  return `# Dev Journey — Bundle

Bem-vindo ao Dev Journey Bundle pela VOLYNX.

Este pacote contém:
- 00_START_HERE/ — Comece Aqui atualizado, compatibilidade, uso do curso e certificação
- 01_GLOSSARIOS/ — glossários dos blocos 1 e 2
- 02_BRAND_ASSETS/ — new-devjourney-asset, digitalpresence e guia de uso
- 03_VOLYNX_FREE_ICON_PACK/ — pack opcional de ícones para site/portfólio
- PDFs/ — materiais do Bloco 0 ao Bloco 5 + Arsenal Cheatcodes
- Projetos/Start-Projects/ — base dos blocos iniciais
- Projetos/ProBundle-Projects/ — React app, API Express e exemplo de deploy
- Arsenal/ — projetos reutilizáveis e bônus práticos

## Como usar

1. Comece por \`00_START_HERE/00-LEIA-PRIMEIRO.md\`
2. Siga \`00_START_HERE/01-ORDEM-DE-ESTUDO.md\`
3. Rode o setup por \`00_START_HERE/02-SETUP-ATUALIZADO.md\`
4. Siga a ordem natural dos PDFs: fundamentos, React, API e deploy
5. Abra os projetos de \`Projetos/ProBundle-Projects/\` conforme avançar
6. Use o \`Arsenal/\` como biblioteca prática para acelerar seus entregáveis
7. Ao finalizar, deixe repo + URL live prontos para revisão manual e certificação

## Suporte

- Área do aluno: https://volynx.world/dev-journey/student/
- Checklist: https://volynx.world/dev-journey/checklist/
- Suporte: https://volynx.world/support/

## Próximos passos

O Bundle já é a trilha completa. O foco daqui pra frente é publicar, validar e transformar os projetos em portfólio real.

---

VOLYNX • Building a Smarter Future
`;
}

// ── Run ────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });

const tiersToRun = tierArg ? [tierArg] : Object.keys(TIERS);
let okCount = 0;
let skipCount = 0;

for (const tier of tiersToRun) {
  const result = packageTier(tier);
  if (result) okCount++;
  else skipCount++;
}

log("");
if (dryRun) {
  ok(`Dry run complete. Would build ${okCount} tier(s).`);
} else {
  ok(`Done. ${okCount} ZIP(s) built, ${skipCount} skipped.`);
  if (okCount > 0) log(`${c.dim}  → ${OUT_DIR}${c.reset}`);
}
