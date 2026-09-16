# Property Flow — exports comerciais

O Property Flow possui dois modos de entrega separados:

1. **Hospedado:** workspace, dashboard, tenant, publicação e dados gerenciados pela infraestrutura VOLYNX.
2. **Export estático:** site autônomo, editável por JSON e imagens locais, sem login ou dependência privada.

Os ZIPs comerciais são gerados a partir de `apps/volynx-os/propertyflow-export/source` com:

```bash
npm run propertyflow:exports
```

Para verificar os arquivos existentes, tiers, checksums, ausência de segredos e estrutura:

```bash
npm run propertyflow:exports:check
```

## Entregas

| Tier | Arquivo | Templates | Direitos principais |
|---|---|---:|---|
| Starter | `propertyflow-starter-v1.1.0.zip` | 3 | Uma organização |
| Professional | `propertyflow-professional-v1.1.0.zip` | 6 | Uma organização ou uma entrega de agência |
| White-Label | `propertyflow-white-label-v1.1.0.zip` | 15 | Múltiplas entregas e remoção da atribuição |

Cada arquivo contém:

- aplicação estática completa em HTML, CSS e JavaScript;
- `content/site.json` e `content/properties.json`;
- fotos locais otimizadas de demonstração;
- busca, filtros, galeria, detalhes e contato;
- templates limitados pelo tier;
- `npm run validate`, `npm run dev`, `npm run build` e `npm run preview`;
- documentação de conteúdo, escopo, deploy e licença.

## Limite deliberado

O export não contém dashboard, Supabase, Stripe, autenticação, CRM, segredos, dados de tenants ou sincronização com o workspace hospedado. Essa separação permite hospedar o site em qualquer provedor sem expor a infraestrutura VOLYNX.

## Bundle de auditoria

`propertyflow-complete-FINAL.zip` contém os três ZIPs e o manifesto de release. Ele é um artefato interno de auditoria; o comprador recebe somente o tier adquirido.

Os arquivos ficam em `apps/volynx-os/storage/propertyflow`, fora de `public`, e são servidos apenas pelas rotas protegidas de entrega.
