-- Live auth.users trigger verification query.
-- Expected triggers in the current live project:
-- - on_auth_user_created_profile: AFTER INSERT on auth.users -> public.handle_new_user_profile()
-- - hpc_sync_profile_email_after_auth_update: AFTER UPDATE on auth.users -> public.hpc_sync_profile_email_from_auth()

select
  event_object_schema,
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'auth'
order by event_object_table, trigger_name, event_manipulation;
