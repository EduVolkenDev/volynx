-- REVIEW ONLY until coordinated deployment of the publisher integration.
BEGIN;
CREATE TABLE public.builder_publication_slots (
  project_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  held boolean NOT NULL,
  busy boolean NOT NULL,
  operation_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('publish','unpublish')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- No cascading FK: deleting a project must never free an object still in R2.
ALTER TABLE public.builder_publication_slots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.builder_publication_slots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.builder_publication_slots TO service_role;

CREATE FUNCTION public.begin_builder_publication(p_project_id uuid, p_user_id uuid, p_operation_id uuid, p_operation text)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE project public.projects%ROWTYPE; slot public.builder_publication_slots%ROWTYPE;
  capacity integer; occupied integer;
BEGIN
  IF p_operation NOT IN ('publish','unpublish') OR p_operation_id IS NULL THEN
    RETURN jsonb_build_object('error','invalid_operation');
  END IF;
  -- All admission/release transactions take the same owner lock first.
  PERFORM pg_advisory_xact_lock(hashtextextended('builder-publication:' || p_user_id::text,0));
  SELECT * INTO project FROM public.projects WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','project_not_found'); END IF;
  IF project.user_id IS DISTINCT FROM p_user_id THEN RETURN jsonb_build_object('error','forbidden'); END IF;
  IF project.deleted_at IS NOT NULL AND p_operation='publish' THEN RETURN jsonb_build_object('error','project_deleted'); END IF;
  IF project.slug IS NULL OR project.slug !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' THEN RETURN jsonb_build_object('error','missing_slug'); END IF;
  SELECT * INTO slot FROM public.builder_publication_slots WHERE project_id=p_project_id FOR UPDATE;
  IF FOUND AND slot.busy THEN RETURN jsonb_build_object('error','publication_busy'); END IF;
  IF slot.project_id IS NOT NULL AND (slot.user_id<>p_user_id OR slot.slug<>project.slug) THEN
    RETURN jsonb_build_object('error','publication_needs_review');
  END IF;
  IF EXISTS(SELECT 1 FROM public.builder_publication_slots WHERE slug=project.slug AND project_id<>p_project_id)
    OR EXISTS(SELECT 1 FROM public.projects WHERE slug=project.slug AND id<>p_project_id AND status='published') THEN
    RETURN jsonb_build_object('error','slug_in_use');
  END IF;
  IF p_operation='publish' THEN
    SELECT l.max_published INTO capacity FROM public.profiles p
      JOIN public.builder_plan_limits l ON l.plan=p.builder_plan WHERE p.id=p_user_id FOR SHARE OF p,l;
    IF capacity IS NULL THEN RETURN jsonb_build_object('error','plan_unavailable'); END IF;
    -- Include legacy published rows, soft-deleted rows and in-flight reservations.
    SELECT count(*) INTO occupied FROM (
      SELECT id FROM public.projects WHERE user_id=p_user_id AND status='published' AND id<>p_project_id
      UNION SELECT project_id FROM public.builder_publication_slots WHERE user_id=p_user_id AND held AND project_id<>p_project_id
    ) used;
    IF capacity<=0 OR occupied>=capacity THEN RETURN jsonb_build_object('error','publish_limit_reached'); END IF;
  END IF;
  INSERT INTO public.builder_publication_slots(project_id,user_id,slug,held,busy,operation_id,operation)
    VALUES(p_project_id,p_user_id,project.slug,p_operation='publish' OR project.status='published' OR coalesce(slot.held,false),true,p_operation_id,p_operation)
    ON CONFLICT(project_id) DO UPDATE SET held=excluded.held,busy=true,operation_id=excluded.operation_id,operation=excluded.operation,updated_at=now();
  RETURN jsonb_build_object('ok',true,'slug',project.slug,'builder_data',project.builder_data);
EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('error','slug_in_use');
END $$;

CREATE FUNCTION public.finish_builder_publication(p_project_id uuid,p_user_id uuid,p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE slot public.builder_publication_slots%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('builder-publication:' || p_user_id::text,0));
  SELECT * INTO slot FROM public.builder_publication_slots WHERE project_id=p_project_id FOR UPDATE;
  IF NOT FOUND OR slot.user_id<>p_user_id OR slot.operation_id<>p_operation_id THEN
    RETURN jsonb_build_object('error','publication_conflict');
  END IF;
  IF NOT slot.busy THEN RETURN jsonb_build_object('ok',true); END IF;
  UPDATE public.projects SET status=CASE WHEN slot.operation='publish' THEN 'published' ELSE 'draft' END,
    updated_at=now() WHERE id=p_project_id AND user_id=p_user_id AND slug=slot.slug;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','publication_needs_review'); END IF;
  IF slot.operation='unpublish' THEN
    -- Only called after R2 delete succeeds. Remove the slug claim as well.
    DELETE FROM public.builder_publication_slots WHERE project_id=p_project_id;
  ELSE
    UPDATE public.builder_publication_slots SET busy=false,held=true,updated_at=now() WHERE project_id=p_project_id;
  END IF;
  RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.begin_builder_publication(uuid,uuid,uuid,text),public.finish_builder_publication(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_builder_publication(uuid,uuid,uuid,text),public.finish_builder_publication(uuid,uuid,uuid) TO service_role;

CREATE FUNCTION public.guard_builder_publication_state() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE reserved boolean;
BEGIN
  -- PostgREST SET ROLE is independent of user-editable metadata.
  IF current_setting('role',true) NOT IN ('anon','authenticated') THEN
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'draft' THEN RAISE EXCEPTION 'Publication state is server-owned' USING ERRCODE='42501'; END IF;
    RETURN NEW;
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.builder_publication_slots WHERE project_id=OLD.id AND (held OR busy)) INTO reserved;
  IF TG_OP='DELETE' THEN
    IF OLD.status='published' OR reserved THEN RAISE EXCEPTION 'Unpublish before deleting this project' USING ERRCODE='42501'; END IF;
    RETURN OLD;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Publication identity/state is server-owned' USING ERRCODE='42501';
  END IF;
  IF (OLD.status='published' OR reserved) AND
    (NEW.slug IS DISTINCT FROM OLD.slug OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) THEN
    RAISE EXCEPTION 'Unpublish before changing the address or deleting this project' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_builder_publication_state() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_builder_publication_state BEFORE INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.guard_builder_publication_state();
COMMIT;
