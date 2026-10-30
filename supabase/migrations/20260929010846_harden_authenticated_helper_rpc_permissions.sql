REVOKE EXECUTE ON FUNCTION public.get_property_flow_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_property_flow_access() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, text[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_property_flow_entitlement() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_property_flow_entitlement() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_pratti_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pratti_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;
