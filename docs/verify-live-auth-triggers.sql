-- Live auth.users database-trigger verification query.
-- This checks profile creation and email synchronization. It does not verify
-- a user's authenticator app or MFA enrollment.
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

-- Exact check for the two application-owned auth.users triggers.
with expected(trigger_name, event_manipulation, action_timing) as (
  values
    ('on_auth_user_created_profile', 'INSERT', 'AFTER'),
    ('hpc_sync_profile_email_after_auth_update', 'UPDATE', 'AFTER')
),
actual as (
  select trigger_name, event_manipulation, action_timing
  from information_schema.triggers
  where event_object_schema = 'auth'
    and event_object_table = 'users'
)
select
  expected.trigger_name,
  expected.event_manipulation,
  expected.action_timing,
  exists (
    select 1
    from actual
    where actual.trigger_name = expected.trigger_name
      and actual.event_manipulation = expected.event_manipulation
      and actual.action_timing = expected.action_timing
  ) as trigger_matches
from expected
order by expected.trigger_name;

-- Expected: two rows with trigger_matches = true.
