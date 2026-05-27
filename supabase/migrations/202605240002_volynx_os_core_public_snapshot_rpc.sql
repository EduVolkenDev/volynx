-- ============================================================
-- VOLYNX OS Core public snapshot reader
-- Lets public renderers fetch the latest published snapshot by site slug
-- without exposing draft/editor tables such as sites, pages or sections.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_latest_published_snapshot(p_site_slug text)
RETURNS TABLE (
  id uuid,
  site_id uuid,
  version integer,
  published_at timestamptz,
  payload jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    ps.id,
    ps.site_id,
    ps.version,
    ps.published_at,
    ps.payload
  FROM public.published_snapshots ps
  JOIN public.sites s ON s.id = ps.site_id
  WHERE s.slug = p_site_slug
    AND s.status = 'published'
  ORDER BY ps.version DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_latest_published_snapshot(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_latest_published_snapshot(text) TO anon, authenticated;
