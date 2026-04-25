# PropertyFlow — Guia de customização

Este guia mostra como deixar o PropertyFlow **com a sua cara** — nome da imobiliária, cores, logo, textos — **sem tocar em código**.

Tempo total: **30 minutos a 1 hora**, dependendo de quantas coisas você quer trocar.

A maior parte das mudanças vive em **um único arquivo**: `src/config/brand.ts`. Dois ou três arquivos de texto no total. Nada mais.

---

## Antes de começar

Você já terminou o [SETUP.md](SETUP.md) e viu o PropertyFlow rodando no seu computador? Se ainda não, **volta e termina aquele primeiro**. Este guia assume que o site já roda em `http://localhost:5173`.

**Ferramentas que você vai usar:**
- Um editor de texto simples (Bloco de Notas no Windows, TextEdit no Mac — ou qualquer outro)
- O Terminal (Prompt de Comando) aberto na pasta do PropertyFlow, rodando `npm run dev`

Dica: se você editar um arquivo e **salvar**, o site no navegador **atualiza sozinho** em poucos segundos. Você não precisa reiniciar nada.

---

## Parte 1 — Trocar nome, cores e logo (15 minutos)

Abre o arquivo **`src/config/brand.ts`** no seu editor de texto.

Você vai ver algo como isso:

```typescript
export const brand = {
  // 1. Identidade básica
  name: "Silva Imóveis",
  tagline: "Imóveis selecionados na Zona Sul do Rio.",
  logo: "/brand/silva-logo.svg",
  logoAlt: "Silva Imóveis",
  favicon: "/brand/favicon.ico",

  // 2. Cores principais
  colors: {
    primary: "#0a3a2e",    // verde-floresta escuro
    accent:  "#d4af37",    // dourado
    bg:      "#ffffff",    // fundo modo claro
    bgDark:  "#0a0a0f",    // fundo modo escuro
  },

  // 3. Fontes
  typography: {
    heading: "Fraunces",
    body: "Inter",
  },

  // 4. Contato
  contact: {
    phone: "+55 21 99999-9999",
    whatsapp: "5521999999999",
    email: "contato@silvaimoveis.com.br",
    address: "Rua Visconde de Pirajá, 550 · Ipanema · Rio de Janeiro",
  },

  // 5. Redes sociais
  social: {
    instagram: "silvaimoveis",
    linkedin: null,
    facebook: null,
    whatsappEnabled: true,
  },

  // 6. SEO (otimização para Google)
  seo: {
    defaultTitle: "Silva Imóveis — especialista em Zona Sul",
    defaultDescription: "Imóveis curados em Ipanema, Leblon e Copacabana.",
    ogImage: "/brand/og-image.png",
    twitterHandle: "@silvaimoveis",
  },
};
```

Vou explicar cada parte.

### 1. Identidade básica

- **`name`**: o nome da sua imobiliária. Aparece no header, rodapé, meta tags, emails, abas do navegador. Troque pra sua marca. Exemplo: `"Santos Corretora"`
- **`tagline`**: uma frase curta que descreve sua imobiliária. Aparece embaixo do nome em alguns lugares. Exemplo: `"Imóveis em Florianópolis desde 1998."`
- **`logo`**: caminho pra sua imagem de logo. Explicação completa na **Parte 2** abaixo.
- **`logoAlt`**: texto alternativo pro logo (pra acessibilidade e SEO). Geralmente é o próprio nome da imobiliária.
- **`favicon`**: aquela iconezinha que aparece na aba do navegador.

### 2. Cores

São 4 cores no total. Use códigos hexadecimais (aqueles que começam com `#`). Se não sabe o código da sua cor:

- Vá em **https://htmlcolorcodes.com/color-picker/**
- Mexa no color picker até achar a cor que quer
- Copia o código hexadecimal que aparece em cima

- **`primary`**: sua cor principal. Botões, títulos destacados, elementos de marca.
- **`accent`**: cor secundária, pra detalhes (links, hover, realces).
- **`bg`**: fundo do site no modo claro. Normalmente branco `#ffffff` ou quase-branco.
- **`bgDark`**: fundo do site no modo escuro. Normalmente preto `#0a0a0f` ou azul-quase-preto.

**Regra prática:** primary e accent devem ter bom contraste com o fundo. Se você tem dúvida se a cor combina, joga em **https://www.whocanuse.com/** — ele testa acessibilidade pra você.

### 3. Fontes

- **`heading`**: fonte dos títulos. `"Fraunces"`, `"Playfair Display"`, `"Sora"`, `"DM Serif Display"` — qualquer fonte do Google Fonts funciona.
- **`body`**: fonte do texto normal. `"Inter"`, `"DM Sans"`, `"Manrope"` são boas escolhas premium.

**Onde ver fontes disponíveis:** **https://fonts.google.com** — escreve o nome exato no código (com a mesma grafia).

Se quiser mudar a fonte, tem UM PASSO EXTRA — você precisa adicionar ela em `index.html`. Abre esse arquivo, procura por uma linha que começa com `<link href="https://fonts.googleapis.com/css2?...`, e adiciona sua fonte nova no URL. Exemplo, pra adicionar "Manrope":

Antes:
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:...&family=Inter:..." rel="stylesheet">
```

Depois (adiciona `&family=Manrope:wght@400;600`):
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:...&family=Inter:...&family=Manrope:wght@400;600" rel="stylesheet">
```

### 4. Contato

- **`phone`**: seu telefone com código de país. Formato: `"+55 11 99999-9999"`
- **`whatsapp`**: só os números, sem `+`, sem espaços, sem traços. Exemplo: `"5511999999999"`. É o formato que o WhatsApp API usa. Se cliente clicar no botão de WhatsApp, ele abre uma conversa com esse número.
- **`email`**: o email que vai aparecer no rodapé e nas respostas dos leads
- **`address`**: endereço completo que aparece no rodapé

### 5. Redes sociais

- **`instagram`**: seu @ do Instagram, SEM o @. Exemplo: `"silvaimoveis"`, não `"@silvaimoveis"`.
- **`linkedin`**, **`facebook`**: igual. Se não tem, deixa como `null` (sem aspas) e o ícone não aparece.
- **`whatsappEnabled`**: `true` ou `false`. Se `true`, aparece um botão flutuante de WhatsApp no canto da tela.

### 6. SEO

Isso define como seu site aparece no Google e em links compartilhados no WhatsApp/Instagram.

- **`defaultTitle`**: título que aparece nos resultados do Google e na aba do navegador. **Máximo 60 caracteres**. Exemplo bom: `"Silva Imóveis — Zona Sul do Rio | Apartamentos e Casas"`
- **`defaultDescription`**: aquela descrição pequena embaixo do título no Google. **Máximo 160 caracteres**. Fala o que você faz e pra quem.
- **`ogImage`**: imagem que aparece quando alguém compartilha seu site no WhatsApp, LinkedIn, Twitter. **Tamanho ideal: 1200×630 pixels**. Salva como PNG em `/public/brand/og-image.png`.
- **`twitterHandle`**: seu @ do Twitter/X com `@`. Se não tem, deixa `null`.

---

## Parte 2 — Colocar seu logo e favicon (10 minutos)

### Logo

1. Pegue seu arquivo de logo. Formato ideal: **SVG** (vetor, ajusta pra qualquer tamanho sem perder qualidade). Se só tem PNG, tudo bem — use PNG com fundo transparente e **no mínimo 400px de largura**.
2. Copia o arquivo pra dentro da pasta `public/brand/` do PropertyFlow. Se a pasta `brand` não existe, crie ela.
3. Renomeia pra algo simples tipo `logo.svg` ou `logo.png`.
4. Volta no arquivo `brand.ts` e troca:
   ```typescript
   logo: "/brand/logo.svg",
   ```
5. Salva.

**Versão clara E escura:** se seu logo é escuro e o site tem modo claro E escuro, você precisa de duas versões:
```typescript
logo: "/brand/logo-dark.svg",     // pra modo claro
logoLight: "/brand/logo-light.svg", // pra modo escuro
```
O PropertyFlow troca automaticamente dependendo do tema.

### Favicon (iconezinha da aba)

1. Se você tem seu logo em formato quadrado, use **https://favicon.io/favicon-converter/** pra converter.
2. Baixa o arquivo `favicon.ico`.
3. Coloca ele em `public/brand/favicon.ico`.
4. No `brand.ts`:
   ```typescript
   favicon: "/brand/favicon.ico",
   ```

**Como testar se deu certo:**
- Salva o arquivo `brand.ts`
- Atualiza a página no navegador (F5)
- Confere se o logo novo aparece no header
- Confere se o ícone novo aparece na aba

---

## Parte 3 — Trocar textos do site (20 minutos)

O PropertyFlow é **bilíngue** (português e inglês) por padrão. Os textos ficam em dois arquivos:

- `src/i18n/en.json` — inglês
- `src/i18n/pt.json` — português

Se você só vai vender no Brasil, pode ignorar o inglês. Mas se vai atender clientes gringos também (muitas imobiliárias do Rio, SP, Floripa atendem), mantém os dois.

### Como é a estrutura

Abre `src/i18n/pt.json`. Você vai ver algo assim:

```json
{
  "common": {
    "contact": "Entre em contato",
    "viewProperties": "Ver imóveis",
    "bedroom": {
      "one": "quarto",
      "other": "quartos"
    }
  },
  "nav": {
    "home": "Início",
    "properties": "Imóveis",
    "about": "Sobre",
    "contact": "Contato"
  },
  "property": {
    "requestViewing": "Agendar visita",
    "callAgent": "Falar com corretor",
    "price": "Preço",
    "location": "Localização"
  },
  "homepage": {
    "heroEyebrow": "Ipanema · Leblon · Copacabana",
    "heroTitle": "Encontre um lar que vale a espera.",
    "heroSubtitle": "30 anos ajudando famílias a chegar no endereço certo no Rio.",
    "ctaLabel": "Ver imóveis disponíveis"
  }
}
```

**Como editar:**
- É só trocar o texto **depois dos dois pontos**, dentro das aspas.
- **NÃO mude** as palavras antes dos dois pontos (`"common"`, `"viewProperties"`, etc.) — isso é o "nome da gaveta" onde o texto mora, o site procura por esse nome.

**Exemplo:**

Antes:
```json
"heroTitle": "Encontre um lar que vale a espera.",
```

Depois:
```json
"heroTitle": "Sua próxima casa em Florianópolis, selecionada a dedo.",
```

### Regras importantes

- **Aspas duplas**, não simples. `"Contato"` ✓, `'Contato'` ✗
- **Vírgula no final** de cada linha, exceto a última de um bloco. Isso é importante — se você tirar uma vírgula por engano, o site quebra.
- Se quiser incluir uma aspa no meio do texto, **escapa com barra**: `"Digo \"isso\""` — viraria `Digo "isso"` no site.

### Como testar

1. Salva o arquivo `pt.json`
2. Atualiza a página
3. Confere se o texto mudou no site

**Se o site ficar branco ou der erro:** você provavelmente errou uma vírgula, parêntese ou aspa. Volta no arquivo, compara com o original em `en.json`.

### Textos do mesmo lugar nos dois idiomas

Pra um mesmo lugar funcionar bilíngue, edite AMBOS:

- `en.json`:
  ```json
  "heroTitle": "Find a home that feels earned.",
  ```
- `pt.json`:
  ```json
  "heroTitle": "Encontre um lar que vale a espera.",
  ```

Se você mudar só um dos dois, o outro idioma fica com o texto original.

---

## Parte 4 — Customizações avançadas (opcional)

Se você quiser mexer mais a fundo, aqui vão alguns pontos de partida. Todos assumem o PropertyFlow já rodando com seu brand/cores/textos certos.

### Mudar as seções da homepage

As seções da homepage (hero, featured properties, about, etc.) estão em `src/content/homepage.ts`. É um arquivo TypeScript, mas você consegue editar como texto simples. Exemplo:

```typescript
export const homepage = {
  hero: {
    eyebrow: "PREMIUM",
    title: "Your new home.",
    subtitle: "Handpicked properties in prime locations.",
    cta: "Browse properties",
  },
  featured: {
    show: true,
    count: 6,  // quantas propriedades em destaque mostrar
  },
  about: {
    show: true,
    title: "Who we are",
    body: "Our company was founded in 1994...",
  },
  // ...
};
```

Troca os textos. Se quer ocultar uma seção, troca `show: true` → `show: false`.

### Adicionar um novo tipo de imóvel

Por padrão, o PropertyFlow tem alguns tipos (Apartamento, Casa, Cobertura, etc.). Pra adicionar "Sala Comercial":

1. Abre `src/config/property-types.ts`
2. Você vê algo tipo:
   ```typescript
   export const propertyTypes = [
     { value: "apartment", labelEn: "Apartment", labelPt: "Apartamento" },
     { value: "house", labelEn: "House", labelPt: "Casa" },
     { value: "penthouse", labelEn: "Penthouse", labelPt: "Cobertura" },
   ];
   ```
3. Adiciona uma linha nova:
   ```typescript
   { value: "office", labelEn: "Office", labelPt: "Sala Comercial" },
   ```
4. Salva. O tipo novo aparece nos filtros e no painel admin.

### Mudar o rodapé

Está em `src/components/Footer.tsx`. Esse é o único lugar onde você **precisa ler um pouco de código**, mas é direto: procura pelo texto que quer mudar e troca.

---

## Checklist antes de publicar

Antes de colocar seu site no ar (ou redeployar depois das customizações), confira:

- [ ] **Nome** da imobiliária aparece no header, rodapé, meta tags
- [ ] **Logo** aparece correto no header, nas duas versões (clara e escura)
- [ ] **Favicon** aparece na aba do navegador
- [ ] **Cores** estão como você quer (primary, accent, background)
- [ ] **Fonte** está carregando corretamente
- [ ] **Telefone, WhatsApp, email, endereço** estão corretos no rodapé
- [ ] **Instagram** e outras redes apontam pras suas contas reais
- [ ] **Título e descrição SEO** estão preenchidos e bons pro Google
- [ ] **og:image** está em `public/brand/og-image.png` (1200×630 px)
- [ ] **Textos** em português e inglês (se bilíngue) estão revisados
- [ ] **Nenhum texto "Silva Imóveis", "Lorem ipsum" ou placeholder** sobrou em nenhum canto — pesquise na pasta do projeto pra ter certeza

---

## Problemas comuns

### Salvo o brand.ts mas o site não muda
- Confere se o Terminal (`npm run dev`) ainda está rodando. Se parou, roda de novo.
- Força um hard refresh no navegador: `Ctrl + Shift + R` (Windows) ou `Cmd + Shift + R` (Mac).

### O site ficou todo branco depois que eu editei um arquivo JSON
- Você provavelmente tirou ou colocou uma vírgula errada.
- Abre **https://jsonlint.com**, cola o conteúdo do arquivo, clica "Validate JSON". Ele mostra exatamente onde está o erro.

### Minha fonte do Google Fonts não está carregando
- Confere se você escreveu o nome **exatamente igual** no `brand.ts` e no `index.html`. "Fraunces" ≠ "fraunces".
- Confere se o `index.html` tem a linha do Google Fonts completa sem cortar.

### Troquei a cor mas só mudou em alguns lugares
- Algumas partes do site (componentes customizados) podem ter cores fixas em CSS. Abre `src/styles/tokens.css` e procura pela cor antiga — troca manualmente se achar.

### Logo fica esmagado ou esticado
- Usa SVG ou PNG com fundo transparente e proporção correta. Se o logo é retangular (tipo 3:1), fica feio em espaço quadrado.
- A altura padrão do logo no header é 40px. Se o SVG não tiver proporção bem calibrada, fica torto.

---

## Próximos passos

- **Adicionar propriedades reais:** [ADMIN.md](ADMIN.md) (Professional e White-Label)
- **Configurar recebimento de leads por email:** [ADMIN.md](ADMIN.md) seção "Notificações"
- **Entender o backend:** [SUPABASE.md](SUPABASE.md) (Professional e White-Label)

Se customizou tudo e funcionou: ✓ **seu site é seu agora.** Hora de adicionar as propriedades reais.

Trava em alguma coisa: email **support@volynx.world** com screenshot e o que você tentou. 24h úteis pra resposta.
