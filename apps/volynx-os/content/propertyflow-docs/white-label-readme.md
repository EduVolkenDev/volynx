# Property Flow — White-Label

O White-Label inclui o workspace hospedado multi-cliente e o export estático independente com todos os 15 templates licenciados:

- Classic Grid, Magazine e Compact List
- Gallery Hero, Split View e Masonry
- Editorial, Minimalist, Card Stack, Timeline e Map-First
- Grouped, Story Mode, Showroom e Catalog

O ZIP é uma aplicação estática completa. A marca, os contatos, os imóveis, as fotos e o template ficam em arquivos locais; nenhuma rota privada, credencial ou dado de cliente VOLYNX é incluído.

## Início rápido do export

```bash
npm run validate
npm run dev
```

Edite `content/site.json`, `content/properties.json` e `images/`. Rode `npm run build` e publique `dist/`.

O White-Label pode definir `brand.showPoweredBy` como `false`. A licença permite múltiplas entregas legítimas para clientes, mas não a redistribuição do código como outro kit ou template.

O export não é um clone do dashboard hospedado e não sincroniza automaticamente com tenants. Ele é a opção portátil para sites estáticos controlados pela agência.
