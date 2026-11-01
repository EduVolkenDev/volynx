-- Run in a transaction after the migration. All fixtures are rolled back.
begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000101','world-rls-a@example.invalid'),
 ('00000000-0000-4000-8000-000000000102','world-rls-b@example.invalid');
insert into public.world_opportunities(id,title,company_name,description,category,kind,work_mode,location,eligibility,source_name,source_url,application_url,expires_at,status) values
 ('00000000-0000-4000-8000-000000000201','World public test','Test Company',repeat('Test description ',5),'design','freelance','remote','Worldwide','Worldwide, no restriction','Test source','https://example.invalid/source','https://example.invalid/apply',now()+interval '1 day','published'),
 ('00000000-0000-4000-8000-000000000202','World private test','Test Company',repeat('Test description ',5),'design','freelance','remote','Worldwide','Worldwide, no restriction','Test source','https://example.invalid/source','https://example.invalid/apply',now()+interval '1 day','draft');
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'Assertion failed: %', message; end if; end$$;
set local role anon;
select pg_temp.assert_true((select count(*)=1 from public.world_opportunities where id in ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000202')),'anon sees public but not draft');
select pg_temp.assert_true(not has_table_privilege('anon','public.world_opportunity_activity','select'),'anon cannot read activity');
select pg_temp.assert_true(not has_table_privilege('anon','public.world_opportunities','insert'),'anon cannot insert listings');
reset role;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}';
set local role authenticated;
insert into public.world_opportunity_activity(opportunity_id,notes) values('00000000-0000-4000-8000-000000000201','Private test note');
select pg_temp.assert_true((select count(*)=1 from public.world_opportunity_activity),'owner reads own activity');
do $$begin
 begin insert into public.world_opportunity_activity(opportunity_id) values('00000000-0000-4000-8000-000000000202');raise exception 'Draft save accepted';exception when insufficient_privilege then null;end;
 begin insert into public.world_opportunity_activity(user_id,opportunity_id) values('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000201');raise exception 'Owner spoof accepted';exception when insufficient_privilege then null;end;
 begin update public.world_opportunity_activity set user_id='00000000-0000-4000-8000-000000000102';raise exception 'Reassignment accepted';exception when insufficient_privilege then null;end;
end$$;
with changed as(update public.world_opportunities set title='Unauthorized change' where id='00000000-0000-4000-8000-000000000201' returning id) select pg_temp.assert_true((select count(*)=0 from changed),'member cannot edit listings');
reset role;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}';
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.world_opportunity_activity),'other user cannot read notes');
with changed as(delete from public.world_opportunity_activity returning opportunity_id) select pg_temp.assert_true((select count(*)=0 from changed),'other user cannot delete notes');
reset role;
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}';
set local role authenticated;
update public.world_opportunity_activity set stage='applied',notes='Updated private note';
select pg_temp.assert_true((select stage='applied' from public.world_opportunity_activity limit 1),'owner updates activity');
delete from public.world_opportunity_activity;
select pg_temp.assert_true((select count(*)=0 from public.world_opportunity_activity),'owner deletes activity');
reset role;
rollback;
