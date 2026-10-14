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
| Starter | `propertyflow-starter-v1.1.3.zip` | 3 | Uma organização |
| Professional | `propertyflow-professional-v1.1.3.zip` | 6 | Uma organização ou uma entrega de agência |
| White-Label | `propertyflow-white-label-v1.1.3.zip` | 15 | Múltiplas entregas e remoção da atribuição |

Os três ZIPs v1.1.3 estão publicados no bucket privado e foram relidos com verificação de tamanho e SHA-256. O contrato v1.1.3 está implantado nas funções `stripe-webhook`, `refresh-pf-url` e `regenerate-delivery-url`. Duas compras reais de R$ 0,50 do Starter, em 17 e 28/09/2026, comprovaram pagamento, entitlement ativo, workspace publicado e emissão de link assinado para a versão então vigente (v1.1.0). Ainda não há prova de que o comprador abriu o ZIP nem de que a recuperação/download da v1.1.3 foi exercitada com esse entitlement. Não é necessário cobrar novamente para reconhecer esses testes.

Cada arquivo contém:

- aplicação estática completa em HTML, CSS e JavaScript;
- `content/site.json` e `content/properties.json`;
- fotos locais otimizadas de demonstração;
- biblioteca opcional de 30 assets WebP para apresentação e interface;
- busca, filtros, galeria, detalhes e contato;
- templates limitados pelo tier;
- `npm run validate`, `npm run dev`, `npm run build` e `npm run preview`;
- documentação de conteúdo, escopo, deploy e licença.

## Limite deliberado

O export não contém dashboard, Supabase, Stripe, autenticação, CRM, segredos, dados de tenants ou sincronização com o workspace hospedado. Essa separação permite hospedar o site em qualquer provedor sem expor a infraestrutura VOLYNX.

## Bundle de auditoria

`propertyflow-complete-v1.1.3.zip` contém os três ZIPs e o manifesto de release. Ele é um artefato interno de auditoria; o comprador recebe somente o tier adquirido. O manifesto da geração fica em `storage/propertyflow/propertyflow-v1.1.3-release-manifest.json`; o contrato ativo de entrega usa `public/downloads/propertyflow/manifest.json`.

Os arquivos ficam em `apps/volynx-os/storage/propertyflow`, fora de `public`, e são servidos apenas pelas rotas protegidas de entrega.
