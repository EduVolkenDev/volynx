CREATE OR REPLACE FUNCTION public.guard_world_service_publish_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  provider_world_plan text := 'free';
  published_count integer := 0;
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(world_plan, 'free')
  INTO provider_world_plan
  FROM public.profiles
  WHERE id = NEW.provider_id;

  IF provider_world_plan <> 'free' THEN
    RETURN NEW;
  END IF;

  SELECT count(*)
  INTO published_count
  FROM public.world_services
  WHERE provider_id = NEW.provider_id
    AND status = 'published'
    AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

  IF published_count >= 1 THEN
    RAISE EXCEPTION USING
      MESSAGE = 'world_free_service_limit',
      DETAIL = 'Free profiles can publish only 1 service. Upgrade to World Member or World Pro to publish more.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS world_services_guard_publish_limit ON public.world_services;
CREATE TRIGGER world_services_guard_publish_limit
  BEFORE INSERT OR UPDATE ON public.world_services
  FOR EACH ROW EXECUTE FUNCTION public.guard_world_service_publish_limit();

CREATE OR REPLACE FUNCTION public.world_public_membership(p_user_ids uuid[] DEFAULT NULL)
RETURNS TABLE(user_id uuid, world_plan text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    wp.user_id,
    CASE COALESCE(p.world_plan, 'free')
      WHEN 'member' THEN 'member'
      WHEN 'pro' THEN 'pro'
      ELSE 'free'
    END AS world_plan
  FROM public.world_profiles wp
  LEFT JOIN public.profiles p
    ON p.id = wp.user_id
  WHERE wp.is_published = true
    AND (p_user_ids IS NULL OR wp.user_id = ANY (p_user_ids));
$$;

REVOKE ALL ON FUNCTION public.world_public_membership(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.world_public_membership(uuid[]) TO anon, authenticated;

COMMENT ON FUNCTION public.world_public_membership(uuid[]) IS
  'Returns the public World membership tier (free/member/pro) for published World profiles only.';
