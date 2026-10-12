-- Deploy only AFTER MFA retirement is ready (database, functions, Auth settings,
-- and factor cleanup). Older backends without this capability retain MFA UI.
create or replace function public.hpc_authentication_policy()
returns text language sql stable security invoker
set search_path = pg_catalog
as $function$
  select 'password'::text;
$function$;
revoke all on function public.hpc_authentication_policy() from public, anon;
grant execute on function public.hpc_authentication_policy() to authenticated;
