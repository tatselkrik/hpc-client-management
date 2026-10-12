-- Reinstating a cancelled/no-show appointment must revalidate today's clinic
-- hours, service and clinician availability even when its time is unchanged.
-- Preserve the current hardened function body and its execution grants.
do $migration$
declare
  definition text;
  old_guard text := E'if tg_op = ''UPDATE''\n     and new.provider_profile_id';
  new_guard text := E'if tg_op = ''UPDATE''\n     and old.status not in (''cancelled'', ''no_show'')\n     and old.removed_at is null\n     and new.provider_profile_id';
begin
  definition := pg_get_functiondef('public.hpc_validate_appointment_schedule()'::regprocedure);
  if position(old_guard in definition) = 0 then
    raise exception 'Unexpected appointment validation definition; review before migrating.';
  end if;
  execute replace(definition, old_guard, new_guard);
end;
$migration$;
