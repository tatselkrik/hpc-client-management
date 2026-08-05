-- HPC Client Management canonical Supabase migration
-- Generated from live Supabase CSV exports supplied on 2026-05-04.
-- Intended for a NEW/FRESH Supabase project. Do not run blindly against the current live project.

-- Row Level Security enablement and policies captured from live project.

set search_path to public, storage, extensions;

alter table public.analytics_presentation_exports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.client_4ps enable row level security;
alter table public.client_assessments enable row level security;
alter table public.client_categories enable row level security;
alter table public.client_children enable row level security;
alter table public.client_cssrs enable row level security;
alter table public.client_documents enable row level security;
alter table public.clients enable row level security;
alter table public.dashboard_announcements enable row level security;
alter table public.mobile_upload_sessions enable row level security;
alter table public.profiles enable row level security;
alter table public.progress_notes enable row level security;
-- alter table storage.objects enable row level security;

drop policy if exists "hpc profiles select active members" on public.profiles;
create policy "hpc profiles select active members"
  on public.profiles
  as permissive
  for SELECT
  to authenticated
  using (is_hpc_profile_member());

drop policy if exists "hpc profiles update own display fields" on public.profiles;
create policy "hpc profiles update own display fields"
  on public.profiles
  as permissive
  for UPDATE
  to authenticated
  using (((id = auth.uid()) AND (is_active = true)))
  with check (((id = auth.uid()) AND (is_active = true)));

drop policy if exists "hpc clients analytics raw select bridge" on public.clients;
create policy "hpc clients analytics raw select bridge"
  on public.clients
  as permissive
  for SELECT
  to authenticated
  using (hpc_profile_can_view_all_representative_analytics());

drop policy if exists "hpc clients delete accessible" on public.clients;
create policy "hpc clients delete accessible"
  on public.clients
  as permissive
  for DELETE
  to authenticated
  using (can_access_client_by_representative(hpc_representative));

drop policy if exists "hpc clients insert accessible" on public.clients;
create policy "hpc clients insert accessible"
  on public.clients
  as permissive
  for INSERT
  to authenticated
  with check (can_access_client_by_representative(hpc_representative));

drop policy if exists "hpc clients select accessible" on public.clients;
create policy "hpc clients select accessible"
  on public.clients
  as permissive
  for SELECT
  to authenticated
  using (can_access_client_by_representative(hpc_representative));

drop policy if exists "hpc clients update accessible" on public.clients;
create policy "hpc clients update accessible"
  on public.clients
  as permissive
  for UPDATE
  to authenticated
  using (can_access_client_by_representative(hpc_representative))
  with check (can_access_client_by_representative(hpc_representative));

drop policy if exists "hpc client children analytics raw select bridge" on public.client_children;
create policy "hpc client children analytics raw select bridge"
  on public.client_children
  as permissive
  for SELECT
  to authenticated
  using (hpc_profile_can_view_all_representative_analytics());

drop policy if exists "hpc client children delete accessible" on public.client_children;
create policy "hpc client children delete accessible"
  on public.client_children
  as permissive
  for DELETE
  to authenticated
  using (can_access_client(client_id));

drop policy if exists "hpc client children insert accessible" on public.client_children;
create policy "hpc client children insert accessible"
  on public.client_children
  as permissive
  for INSERT
  to authenticated
  with check (can_access_client(client_id));

drop policy if exists "hpc client children select accessible" on public.client_children;
create policy "hpc client children select accessible"
  on public.client_children
  as permissive
  for SELECT
  to authenticated
  using (can_access_client(client_id));

drop policy if exists "hpc client children update accessible" on public.client_children;
create policy "hpc client children update accessible"
  on public.client_children
  as permissive
  for UPDATE
  to authenticated
  using (can_access_client(client_id))
  with check (can_access_client(client_id));

drop policy if exists "hpc client 4ps analytics raw select bridge" on public.client_4ps;
create policy "hpc client 4ps analytics raw select bridge"
  on public.client_4ps
  as permissive
  for SELECT
  to authenticated
  using (hpc_profile_can_view_all_representative_analytics());

drop policy if exists "hpc client 4ps delete clinical" on public.client_4ps;
create policy "hpc client 4ps delete clinical"
  on public.client_4ps
  as permissive
  for DELETE
  to authenticated
  using (hpc_profile_can_write_client_clinical_records(client_id));

drop policy if exists "hpc client 4ps insert clinical" on public.client_4ps;
create policy "hpc client 4ps insert clinical"
  on public.client_4ps
  as permissive
  for INSERT
  to authenticated
  with check (hpc_profile_can_write_client_clinical_records(client_id));

drop policy if exists "hpc client 4ps select accessible" on public.client_4ps;
create policy "hpc client 4ps select accessible"
  on public.client_4ps
  as permissive
  for SELECT
  to authenticated
  using (can_access_client(client_id));

drop policy if exists "hpc client 4ps update clinical" on public.client_4ps;
create policy "hpc client 4ps update clinical"
  on public.client_4ps
  as permissive
  for UPDATE
  to authenticated
  using (hpc_profile_can_write_client_clinical_records(client_id))
  with check (hpc_profile_can_write_client_clinical_records(client_id));

drop policy if exists "hpc client cssrs analytics raw select bridge" on public.client_cssrs;
create policy "hpc client cssrs analytics raw select bridge"
  on public.client_cssrs
  as permissive
  for SELECT
  to authenticated
  using (hpc_profile_can_view_all_representative_analytics());

drop policy if exists "hpc client cssrs delete clinical" on public.client_cssrs;
create policy "hpc client cssrs delete clinical"
  on public.client_cssrs
  as permissive
  for DELETE
  to authenticated
  using (hpc_profile_can_write_client_clinical_records(client_id));

drop policy if exists "hpc client cssrs insert interview" on public.client_cssrs;
create policy "hpc client cssrs insert interview"
  on public.client_cssrs
  as permissive
  for INSERT
  to authenticated
  with check ((hpc_profile_can_write_client_cssrs_interview(client_id) AND ((created_by IS NULL) OR (created_by = auth.uid()))));

drop policy if exists "hpc client cssrs select accessible" on public.client_cssrs;
create policy "hpc client cssrs select accessible"
  on public.client_cssrs
  as permissive
  for SELECT
  to authenticated
  using (can_access_client(client_id));

drop policy if exists "hpc client cssrs update interview" on public.client_cssrs;
create policy "hpc client cssrs update interview"
  on public.client_cssrs
  as permissive
  for UPDATE
  to authenticated
  using (hpc_profile_can_write_client_cssrs_interview(client_id))
  with check ((hpc_profile_can_write_client_cssrs_interview(client_id) AND ((created_by IS NULL) OR (created_by = auth.uid()))));

drop policy if exists "hpc progress notes analytics raw select bridge" on public.progress_notes;
create policy "hpc progress notes analytics raw select bridge"
  on public.progress_notes
  as permissive
  for SELECT
  to authenticated
  using (hpc_profile_can_view_all_representative_analytics());

drop policy if exists "hpc progress notes delete clinical" on public.progress_notes;
create policy "hpc progress notes delete clinical"
  on public.progress_notes
  as permissive
  for DELETE
  to authenticated
  using (hpc_profile_can_write_client_clinical_records(client_id));

drop policy if exists "hpc progress notes insert clinical" on public.progress_notes;
create policy "hpc progress notes insert clinical"
  on public.progress_notes
  as permissive
  for INSERT
  to authenticated
  with check (hpc_profile_can_write_client_clinical_records(client_id));

drop policy if exists "hpc progress notes select accessible" on public.progress_notes;
create policy "hpc progress notes select accessible"
  on public.progress_notes
  as permissive
  for SELECT
  to authenticated
  using (can_access_client(client_id));

drop policy if exists "hpc progress notes update clinical" on public.progress_notes;
create policy "hpc progress notes update clinical"
  on public.progress_notes
  as permissive
  for UPDATE
  to authenticated
  using (hpc_profile_can_write_client_clinical_records(client_id))
  with check (hpc_profile_can_write_client_clinical_records(client_id));

drop policy if exists "hpc client documents analytics raw select bridge" on public.client_documents;
create policy "hpc client documents analytics raw select bridge"
  on public.client_documents
  as permissive
  for SELECT
  to authenticated
  using (hpc_profile_can_view_all_representative_analytics());

drop policy if exists "hpc client documents delete permitted" on public.client_documents;
create policy "hpc client documents delete permitted"
  on public.client_documents
  as permissive
  for DELETE
  to authenticated
  using (hpc_profile_can_manage_client_documents(client_id));

drop policy if exists "hpc client documents insert permitted" on public.client_documents;
create policy "hpc client documents insert permitted"
  on public.client_documents
  as permissive
  for INSERT
  to authenticated
  with check (hpc_profile_can_manage_client_documents(client_id));

drop policy if exists "hpc client documents select accessible" on public.client_documents;
create policy "hpc client documents select accessible"
  on public.client_documents
  as permissive
  for SELECT
  to authenticated
  using (can_access_client(client_id));

drop policy if exists "hpc client documents update permitted" on public.client_documents;
create policy "hpc client documents update permitted"
  on public.client_documents
  as permissive
  for UPDATE
  to authenticated
  using (hpc_profile_can_manage_client_documents(client_id))
  with check (hpc_profile_can_manage_client_documents(client_id));

drop policy if exists "hpc client assessments analytics raw select bridge" on public.client_assessments;
create policy "hpc client assessments analytics raw select bridge"
  on public.client_assessments
  as permissive
  for SELECT
  to authenticated
  using (hpc_profile_can_view_all_representative_analytics());

drop policy if exists "hpc client assessments delete permitted" on public.client_assessments;
create policy "hpc client assessments delete permitted"
  on public.client_assessments
  as permissive
  for DELETE
  to authenticated
  using (hpc_profile_can_manage_client_assessments(client_id));

drop policy if exists "hpc client assessments insert permitted" on public.client_assessments;
create policy "hpc client assessments insert permitted"
  on public.client_assessments
  as permissive
  for INSERT
  to authenticated
  with check (hpc_profile_can_manage_client_assessments(client_id));

drop policy if exists "hpc client assessments select accessible" on public.client_assessments;
create policy "hpc client assessments select accessible"
  on public.client_assessments
  as permissive
  for SELECT
  to authenticated
  using (can_access_client(client_id));

drop policy if exists "hpc client assessments update permitted" on public.client_assessments;
create policy "hpc client assessments update permitted"
  on public.client_assessments
  as permissive
  for UPDATE
  to authenticated
  using (hpc_profile_can_manage_client_assessments(client_id))
  with check (hpc_profile_can_manage_client_assessments(client_id));

drop policy if exists "Active HPC staff can read client categories" on public.client_categories;
create policy "Active HPC staff can read client categories"
  on public.client_categories
  as permissive
  for SELECT
  to authenticated
  using (is_active_staff());

drop policy if exists "hpc client categories delete admins" on public.client_categories;
create policy "hpc client categories delete admins"
  on public.client_categories
  as permissive
  for DELETE
  to authenticated
  using (is_admin_profile());

drop policy if exists "hpc client categories insert admins" on public.client_categories;
create policy "hpc client categories insert admins"
  on public.client_categories
  as permissive
  for INSERT
  to authenticated
  with check (is_admin_profile());

drop policy if exists "hpc client categories select members" on public.client_categories;
create policy "hpc client categories select members"
  on public.client_categories
  as permissive
  for SELECT
  to authenticated
  using (is_hpc_profile_member());

drop policy if exists "hpc client categories update admins" on public.client_categories;
create policy "hpc client categories update admins"
  on public.client_categories
  as permissive
  for UPDATE
  to authenticated
  using (is_admin_profile())
  with check (is_admin_profile());

drop policy if exists "hpc dashboard announcements delete publishers" on public.dashboard_announcements;
create policy "hpc dashboard announcements delete publishers"
  on public.dashboard_announcements
  as permissive
  for DELETE
  to authenticated
  using (can_manage_dashboard_announcements());

drop policy if exists "hpc dashboard announcements insert publishers" on public.dashboard_announcements;
create policy "hpc dashboard announcements insert publishers"
  on public.dashboard_announcements
  as permissive
  for INSERT
  to authenticated
  with check (can_manage_dashboard_announcements());

drop policy if exists "hpc dashboard announcements select active members" on public.dashboard_announcements;
create policy "hpc dashboard announcements select active members"
  on public.dashboard_announcements
  as permissive
  for SELECT
  to authenticated
  using (is_hpc_profile_member());

drop policy if exists "hpc dashboard announcements update publishers" on public.dashboard_announcements;
create policy "hpc dashboard announcements update publishers"
  on public.dashboard_announcements
  as permissive
  for UPDATE
  to authenticated
  using (can_manage_dashboard_announcements())
  with check (can_manage_dashboard_announcements());

drop policy if exists "hpc audit logs insert active members" on public.audit_logs;
create policy "hpc audit logs insert active members"
  on public.audit_logs
  as permissive
  for INSERT
  to authenticated
  with check (is_hpc_profile_member());

drop policy if exists "hpc audit logs select admins" on public.audit_logs;
create policy "hpc audit logs select admins"
  on public.audit_logs
  as permissive
  for SELECT
  to authenticated
  using (is_admin_profile());

drop policy if exists "hpc mobile upload sessions analytics raw select bridge" on public.mobile_upload_sessions;
create policy "hpc mobile upload sessions analytics raw select bridge"
  on public.mobile_upload_sessions
  as permissive
  for SELECT
  to authenticated
  using (hpc_profile_can_view_all_representative_analytics());

drop policy if exists "hpc mobile upload sessions insert own permitted target" on public.mobile_upload_sessions;
create policy "hpc mobile upload sessions insert own permitted target"
  on public.mobile_upload_sessions
  as permissive
  for INSERT
  to authenticated
  with check (((created_by = auth.uid()) AND hpc_profile_can_manage_mobile_upload_session(client_id, target_type)));

drop policy if exists "hpc mobile upload sessions select own accessible" on public.mobile_upload_sessions;
create policy "hpc mobile upload sessions select own accessible"
  on public.mobile_upload_sessions
  as permissive
  for SELECT
  to authenticated
  using (((created_by = auth.uid()) AND can_access_client(client_id)));

drop policy if exists "hpc mobile upload sessions update own permitted target" on public.mobile_upload_sessions;
create policy "hpc mobile upload sessions update own permitted target"
  on public.mobile_upload_sessions
  as permissive
  for UPDATE
  to authenticated
  using (((created_by = auth.uid()) AND hpc_profile_can_manage_mobile_upload_session(client_id, target_type)))
  with check (((created_by = auth.uid()) AND hpc_profile_can_manage_mobile_upload_session(client_id, target_type)));

drop policy if exists "hpc analytics presentation exports insert active members" on public.analytics_presentation_exports;
create policy "hpc analytics presentation exports insert active members"
  on public.analytics_presentation_exports
  as permissive
  for INSERT
  to authenticated
  with check (is_hpc_profile_member());

drop policy if exists "hpc analytics presentation exports select admins" on public.analytics_presentation_exports;
create policy "hpc analytics presentation exports select admins"
  on public.analytics_presentation_exports
  as permissive
  for SELECT
  to authenticated
  using (is_admin_profile());

drop policy if exists "hpc client assessments storage delete" on storage.objects;
create policy "hpc client assessments storage delete"
  on storage.objects
  as permissive
  for DELETE
  to authenticated
  using (((bucket_id = 'client-assessments'::text) AND hpc_profile_can_manage_client_assessments(hpc_storage_client_id_from_path(name))));

drop policy if exists "hpc client assessments storage read" on storage.objects;
create policy "hpc client assessments storage read"
  on storage.objects
  as permissive
  for SELECT
  to authenticated
  using (((bucket_id = 'client-assessments'::text) AND can_access_client(hpc_storage_client_id_from_path(name))));

drop policy if exists "hpc client assessments storage update" on storage.objects;
create policy "hpc client assessments storage update"
  on storage.objects
  as permissive
  for UPDATE
  to authenticated
  using (((bucket_id = 'client-assessments'::text) AND hpc_profile_can_manage_client_assessments(hpc_storage_client_id_from_path(name))))
  with check (((bucket_id = 'client-assessments'::text) AND hpc_profile_can_manage_client_assessments(hpc_storage_client_id_from_path(name))));

drop policy if exists "hpc client assessments storage upload" on storage.objects;
create policy "hpc client assessments storage upload"
  on storage.objects
  as permissive
  for INSERT
  to authenticated
  with check (((bucket_id = 'client-assessments'::text) AND hpc_profile_can_manage_client_assessments(hpc_storage_client_id_from_path(name))));

drop policy if exists "hpc client documents storage delete" on storage.objects;
create policy "hpc client documents storage delete"
  on storage.objects
  as permissive
  for DELETE
  to authenticated
  using (((bucket_id = 'client-documents'::text) AND hpc_profile_can_manage_client_documents(hpc_storage_client_id_from_path(name))));

drop policy if exists "hpc client documents storage read" on storage.objects;
create policy "hpc client documents storage read"
  on storage.objects
  as permissive
  for SELECT
  to authenticated
  using (((bucket_id = 'client-documents'::text) AND can_access_client(hpc_storage_client_id_from_path(name))));

drop policy if exists "hpc client documents storage update" on storage.objects;
create policy "hpc client documents storage update"
  on storage.objects
  as permissive
  for UPDATE
  to authenticated
  using (((bucket_id = 'client-documents'::text) AND hpc_profile_can_manage_client_documents(hpc_storage_client_id_from_path(name))))
  with check (((bucket_id = 'client-documents'::text) AND hpc_profile_can_manage_client_documents(hpc_storage_client_id_from_path(name))));

drop policy if exists "hpc client documents storage upload" on storage.objects;
create policy "hpc client documents storage upload"
  on storage.objects
  as permissive
  for INSERT
  to authenticated
  with check (((bucket_id = 'client-documents'::text) AND hpc_profile_can_manage_client_documents(hpc_storage_client_id_from_path(name))));

drop policy if exists "hpc profile pictures storage delete own folder" on storage.objects;
create policy "hpc profile pictures storage delete own folder"
  on storage.objects
  as permissive
  for DELETE
  to authenticated
  using (((bucket_id = 'profile-pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND is_hpc_profile_member()));

drop policy if exists "hpc profile pictures storage read active members" on storage.objects;
create policy "hpc profile pictures storage read active members"
  on storage.objects
  as permissive
  for SELECT
  to authenticated
  using (((bucket_id = 'profile-pictures'::text) AND is_hpc_profile_member()));

drop policy if exists "hpc profile pictures storage update own folder" on storage.objects;
create policy "hpc profile pictures storage update own folder"
  on storage.objects
  as permissive
  for UPDATE
  to authenticated
  using (((bucket_id = 'profile-pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND is_hpc_profile_member()))
  with check (((bucket_id = 'profile-pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND is_hpc_profile_member()));

drop policy if exists "hpc profile pictures storage upload own folder" on storage.objects;
create policy "hpc profile pictures storage upload own folder"
  on storage.objects
  as permissive
  for INSERT
  to authenticated
  with check (((bucket_id = 'profile-pictures'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND is_hpc_profile_member()));

reset search_path;
