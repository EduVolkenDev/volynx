-- Restrict the continuity Data API contract to the operations used by clients.
REVOKE ALL ON TABLE public.user_continuity FROM anon;
REVOKE ALL ON TABLE public.user_continuity FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_continuity TO authenticated;
