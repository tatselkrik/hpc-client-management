-- The generic installation uses a fictional Admin representative. Replace this
-- value in a private deployment if the clinic uses a different naming policy.

alter table public.profiles
  disable trigger prevent_client_profile_role_changes;

update public.profiles
set hpc_representative_name = 'Clinic Administrator'
where public.hpc_normalized_role(role) = 'admin'
  and hpc_representative_name is distinct from 'Clinic Administrator';

alter table public.profiles
  enable trigger prevent_client_profile_role_changes;

create or replace function public.hpc_enforce_profile_representative_assignment()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if public.hpc_normalized_role(new.role) = 'admin' then
    new.hpc_representative_name := 'Clinic Administrator';
  elsif public.hpc_normalized_role(new.role) = 'staff' then
    new.hpc_representative_name := null;
  elsif new.is_active = true
        and public.hpc_normalized_role(new.role) = 'psychologist / counselor'
        and nullif(trim(coalesce(new.hpc_representative_name, '')), '') is null then
    raise exception 'An active Psychologist / Counselor requires an HPC Representative name.';
  end if;

  return new;
end;
$function$;

drop trigger if exists hpc_profiles_enforce_representative_assignment
  on public.profiles;
create trigger hpc_profiles_enforce_representative_assignment
before insert or update of role, hpc_representative_name, is_active
on public.profiles
for each row
execute function public.hpc_enforce_profile_representative_assignment();

revoke execute on function public.hpc_enforce_profile_representative_assignment()
  from public, anon, authenticated;
