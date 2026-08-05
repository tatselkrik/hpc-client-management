-- HPC Client Management canonical Supabase migration
-- Generated from live Supabase CSV exports supplied on 2026-05-04.
-- Intended for a NEW/FRESH Supabase project. Do not run blindly against the current live project.

-- Public triggers captured from live project.

drop trigger if exists set_client_4ps_updated_at on public.client_4ps;
create trigger set_client_4ps_updated_at
  BEFORE UPDATE on public.client_4ps
  for each row
  EXECUTE FUNCTION set_updated_at();

drop trigger if exists trg_client_assessments_updated_at on public.client_assessments;
create trigger trg_client_assessments_updated_at
  BEFORE UPDATE on public.client_assessments
  for each row
  EXECUTE FUNCTION set_updated_at();

drop trigger if exists touch_client_categories_updated_at on public.client_categories;
create trigger touch_client_categories_updated_at
  BEFORE UPDATE on public.client_categories
  for each row
  EXECUTE FUNCTION touch_client_categories_updated_at();

drop trigger if exists hpc_enforce_cssrs_protective_factor_permissions_trigger on public.client_cssrs;
create trigger hpc_enforce_cssrs_protective_factor_permissions_trigger
  BEFORE INSERT OR UPDATE on public.client_cssrs
  for each row
  EXECUTE FUNCTION hpc_enforce_cssrs_protective_factor_permissions();

drop trigger if exists set_client_cssrs_updated_at on public.client_cssrs;
create trigger set_client_cssrs_updated_at
  BEFORE UPDATE on public.client_cssrs
  for each row
  EXECUTE FUNCTION set_client_cssrs_updated_at();

drop trigger if exists trg_client_documents_updated_at on public.client_documents;
create trigger trg_client_documents_updated_at
  BEFORE UPDATE on public.client_documents
  for each row
  EXECUTE FUNCTION set_updated_at();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
  BEFORE UPDATE on public.clients
  for each row
  EXECUTE FUNCTION set_updated_at();

drop trigger if exists set_dashboard_announcements_updated_at on public.dashboard_announcements;
create trigger set_dashboard_announcements_updated_at
  BEFORE UPDATE on public.dashboard_announcements
  for each row
  EXECUTE FUNCTION set_dashboard_announcements_updated_at();

drop trigger if exists hpc_mobile_upload_sessions_set_updated_at on public.mobile_upload_sessions;
create trigger hpc_mobile_upload_sessions_set_updated_at
  BEFORE UPDATE on public.mobile_upload_sessions
  for each row
  EXECUTE FUNCTION hpc_set_updated_at();

drop trigger if exists prevent_client_profile_role_changes on public.profiles;
create trigger prevent_client_profile_role_changes
  BEFORE UPDATE on public.profiles
  for each row
  EXECUTE FUNCTION prevent_client_profile_role_changes();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  BEFORE UPDATE on public.profiles
  for each row
  EXECUTE FUNCTION set_updated_at();

drop trigger if exists trg_set_profiles_updated_at on public.profiles;
create trigger trg_set_profiles_updated_at
  BEFORE UPDATE on public.profiles
  for each row
  EXECUTE FUNCTION set_profiles_updated_at();

drop trigger if exists trg_touch_profile_avatar_updated_at on public.profiles;
create trigger trg_touch_profile_avatar_updated_at
  BEFORE UPDATE on public.profiles
  for each row
  EXECUTE FUNCTION touch_profile_avatar_updated_at();

drop trigger if exists trg_progress_notes_updated_at on public.progress_notes;
create trigger trg_progress_notes_updated_at
  BEFORE UPDATE on public.progress_notes
  for each row
  EXECUTE FUNCTION set_updated_at();

-- Auth triggers captured from live project verification.
-- These keep public.profiles synchronized with auth.users creation and email changes.

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  AFTER INSERT on auth.users
  for each row
  EXECUTE FUNCTION public.handle_new_user_profile();

drop trigger if exists hpc_sync_profile_email_after_auth_update on auth.users;
create trigger hpc_sync_profile_email_after_auth_update
  AFTER UPDATE on auth.users
  for each row
  EXECUTE FUNCTION public.hpc_sync_profile_email_from_auth();
