-- HPC Client Management canonical Supabase migration
-- Generated from live Supabase CSV exports supplied on 2026-05-04.
-- Intended for a NEW/FRESH Supabase project. Do not run blindly against the current live project.

-- App-required extension for gen_random_uuid().
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Optional/managed extensions observed in live project:
-- pg_stat_statements, uuid-ossp, pg_cron, supabase_vault.
-- Enable them through the Supabase Dashboard only if the target project needs them.

create table public.profiles (
  id uuid not null,
  full_name text,
  role text default 'staff'::text not null,
  created_at timestamp with time zone default now() not null,
  avatar_path text,
  avatar_updated_at timestamp with time zone,
  updated_at timestamp with time zone default now() not null,
  email text,
  hpc_representative_name text,
  is_active boolean default true not null
);

create table public.clients (
  id uuid default gen_random_uuid() not null,
  intake_source text,
  intake_source_other text,
  client_name text not null,
  age integer,
  sex text,
  dob date,
  complete_address text,
  mobile_number text,
  email text,
  sibling_order text,
  sexual_orientation text,
  marital_status text,
  educational_attainment text,
  employment_status text,
  occupation text,
  employer_school text,
  employer_school_address text,
  partner_name text,
  partner_age integer,
  partner_dob date,
  partner_sexual_orientation text,
  years_together integer,
  partner_educational_attainment text,
  partner_employment_status text,
  partner_occupation text,
  partner_employer_school text,
  partner_employer_school_address text,
  pre_existing_psychiatric_diagnosis text,
  counselling_reason_text text,
  emergency_contact_person text,
  emergency_contact_relationship text,
  emergency_contact_address text,
  emergency_contact_number text,
  intake_date date,
  hpc_representative text,
  time_started time without time zone,
  time_ended time without time zone,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  sexual_orientation_other text,
  marital_status_other text,
  employment_status_other text,
  partner_sexual_orientation_other text,
  partner_employment_status_other text,
  counselling_reasons text[],
  hpc_representative_other text,
  client_status text default 'Active'::text,
  category_path text,
  pre_existing_psychiatric_diagnosis_details text
);

create table public.client_children (
  id uuid default gen_random_uuid() not null,
  client_id uuid not null,
  child_name text not null,
  child_age integer,
  child_birth_date date,
  child_sex text,
  child_relationship text,
  created_at timestamp with time zone default now() not null,
  child_sex_other text
);

create table public.client_4ps (
  id uuid default gen_random_uuid() not null,
  client_id uuid not null,
  predisposing_biological text,
  predisposing_psychological text,
  predisposing_social text,
  precipitating_biological text,
  precipitating_psychological text,
  precipitating_social text,
  perpetuating_biological text,
  perpetuating_psychological text,
  perpetuating_social text,
  protective_biological text,
  protective_psychological text,
  protective_social text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  updated_by uuid,
  narrative_report text,
  narrative_generated_at timestamp with time zone,
  narrative_generated_by uuid,
  narrative_last_prompt_version text
);

create table public.client_cssrs (
  client_id uuid not null,
  ideation_answers jsonb default '{}'::jsonb not null,
  behavior jsonb default '{}'::jsonb not null,
  demeanor_selections jsonb default '{}'::jsonb not null,
  demeanor_other_texts jsonb default '{}'::jsonb not null,
  protective_factor_texts jsonb default '{}'::jsonb not null,
  positive_severity integer,
  created_by uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.progress_notes (
  id uuid default gen_random_uuid() not null,
  client_id uuid not null,
  session_label text,
  session_date date,
  note_content text not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.client_documents (
  id uuid default gen_random_uuid() not null,
  client_id uuid not null,
  document_name text not null,
  original_file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.client_assessments (
  id uuid default gen_random_uuid() not null,
  client_id uuid not null,
  assessment_name text not null,
  original_file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.client_categories (
  id uuid default gen_random_uuid() not null,
  name text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.dashboard_announcements (
  id uuid default gen_random_uuid() not null,
  message text not null,
  priority text default 'Info'::text not null,
  expiry_date date,
  show_until_dismissed boolean default false not null,
  is_active boolean default true not null,
  created_by uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.audit_logs (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  actor_user_id uuid,
  actor_email text,
  actor_name text,
  module text not null,
  action text not null,
  target_type text,
  target_id text,
  target_label text,
  details jsonb default '{}'::jsonb not null
);

create table public.mobile_upload_sessions (
  id uuid default gen_random_uuid() not null,
  token_hash text not null,
  client_id uuid not null,
  target_type text not null,
  created_by uuid,
  status text default 'pending'::text not null,
  expires_at timestamp with time zone not null,
  original_file_name text,
  uploaded_file_name text,
  mime_type text,
  file_size_bytes bigint,
  storage_bucket text,
  storage_path text,
  uploaded_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.analytics_presentation_exports (
  id uuid default gen_random_uuid() not null,
  exported_at timestamp with time zone default now() not null,
  exported_by_profile_id uuid,
  export_kind text default 'analytics_presentation'::text not null,
  file_name text not null,
  reporting_range_label text,
  section_snapshot jsonb default '{}'::jsonb not null
);

-- Constraints captured from live public schema.
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_email_format_check CHECK (email IS NULL OR email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'::text);
alter table public.profiles add constraint profiles_id_auth_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.clients add constraint clients_pkey PRIMARY KEY (id);
alter table public.clients add constraint clients_client_status_check CHECK (client_status = ANY (ARRAY['Active'::text, 'Terminated'::text]));
alter table public.clients add constraint clients_created_by_auth_users_id_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.clients add constraint clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.client_children add constraint client_children_pkey PRIMARY KEY (id);
alter table public.client_children add constraint client_children_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
alter table public.client_4ps add constraint client_4ps_pkey PRIMARY KEY (id);
alter table public.client_4ps add constraint client_4ps_client_id_key UNIQUE (client_id);
alter table public.client_4ps add constraint client_4ps_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
alter table public.client_4ps add constraint client_4ps_narrative_generated_by_fkey FOREIGN KEY (narrative_generated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.client_4ps add constraint client_4ps_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.client_cssrs add constraint client_cssrs_pkey PRIMARY KEY (client_id);
alter table public.client_cssrs add constraint client_cssrs_positive_severity_check CHECK (positive_severity >= 1 AND positive_severity <= 5);
alter table public.client_cssrs add constraint client_cssrs_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
alter table public.client_cssrs add constraint client_cssrs_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.progress_notes add constraint progress_notes_pkey PRIMARY KEY (id);
alter table public.progress_notes add constraint progress_notes_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
alter table public.progress_notes add constraint progress_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.client_documents add constraint client_documents_pkey PRIMARY KEY (id);
alter table public.client_documents add constraint client_documents_storage_path_key UNIQUE (storage_path);
alter table public.client_documents add constraint client_documents_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
alter table public.client_documents add constraint client_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.client_assessments add constraint client_assessments_pkey PRIMARY KEY (id);
alter table public.client_assessments add constraint client_assessments_storage_path_key UNIQUE (storage_path);
alter table public.client_assessments add constraint client_assessments_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
alter table public.client_assessments add constraint client_assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.client_categories add constraint client_categories_pkey PRIMARY KEY (id);
alter table public.client_categories add constraint client_categories_name_not_blank CHECK (length(TRIM(BOTH FROM name)) > 0);
alter table public.dashboard_announcements add constraint dashboard_announcements_pkey PRIMARY KEY (id);
alter table public.dashboard_announcements add constraint dashboard_announcements_message_check CHECK (length(btrim(message)) > 0);
alter table public.dashboard_announcements add constraint dashboard_announcements_priority_check CHECK (priority = ANY (ARRAY['Info'::text, 'Important'::text, 'Urgent'::text]));
alter table public.dashboard_announcements add constraint dashboard_announcements_created_by_auth_users_id_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.dashboard_announcements add constraint dashboard_announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.audit_logs add constraint audit_logs_pkey PRIMARY KEY (id);
alter table public.audit_logs add constraint audit_logs_actor_user_id_auth_users_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.audit_logs add constraint audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.mobile_upload_sessions add constraint mobile_upload_sessions_pkey PRIMARY KEY (id);
alter table public.mobile_upload_sessions add constraint mobile_upload_sessions_token_hash_key UNIQUE (token_hash);
alter table public.mobile_upload_sessions add constraint mobile_upload_sessions_status_check CHECK (status = ANY (ARRAY['pending'::text, 'uploaded'::text, 'completed'::text, 'expired'::text, 'cancelled'::text]));
alter table public.mobile_upload_sessions add constraint mobile_upload_sessions_target_type_check CHECK (target_type = ANY (ARRAY['document'::text, 'assessment'::text]));
alter table public.mobile_upload_sessions add constraint mobile_upload_sessions_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
alter table public.mobile_upload_sessions add constraint mobile_upload_sessions_created_by_auth_users_id_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.mobile_upload_sessions add constraint mobile_upload_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.analytics_presentation_exports add constraint analytics_presentation_exports_pkey PRIMARY KEY (id);
alter table public.analytics_presentation_exports add constraint analytics_presentation_exports_exported_by_profile_id_fkey FOREIGN KEY (exported_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Non-constraint indexes captured from live public schema.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique_idx ON public.profiles USING btree (lower(email)) WHERE (email IS NOT NULL);
CREATE INDEX IF NOT EXISTS profiles_hpc_representative_name_idx ON public.profiles USING btree (hpc_representative_name) WHERE (hpc_representative_name IS NOT NULL);
CREATE INDEX IF NOT EXISTS profiles_is_active_role_idx ON public.profiles USING btree (is_active, role);
CREATE INDEX IF NOT EXISTS clients_category_path_idx ON public.clients USING btree (category_path);
CREATE INDEX IF NOT EXISTS clients_client_status_idx ON public.clients USING btree (client_status);
CREATE INDEX IF NOT EXISTS idx_client_children_client_id ON public.client_children USING btree (client_id);
CREATE INDEX IF NOT EXISTS client_4ps_client_id_idx ON public.client_4ps USING btree (client_id);
CREATE INDEX IF NOT EXISTS client_cssrs_updated_at_idx ON public.client_cssrs USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_notes_client_id ON public.progress_notes USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON public.client_documents USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_client_assessments_client_id ON public.client_assessments USING btree (client_id);
CREATE UNIQUE INDEX IF NOT EXISTS client_categories_name_lower_unique ON public.client_categories USING btree (lower(TRIM(BOTH FROM name)));
CREATE INDEX IF NOT EXISTS dashboard_announcements_active_updated_idx ON public.dashboard_announcements USING btree (is_active, updated_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs USING btree (action);
CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx ON public.audit_logs USING btree (actor_user_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_module_idx ON public.audit_logs USING btree (module);
CREATE INDEX IF NOT EXISTS audit_logs_target_id_idx ON public.audit_logs USING btree (target_id);
CREATE INDEX IF NOT EXISTS audit_logs_target_type_idx ON public.audit_logs USING btree (target_type);
CREATE INDEX IF NOT EXISTS mobile_upload_sessions_client_id_idx ON public.mobile_upload_sessions USING btree (client_id);
CREATE INDEX IF NOT EXISTS mobile_upload_sessions_expires_at_idx ON public.mobile_upload_sessions USING btree (expires_at);
CREATE INDEX IF NOT EXISTS mobile_upload_sessions_status_idx ON public.mobile_upload_sessions USING btree (status);
CREATE INDEX IF NOT EXISTS analytics_presentation_exports_exported_at_idx ON public.analytics_presentation_exports USING btree (exported_at DESC);
CREATE INDEX IF NOT EXISTS analytics_presentation_exports_exported_by_profile_id_idx ON public.analytics_presentation_exports USING btree (exported_by_profile_id);

-- Standard grants for authenticated app users. RLS remains the security boundary.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
