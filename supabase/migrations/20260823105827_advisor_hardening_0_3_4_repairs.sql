-- Use the advisor's exact initPlan form: cache auth.jwt() first, then inspect
-- the returned claim. This is semantically equivalent to the 0.3.4 policy but
-- is also recognized by the current Performance Advisor parser.

drop policy if exists "hpc admin staff insert clinic settings"
  on public.clinic_settings;
create policy "hpc admin staff insert clinic settings"
  on public.clinic_settings for insert to authenticated
  with check (
    id = 1
    and ((select auth.jwt()) ->> 'aal') = 'aal2'
    and (select hpc_private.hpc_current_profile_has_role(array['admin', 'staff']))
  );

drop policy if exists "hpc admin staff update clinic settings"
  on public.clinic_settings;
create policy "hpc admin staff update clinic settings"
  on public.clinic_settings for update to authenticated
  using (
    ((select auth.jwt()) ->> 'aal') = 'aal2'
    and (select hpc_private.hpc_current_profile_has_role(array['admin', 'staff']))
  )
  with check (
    id = 1
    and ((select auth.jwt()) ->> 'aal') = 'aal2'
    and (select hpc_private.hpc_current_profile_has_role(array['admin', 'staff']))
  );
