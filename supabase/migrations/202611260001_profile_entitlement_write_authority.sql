-- REVIEW REQUIRED: do not apply with a bulk db push.
-- Keep RLS ownership policies; narrow direct client writes to profile fields.
-- Trusted service-role writes and existing SECURITY DEFINER RPCs retain their
-- existing authority. No profile values, plans, balances or sessions are changed.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE oid = 'public.profiles'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'profiles must have RLS enabled before narrowing column grants';
  END IF;
END $$;

REVOKE INSERT, UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  column_name text;
  writable text;
BEGIN
  -- Table revocation alone does not remove pre-existing column grants.
  FOR column_name IN
    SELECT attname FROM pg_attribute
    WHERE attrelid = 'public.profiles'::regclass AND attnum > 0 AND NOT attisdropped
  LOOP
    EXECUTE format(
      'REVOKE INSERT (%1$I), UPDATE (%1$I) ON public.profiles FROM PUBLIC, anon, authenticated',
      column_name
    );
  END LOOP;

  -- Future columns stay server-owned unless explicitly reviewed here.
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO writable
  FROM pg_attribute
  WHERE attrelid = 'public.profiles'::regclass AND attnum > 0 AND NOT attisdropped
    AND attname = ANY (ARRAY[
      'id', 'email', 'user_name', 'full_name', 'username', 'bio', 'website',
      'location', 'avatar_url', 'avatar_id'
    ]);
  IF writable IS NULL THEN
    RAISE EXCEPTION 'No supported profile columns found';
  END IF;
  EXECUTE format('GRANT INSERT (%1$s), UPDATE (%1$s) ON public.profiles TO authenticated', writable);
END $$;

COMMIT;
