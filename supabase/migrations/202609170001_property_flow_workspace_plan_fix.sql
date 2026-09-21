begin;

-- The product/tier belongs in metadata and entitlements, not organizations.plan.
-- Preserve the installed function's signature, security settings and all other logic.
do $$
declare
  current_definition text;
  corrected_definition text;
begin
  select pg_get_functiondef('public.provision_property_flow_workspace(uuid,uuid,text,text,text)'::regprocedure)
    into current_definition;
  corrected_definition := replace(
    current_definition,
    E'p_user_id,\n          ''property-flow'',\n          ''active'',',
    E'p_user_id,\n          ''free'',\n          ''active'','
  );
  if corrected_definition = current_definition then
    if position(E'p_user_id,\n          ''free'',\n          ''active'',' in current_definition) = 0 then
      raise exception 'Unexpected PropertyFlow workspace definition; no changes made';
    end if;
  else
    execute corrected_definition;
  end if;
end $$;

commit;
