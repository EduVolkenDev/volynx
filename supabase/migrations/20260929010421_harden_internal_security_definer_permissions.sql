REVOKE EXECUTE ON FUNCTION public.apply_founder_admin_grants() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_founder_admin_grants() TO service_role;

REVOKE EXECUTE ON FUNCTION public.sync_admin_to_app_metadata() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_admin_to_app_metadata() TO service_role;

REVOKE EXECUTE ON FUNCTION public.build_site_snapshot_payload(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.build_site_snapshot_payload(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.provision_property_flow_workspace(uuid, uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_property_flow_workspace(uuid, uuid, text, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.publish_site_snapshot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_site_snapshot(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;
