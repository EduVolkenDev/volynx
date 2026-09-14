-- The external token credit RPC is server-only. Keep direct client execution
-- disabled even though the function is exposed through the public schema.

REVOKE ALL ON FUNCTION public.credit_external_token_purchase_atomic(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
