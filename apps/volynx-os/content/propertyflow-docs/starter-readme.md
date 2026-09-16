# Property Flow — Starter

O Starter inclui dois caminhos complementares:

1. Workspace hospedado VOLYNX, com onboarding guiado.
2. Export estático independente, para editar por arquivos e hospedar onde quiser.

O ZIP Starter agora é uma aplicação estática completa, não um placeholder. Ele inclui catálogo, filtros, conteúdo bilíngue, branding, contatos, fotos locais, detalhes dos imóveis e 3 templates:

- Classic Grid
- Magazine
- Compact List

## Início rápido do export

```bash
npm run validate
npm run dev
```

Abra `http://127.0.0.1:4173`. Edite `content/site.json`, `content/properties.json` e a pasta `images/`. Para publicar:

```bash
npm run build
```

Envie a pasta `dist/` para uma hospedagem estática.

O export não possui dashboard, banco de dados ou sincronização automática. Para administração sem arquivos, use o workspace hospedado.

Consulte `README.md`, `docs/CONTENT-CONTRACT.md`, `docs/DEPLOY.md` e `LICENSE.md` dentro do ZIP.
