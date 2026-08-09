-- Explicit least-privilege grants for the server-side Edge Functions.
-- New Supabase projects can disable automatic Data API exposure, so service_role
-- must receive only the table access used by these protected functions.

grant usage on schema public to service_role;

grant select, insert, update
  on table public.profiles
  to service_role;

grant insert
  on table public.audit_logs
  to service_role;

grant select
  on table public.clients
  to service_role;

grant select, update
  on table public.mobile_upload_sessions
  to service_role;

grant select, insert
  on table public.client_documents
  to service_role;

grant select, insert
  on table public.client_assessments
  to service_role;

