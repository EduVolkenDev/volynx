REVOKE ALL ON FUNCTION public.claim_world_starter_benefit_atomic(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_world_starter_benefit_atomic(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.claim_world_starter_benefit_atomic(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_world_starter_benefit_atomic(uuid, text) TO service_role;

COMMENT ON TABLE public.world_profiles IS 'Public professional identities for Volynx World, separate from private account profiles.';
COMMENT ON COLUMN public.world_services.vx_discount_pct IS 'Maximum future VX benefit advertised for this service. No VX settlement occurs in marketplace v1.';
COMMENT ON TABLE public.world_starter_benefits IS 'One-time founding benefit for professionals who publish a qualified Volynx World profile and service.';
