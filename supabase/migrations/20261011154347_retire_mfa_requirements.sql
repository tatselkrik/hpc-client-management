-- Password authentication for every role. Keep the legacy helper signature so
-- existing restrictive policies/RPCs remain compatible; do not relax role or
-- ownership policies. Auth factor cleanup is an explicitly approved deployment
-- operation, not an automatic/destructive schema migration.
create or replace function public.hpc_has_required_aal()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $function$
  select (select auth.uid()) is not null
    and coalesce((select auth.jwt()) ->> 'role', '') = 'authenticated'
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
    and coalesce((select auth.jwt()) ->> 'aal', '') in ('aal1', 'aal2');
$function$;

revoke all on function public.hpc_has_required_aal() from public, anon;
grant execute on function public.hpc_has_required_aal() to authenticated;

drop policy if exists "hpc admin staff insert clinic settings" on public.clinic_settings;
create policy "hpc admin staff insert clinic settings"
  on public.clinic_settings for insert to authenticated
  with check (
    id = 1
    and (select public.hpc_has_required_aal())
    and (select hpc_private.hpc_current_profile_has_role(array['admin', 'staff']))
  );

drop policy if exists "hpc admin staff update clinic settings" on public.clinic_settings;
create policy "hpc admin staff update clinic settings"
  on public.clinic_settings for update to authenticated
  using (
    (select public.hpc_has_required_aal())
    and (select hpc_private.hpc_current_profile_has_role(array['admin', 'staff']))
  )
  with check (
    id = 1
    and (select public.hpc_has_required_aal())
    and (select hpc_private.hpc_current_profile_has_role(array['admin', 'staff']))
  );

-- Preserve hardened function bodies and grants; replace only obsolete errors.
do $migration$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.hpc_enforce_appointment_write_rules()'::regprocedure);
  execute replace(definition,
    'Appointment changes require a verified MFA session.',
    'Appointment changes require an authenticated account.');
  definition := pg_get_functiondef('public.hpc_begin_appointment_intake(uuid)'::regprocedure);
  execute replace(definition,
    'Only MFA-verified Admin and Staff accounts can begin intake.',
    'Only signed-in Admin and Staff accounts can begin intake.');
end;
$migration$;
