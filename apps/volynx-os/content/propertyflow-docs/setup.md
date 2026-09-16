# Property Flow — setup do export estático

> O workspace hospedado continua sendo o caminho recomendado para quem quer editar imóveis pelo painel. O ZIP é uma alternativa independente para quem prefere editar arquivos locais e publicar em qualquer hospedagem estática.

## O que o ZIP contém

- Um site imobiliário completo em HTML, CSS e JavaScript.
- Configuração local de marca, contatos, idiomas e template.
- Catálogo local em JSON, fotos WebP, filtros e detalhes dos imóveis.
- Os templates do tier comprado: 3 no Starter, 6 no Professional e 15 no White-Label.
- Validação, servidor local e build de produção usando apenas Node.js.

O export não contém login VOLYNX, Stripe, Supabase, dados de clientes, credenciais ou o dashboard hospedado.

## 1. Preparar o computador

Instale Node.js 20 ou mais recente em [nodejs.org](https://nodejs.org). Não é necessário criar conta em Supabase nem configurar variáveis de ambiente.

Descompacte o ZIP e abra a pasta em um terminal.

## 2. Validar e visualizar

```bash
npm run validate
npm run dev
```

Abra `http://127.0.0.1:4173`.

Não é necessário rodar `npm install`: o export não possui dependências externas.

## 3. Personalizar

1. Edite `content/site.json` para trocar nome, logo, cores, contatos, idiomas e template padrão.
2. Edite `content/properties.json` para substituir os imóveis de demonstração.
3. Coloque fotos otimizadas em `images/` e use caminhos locais como `./images/casa.webp`.
4. Rode `npm run validate` novamente.

O contrato completo está em `docs/CONTENT-CONTRACT.md` dentro do ZIP.

## 4. Escolher o template

Durante a personalização, use o seletor exibido no próprio site. Depois escolha o template definitivo em `content/site.json`:

```json
{
  "template": {
    "selected": "classic-grid",
    "showSelector": false
  }
}
```

A lista `template.available` é gerada pelo tier e validada automaticamente. Trocar o template não modifica imóveis nem fotos.

## 5. Criar o site de produção

```bash
npm run build
npm run preview
```

O site pronto fica em `dist/`. Publique essa pasta em Netlify, Cloudflare Pages, Vercel ou outra hospedagem estática. As instruções específicas ficam em `docs/DEPLOY.md`.

## Site já existente

O caminho universal é publicar o Property Flow em um subdomínio, como `imoveis.suaempresa.com`, e adicionar um link no site existente. Incorporar o catálogo dentro de outra plataforma depende dessa plataforma e não pode ser automatizado sem acesso ou suporte do provedor.

## Atualizações de conteúdo

O export estático não sincroniza com o dashboard hospedado. Para atualizar imóveis, edite os arquivos JSON, rode o build e publique novamente. Quem precisa de edição diária sem arquivos deve usar o workspace hospedado.
