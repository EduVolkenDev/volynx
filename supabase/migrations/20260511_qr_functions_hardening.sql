-- Hardening das funções introduzidas em 20260511_qr_codes_dynamic.sql
-- Resposta aos warnings do advisor de segurança Supabase.

-- 1. search_path imutável (lint 0011)
ALTER FUNCTION public.qr_codes_set_updated_at() SET search_path = pg_temp;

-- 2. Trigger function não deve ser callable via REST RPC (lint 0028 + 0029)
REVOKE ALL ON FUNCTION public.enforce_qr_quota() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_qr_quota() TO service_role;
