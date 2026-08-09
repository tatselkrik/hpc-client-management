-- Let an MFA-verified user read only their own profile row even after deactivation.
-- This does not restore membership: every roster and clinic-data policy still requires
-- an active profile. It only lets the application distinguish an inactive account from
-- a missing profile and immediately sign the user out with the correct message.

drop policy if exists "hpc profiles select own during mfa setup"
  on public.profiles;

create policy "hpc profiles select own during mfa setup"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    and (
      is_active = true
      or public.hpc_has_required_aal()
    )
  );
