# Recuperação de senha — validação local, 21/11/2026

Correção preparada em checkout isolado da VOLYNX, sem alterar a árvore de trabalho principal.

## Arquivos
- src/pages/auth/recover.astro: retorno explícito para /auth/reset/.
- src/pages/auth/reset.astro e public/scripts/auth-reset.js: tela bilíngue, validação da sessão de recuperação, confirmação da senha, erros e continuidade da conta.
- public/scripts/auth-confirm.js e src/pages/auth/confirm.astro: encaminhamento de links de recuperação de templates existentes.
- scripts/auth-reset.test.mjs: cinco testes com fixtures, sem alterar credenciais reais.

## Evidência
- Build Astro: 105 páginas, concluído.
- Cinco testes da recuperação passaram.
- check-auth-flow.mjs passou: persistência, limpeza, login, OAuth e passkeys em ambiente simulado.
- git diff --check e verificações sintáticas passaram.
- Navegador local: mensagem de link ausente/expirado, alternância PT/EN e viewport mobile 390px sem overflow horizontal.
- /auth/v1/settings de produção respondeu 200, provedores e-mail e Google habilitados.

## Limites e próximos passos
Ainda não publicado, sem commit ou push. A tarefa permanece aberta.
Após aprovação da publicação: verificar allowlist de redirecionamentos e template de e-mail no Supabase, receber um link real, confirmar recuperação e novo login, e realizar OAuth real. Os testes simulados não comprovam entrega de e-mail nem login com o Google.
O fluxo implementado aceita token_hash de recovery e fragmento de sessão do fluxo implícito utilizado pelo pedido REST atual; não adiciona recuperação via código PKCE.
A entrada e submissão de uma nova senha devem ser feitas pelo usuário.

Referência: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail e https://supabase.com/docs/reference/javascript/auth-updateuser.
