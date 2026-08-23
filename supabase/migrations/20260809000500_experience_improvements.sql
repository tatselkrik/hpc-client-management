-- Staging experience improvements: editable clinic contact details, release checks,
-- and an Admin-only merge restore path for app-generated JSON backups.

create table if not exists public.clinic_settings (
  id smallint primary key default 1 check (id = 1),
  mobile_number text not null default '',
  landline_number text not null default '',
  email text not null default '',
  address text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinic_settings_email_format_check
    check (email = '' or email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint clinic_settings_mobile_length_check check (char_length(mobile_number) <= 80),
  constraint clinic_settings_landline_length_check check (char_length(landline_number) <= 80),
  constraint clinic_settings_email_length_check check (char_length(email) <= 254),
  constraint clinic_settings_address_length_check check (char_length(address) <= 500)
);

insert into public.clinic_settings (
  id,
  mobile_number,
  landline_number,
  email,
  address
)
values (
  1,
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

alter table public.clinic_settings enable row level security;

drop policy if exists "hpc active members read clinic settings" on public.clinic_settings;
create policy "hpc active members read clinic settings"
  on public.clinic_settings
  for select
  to authenticated
  using (public.is_hpc_profile_member());

drop policy if exists "hpc admin staff insert clinic settings" on public.clinic_settings;
create policy "hpc admin staff insert clinic settings"
  on public.clinic_settings
  for insert
  to authenticated
  with check (
    id = 1
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and public.hpc_current_profile_has_role(array['admin', 'staff'])
  );

drop policy if exists "hpc admin staff update clinic settings" on public.clinic_settings;
create policy "hpc admin staff update clinic settings"
  on public.clinic_settings
  for update
  to authenticated
  using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and public.hpc_current_profile_has_role(array['admin', 'staff'])
  )
  with check (
    id = 1
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and public.hpc_current_profile_has_role(array['admin', 'staff'])
  );

grant select, insert, update on public.clinic_settings to authenticated;
grant select, insert, update on public.clinic_settings to service_role;

create table if not exists public.app_releases (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'stable' check (channel in ('stable', 'staging')),
  version text not null,
  release_notes text not null default '',
  download_url text,
  published_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint app_releases_version_format_check
    check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$'),
  constraint app_releases_channel_version_unique unique (channel, version)
);

create index if not exists app_releases_current_idx
  on public.app_releases (channel, is_active, published_at desc);

alter table public.app_releases enable row level security;
revoke all on public.app_releases from public, anon, authenticated;
grant select, insert, update, delete on public.app_releases to service_role;

insert into public.app_releases (channel, version, release_notes, is_active)
values
  ('staging', '0.1.0', 'Current staging release.', true),
  ('stable', '0.1.0', 'Current stable release.', true)
on conflict (channel, version) do nothing;

create or replace function public.hpc_restore_backup_service(
  p_backup jsonb,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  table_item record;
  table_rows jsonb;
  column_list text;
  update_list text;
  statement_text text;
  affected_count integer;
  restored_counts jsonb := '{}'::jsonb;
  backup_format integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Restore service is not available to this session.';
  end if;

  if p_backup is null or jsonb_typeof(p_backup) <> 'object' then
    raise exception 'The restore package is not a JSON object.';
  end if;

  backup_format := coalesce((p_backup ->> 'format_version')::integer, 0);
  if backup_format <> 2 then
    raise exception 'Unsupported backup format version.';
  end if;

  if jsonb_typeof(p_backup -> 'tables') <> 'object' then
    raise exception 'The restore package does not contain a tables object.';
  end if;

  -- Merge-only restore: matching primary keys are updated and missing records are
  -- inserted. Records absent from the package are never deleted. Profiles are
  -- intentionally excluded because Auth identities must be managed by Supabase Auth.
  for table_item in
    select *
    from (values
      (1, 'client_categories'::text, 'id'::text),
      (2, 'clinic_settings'::text, 'id'::text),
      (3, 'clients'::text, 'id'::text),
      (4, 'client_children'::text, 'id'::text),
      (5, 'client_4ps'::text, 'id'::text),
      (6, 'client_cssrs'::text, 'client_id'::text),
      (7, 'progress_notes'::text, 'id'::text),
      (8, 'client_documents'::text, 'id'::text),
      (9, 'client_assessments'::text, 'id'::text),
      (10, 'dashboard_announcements'::text, 'id'::text)
    ) as restore_tables(sort_order, table_name, conflict_column)
    order by sort_order
  loop
    table_rows := coalesce(p_backup -> 'tables' -> table_item.table_name, '[]'::jsonb);

    if jsonb_typeof(table_rows) <> 'array' then
      raise exception 'Backup table % must be an array.', table_item.table_name;
    end if;

    if jsonb_array_length(table_rows) = 0 then
      restored_counts := restored_counts || jsonb_build_object(table_item.table_name, 0);
      continue;
    end if;

    select
      string_agg(format('%I', attribute.attname), ', ' order by attribute.attnum),
      string_agg(
        format('%I = excluded.%I', attribute.attname, attribute.attname),
        ', ' order by attribute.attnum
      ) filter (where attribute.attname <> table_item.conflict_column)
    into column_list, update_list
    from pg_attribute as attribute
    where attribute.attrelid = format('public.%I', table_item.table_name)::regclass
      and attribute.attnum > 0
      and not attribute.attisdropped
      and attribute.attgenerated = '';

    statement_text := format(
      'insert into public.%I (%s) '
      || 'select %s from jsonb_populate_recordset(null::public.%I, $1) '
      || 'on conflict (%I) do update set %s',
      table_item.table_name,
      column_list,
      column_list,
      table_item.table_name,
      table_item.conflict_column,
      update_list
    );

    execute statement_text using table_rows;
    get diagnostics affected_count = row_count;
    restored_counts := restored_counts || jsonb_build_object(table_item.table_name, affected_count);
  end loop;

  insert into public.audit_logs (
    actor_user_id,
    module,
    action,
    target_type,
    target_label,
    details
  )
  values (
    p_actor_user_id,
    'Settings',
    'Restored Clinic Backup',
    'backup',
    coalesce(p_backup ->> 'export_id', p_backup ->> 'exported_at', 'Clinic backup'),
    jsonb_build_object(
      'restore_mode', 'merge',
      'format_version', backup_format,
      'source_project_ref', p_backup ->> 'source_project_ref',
      'restored_counts', restored_counts,
      'profiles_restored', false,
      'storage_files_restored', false
    )
  );

  return jsonb_build_object(
    'ok', true,
    'mode', 'merge',
    'restored_counts', restored_counts,
    'profiles_restored', false,
    'storage_files_restored', false
  );
end;
$function$;

revoke all on function public.hpc_restore_backup_service(jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.hpc_restore_backup_service(jsonb, uuid)
  to service_role;
