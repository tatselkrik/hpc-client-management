-- HPC Client Management canonical Supabase migration
-- Generated from live Supabase CSV exports supplied on 2026-05-04.
-- Intended for a NEW/FRESH Supabase project. Do not run blindly against the current live project.

-- Public helper/RPC/trigger functions captured from live project.
-- Tables are created first because several functions return public table row types.

-- Function: public.hpc_normalized_role
CREATE OR REPLACE FUNCTION public.hpc_normalized_role(role_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when lower(trim(coalesce(role_value, ''))) in (
      'psychologist / counsellor',
      'psychologist',
      'counselor',
      'counsellor'
    ) then 'psychologist / counselor'
    else lower(trim(coalesce(role_value, '')))
  end;
$function$;

-- Function: public.hpc_current_profile_role
CREATE OR REPLACE FUNCTION public.hpc_current_profile_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.hpc_normalized_role(p.role)
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1;
$function$;

-- Function: public.hpc_current_profile_representative
CREATE OR REPLACE FUNCTION public.hpc_current_profile_representative()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select nullif(trim(coalesce(p.hpc_representative_name, '')), '')
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1;
$function$;

-- Function: public.hpc_current_profile_has_role
CREATE OR REPLACE FUNCTION public.hpc_current_profile_has_role(allowed_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(public.hpc_current_profile_role() = any(allowed_roles), false);
$function$;

-- Function: public.is_hpc_profile_member
CREATE OR REPLACE FUNCTION public.is_hpc_profile_member()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
  );
$function$;

-- Function: public.is_active_staff
CREATE OR REPLACE FUNCTION public.is_active_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.hpc_current_profile_has_role(array[
    'admin',
    'ceo',
    'psychologist / counselor',
    'staff',
    'intern'
  ]);
$function$;

-- Function: public.is_admin_profile
CREATE OR REPLACE FUNCTION public.is_admin_profile()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.hpc_current_profile_has_role(array['admin', 'ceo']);
$function$;

-- Function: public.current_user_is_active_admin
CREATE OR REPLACE FUNCTION public.current_user_is_active_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.is_admin_profile();
$function$;

-- Function: public.hpc_profile_can_view_all_clients
CREATE OR REPLACE FUNCTION public.hpc_profile_can_view_all_clients()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.hpc_current_profile_has_role(array['admin', 'staff', 'intern']);
$function$;

-- Function: public.can_access_client_by_representative
CREATE OR REPLACE FUNCTION public.can_access_client_by_representative(client_hpc_representative text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.hpc_profile_can_view_all_clients()
    or (
      public.hpc_current_profile_has_role(array['ceo', 'psychologist / counselor'])
      and public.hpc_current_profile_representative() is not null
      and lower(trim(coalesce(client_hpc_representative, ''))) =
          lower(trim(coalesce(public.hpc_current_profile_representative(), '')))
    );
$function$;

-- Function: public.can_access_client
CREATE OR REPLACE FUNCTION public.can_access_client(target_client_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.clients c
    where c.id = target_client_id
      and public.can_access_client_by_representative(c.hpc_representative)
  );
$function$;

-- Function: public.hpc_storage_client_id_from_path
CREATE OR REPLACE FUNCTION public.hpc_storage_client_id_from_path(object_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  first_segment text;
begin
  first_segment := split_part(coalesce(object_name, ''), '/', 1);

  if first_segment = '' then
    return null;
  end if;

  return first_segment::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$function$;

-- Function: public.can_access_client_storage_object
CREATE OR REPLACE FUNCTION public.can_access_client_storage_object(object_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.can_access_client(public.hpc_storage_client_id_from_path(object_name));
$function$;

-- Function: public.can_manage_dashboard_announcements
CREATE OR REPLACE FUNCTION public.can_manage_dashboard_announcements()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.hpc_current_profile_has_role(array['admin', 'ceo', 'staff']);
$function$;

-- Function: public.hpc_profile_can_view_all_representative_analytics
CREATE OR REPLACE FUNCTION public.hpc_profile_can_view_all_representative_analytics()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Temporary compatibility helper for the current direct-Supabase Analytics UI.
  -- See 2026-05-03_03_temporary_analytics_raw_select_bridge.sql.
  select public.hpc_current_profile_has_role(array[
    'admin',
    'ceo',
    'psychologist / counselor',
    'staff',
    'intern'
  ]);
$function$;

-- Function: public.hpc_profile_can_write_client_clinical_records
CREATE OR REPLACE FUNCTION public.hpc_profile_can_write_client_clinical_records(target_client_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.hpc_current_profile_has_role(array[
      'admin',
      'ceo',
      'psychologist / counselor'
    ])
    and public.can_access_client(target_client_id);
$function$;

-- Function: public.hpc_profile_can_write_client_cssrs_interview
CREATE OR REPLACE FUNCTION public.hpc_profile_can_write_client_cssrs_interview(target_client_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.hpc_current_profile_has_role(array[
      'admin',
      'ceo',
      'psychologist / counselor',
      'staff',
      'intern'
    ])
    and public.can_access_client(target_client_id);
$function$;

-- Function: public.hpc_profile_can_write_client_cssrs_protective_factors
CREATE OR REPLACE FUNCTION public.hpc_profile_can_write_client_cssrs_protective_factors(target_client_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.hpc_profile_can_write_client_clinical_records(target_client_id);
$function$;

-- Function: public.hpc_profile_can_manage_client_documents
CREATE OR REPLACE FUNCTION public.hpc_profile_can_manage_client_documents(target_client_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.hpc_current_profile_has_role(array[
      'admin',
      'ceo',
      'psychologist / counselor',
      'staff'
    ])
    and public.can_access_client(target_client_id);
$function$;

-- Function: public.hpc_profile_can_manage_client_assessments
CREATE OR REPLACE FUNCTION public.hpc_profile_can_manage_client_assessments(target_client_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.hpc_current_profile_has_role(array[
      'admin',
      'ceo',
      'psychologist / counselor',
      'staff'
    ])
    and public.can_access_client(target_client_id);
$function$;

-- Function: public.hpc_profile_can_manage_mobile_upload_session
CREATE OR REPLACE FUNCTION public.hpc_profile_can_manage_mobile_upload_session(target_client_id uuid, target_upload_type text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case lower(trim(coalesce(target_upload_type, '')))
    when 'document' then public.hpc_profile_can_manage_client_documents(target_client_id)
    when 'assessment' then public.hpc_profile_can_manage_client_assessments(target_client_id)
    else false
  end;
$function$;

-- Function: public.hpc_compact_nonblank_jsonb_text_values
CREATE OR REPLACE FUNCTION public.hpc_compact_nonblank_jsonb_text_values(value jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(
    jsonb_object_agg(item.key, item.item_value order by item.key),
    '{}'::jsonb
  )
  from jsonb_each_text(coalesce(value, '{}'::jsonb)) as item(key, item_value)
  where nullif(trim(coalesce(item.item_value, '')), '') is not null;
$function$;

-- Function: public.hpc_jsonb_text_values_are_blank
CREATE OR REPLACE FUNCTION public.hpc_jsonb_text_values_are_blank(value jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select public.hpc_compact_nonblank_jsonb_text_values(value) = '{}'::jsonb;
$function$;

-- Function: public.hpc_enforce_cssrs_protective_factor_permissions
CREATE OR REPLACE FUNCTION public.hpc_enforce_cssrs_protective_factor_permissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if public.hpc_profile_can_write_client_cssrs_protective_factors(new.client_id) then
    return new;
  end if;

  if public.hpc_profile_can_write_client_cssrs_interview(new.client_id) then
    if tg_op = 'INSERT' then
      if public.hpc_jsonb_text_values_are_blank(new.protective_factor_texts) then
        return new;
      end if;
    elsif tg_op = 'UPDATE' then
      if public.hpc_compact_nonblank_jsonb_text_values(new.protective_factor_texts) =
         public.hpc_compact_nonblank_jsonb_text_values(old.protective_factor_texts) then
        return new;
      end if;
    end if;
  end if;

  raise exception 'Only Admin, CEO, and Psychologist / Counselor roles can edit C-SSRS Protective Factor entries.';
end;
$function$;

-- Function: public.hpc_set_updated_at
CREATE OR REPLACE FUNCTION public.hpc_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Function: public.set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Function: public.set_client_cssrs_updated_at
CREATE OR REPLACE FUNCTION public.set_client_cssrs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$function$;

-- Function: public.set_dashboard_announcements_updated_at
CREATE OR REPLACE FUNCTION public.set_dashboard_announcements_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$function$;

-- Function: public.set_profiles_updated_at
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

-- Function: public.touch_client_categories_updated_at
CREATE OR REPLACE FUNCTION public.touch_client_categories_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Function: public.touch_profile_avatar_updated_at
CREATE OR REPLACE FUNCTION public.touch_profile_avatar_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.avatar_path is distinct from old.avatar_path then
    new.avatar_updated_at := now();
  end if;
  return new;
end;
$function$;

-- Function: public.prevent_client_profile_role_changes
CREATE OR REPLACE FUNCTION public.prevent_client_profile_role_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.role is distinct from old.role
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and current_role <> 'service_role' then
    raise exception 'Care Team role changes must use the secure Edge Function.';
  end if;

  return new;
end;
$function$;

-- Function: public.hpc_sync_profile_email_from_auth
CREATE OR REPLACE FUNCTION public.hpc_sync_profile_email_from_auth()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email,
        updated_at = now()
    where id = new.id;
  end if;

  return new;
end;
$function$;

-- Function: public.handle_new_user_profile
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'Staff')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = case
      when excluded.full_name <> '' then excluded.full_name
      else profiles.full_name
    end,
    role = excluded.role;

  return new;
end;
$function$;

-- Function: public.log_audit_event
CREATE OR REPLACE FUNCTION public.log_audit_event(p_module text, p_action text, p_target_type text DEFAULT NULL::text, p_target_id text DEFAULT NULL::text, p_target_label text DEFAULT NULL::text, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS audit_logs
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_profile public.profiles%rowtype;
  v_row public.audit_logs;
begin
  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  insert into public.audit_logs (
    actor_user_id,
    actor_email,
    actor_name,
    module,
    action,
    target_type,
    target_id,
    target_label,
    details
  )
  values (
    auth.uid(),
    auth.jwt() ->> 'email',
    coalesce(v_profile.full_name, auth.jwt() ->> 'email'),
    p_module,
    p_action,
    p_target_type,
    p_target_id,
    p_target_label,
    coalesce(p_details, '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$function$;

-- Function: public.get_audit_logs_filtered
CREATE OR REPLACE FUNCTION public.get_audit_logs_filtered(p_range text DEFAULT 'all'::text)
 RETURNS SETOF audit_logs
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select *
  from public.audit_logs
  where (
    case lower(coalesce(p_range, 'all'))
      when 'today' then created_at >= date_trunc('day', now())
      when 'last_7_days' then created_at >= now() - interval '7 days'
      when 'month' then created_at >= date_trunc('month', now())
      else true
    end
  )
  order by created_at desc;
$function$;

-- Function: public.cleanup_audit_logs
CREATE OR REPLACE FUNCTION public.cleanup_audit_logs(p_keep_months integer DEFAULT 24)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_deleted integer;
begin
  delete from public.audit_logs
  where created_at < now() - make_interval(months => p_keep_months);

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

-- Function: public.admin_update_profile_role
CREATE OR REPLACE FUNCTION public.admin_update_profile_role(target_profile_id uuid, new_role text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  updated_profile public.profiles;
begin
  if not public.current_user_is_active_admin() then
    raise exception 'Only active admins can update profile roles';
  end if;

  update public.profiles
  set role = new_role
  where id = target_profile_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'No profile row was updated for id %', target_profile_id;
  end if;

  return updated_profile;
end;
$function$;

-- Function: public.admin_deactivate_profile
CREATE OR REPLACE FUNCTION public.admin_deactivate_profile(target_profile_id uuid)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  updated_profile public.profiles;
begin
  if not public.current_user_is_active_admin() then
    raise exception 'Only active admins can remove care team members';
  end if;

  if target_profile_id = auth.uid() then
    raise exception 'You cannot remove your own account';
  end if;

  update public.profiles
  set is_active = false
  where id = target_profile_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'No profile row was updated for id %', target_profile_id;
  end if;

  return updated_profile;
end;
$function$;

grant execute on all functions in schema public to authenticated;
