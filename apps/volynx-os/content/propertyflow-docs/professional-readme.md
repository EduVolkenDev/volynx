# Property Flow — Professional

O Professional inclui o workspace hospedado para operação diária e um export estático independente para implantação em infraestrutura própria.

O ZIP Professional é uma aplicação estática completa com catálogo, filtros, conteúdo bilíngue, branding, contatos, fotos locais, galeria, detalhes dos imóveis e 6 templates:

- Classic Grid
- Magazine
- Compact List
- Gallery Hero
- Split View
- Masonry

## Início rápido do export

```bash
npm run validate
npm run dev
```

Edite `content/site.json`, `content/properties.json` e `images/`. Depois rode `npm run build` e publique `dist/`.

Importante: o dashboard, Supabase e a edição sem arquivos pertencem ao produto hospedado. O export é deliberadamente estático e não depende de credenciais VOLYNX. A licença Professional permite uma entrega para cliente conforme `LICENSE.md`.

Consulte a documentação incluída no ZIP antes da publicação.
