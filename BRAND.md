# VOLYNX — Identidade visual oficial

> Regra de ouro: qualquer post, página ou asset que exiba a logo VOLYNX usa
> **somente** um dos três arquivos oficiais abaixo. Nada de variantes antigas,
> renders alternativos, texto digitado ou logos geradas por IA.

## As 3 logos oficiais

| Versão | Arquivo | Quando usar |
|---|---|---|
| **Prata** | `public/assets/wordmark.webp` (1375×750) | Fundos claros |
| **Black/gold** | `public/assets/wordmark-dark-trimmed.webp` (1179×508) | Fundos escuros (é a do header global) |
| **Ícone V (prata)** | `public/assets/V.webp` (2000×2000) | Favicon, avatar, espaços quadrados |

Todas têm fundo transparente. Nunca aplicar moldura, sombra, recolorir ou
redesenhar — usar o arquivo como ele é.

## Onde ficam as oficiais no site

- `src/components/FlagshipHeader.astro` — `V.webp` + `wordmark-dark-trimmed.webp`
- `src/components/VxHeader.astro`, `src/components/Topbar.astro` — `V.webp` + `wordmark.webp`
- Footers usam texto puro "VOLYNX" (sem imagem) — OK.

## Arquivo morto

`public/assets/_arquivo/` guarda variantes antigas e rascunhos **fora de uso**.
Nada ali deve ser referenciado por páginas ou posts. Se precisar de uma logo,
volte à tabela acima.

## Sub-marcas (não são a logo principal)

- Icons Store: `public/assets/icons-store-logo.webp`
- Volynx-OS (app): `apps/volynx-os/public/assets/brand/vx-new.webp`

Última revisão: 2026-09-26.
