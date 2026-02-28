# VOLYNX Static Patch Pack (Cloudflare Pages)

Este pacote resolve os bloqueios mais críticos observados:
- **HTTP 405 em /login**: removido POST (host estático não aceita POST).
- **CSP bloqueando QR Generator**: CSP específico para QR Generator permitindo `unpkg.com`.
- Scripts agora são carregados como **ES modules** quando necessário.

## Arquivos principais
- `/login/index.html` (login estático)
- `/scripts/auth-login.js` (login via Supabase Auth REST)
- `/config.json` (config pública: SUPABASE_URL + ANON KEY + API_URL)
- `/scripts/qr-gen.js` (QR generator via `qr-code-styling` em unpkg)
- `/_headers` (CSP e headers Cloudflare Pages)

## Passos
1. Edite `/config.json` e preencha:
   - `supabaseUrl`
   - `supabaseAnonKey` (pública)
   - `apiBaseUrl` (Render)
2. Faça deploy deste diretório como output no Cloudflare Pages.

## Como testar
- Abra `/login/` e faça login.
- Ao logar, o token fica em `localStorage`:
  - `volynx_access_token`