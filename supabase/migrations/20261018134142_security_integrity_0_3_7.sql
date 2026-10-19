-- Private 0.3.7 integrity and privacy hardening. Additive, no clinical rows deleted.
begin;

-- RLS continues to authorize every parent/child write. One call is one transaction.
create or replace function public.save_client_overview(p_client_id uuid, p_expected_updated_at timestamptz, p_client jsonb, p_children jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare current_client public.clients; next_client public.clients; saved public.clients;
begin
  if auth.uid() is null or not hpc_private.is_hpc_profile_member() then raise exception 'Sign in with an active account.' using errcode='42501'; end if;
  if jsonb_typeof(p_client) is distinct from 'object' or jsonb_typeof(p_children) is distinct from 'array' or jsonb_array_length(p_children)>100 then raise exception 'Invalid client payload.'; end if;
  if exists(select 1 from jsonb_object_keys(p_client) k where k <> all(array['intake_source','intake_source_other','client_name','age','sex','dob','complete_address','mobile_number','email','sibling_order','sexual_orientation','sexual_orientation_other','marital_status','marital_status_other','educational_attainment','employment_status','employment_status_other','occupation','employer_school','employer_school_address','partner_name','partner_age','partner_dob','partner_sexual_orientation','partner_sexual_orientation_other','years_together','partner_educational_attainment','partner_employment_status','partner_employment_status_other','partner_occupation','partner_employer_school','partner_employer_school_address','pre_existing_psychiatric_diagnosis','pre_existing_psychiatric_diagnosis_details','counselling_reasons','counselling_reason_text','emergency_contact_person','emergency_contact_relationship','emergency_contact_address','emergency_contact_number','intake_date','client_status','category_path','hpc_representative','hpc_representative_other','time_started','time_ended'])) then raise exception 'Unsupported client field.'; end if;
  select * into current_client from public.clients where id=p_client_id for update;
  if not found then raise exception 'Client unavailable or access denied.' using errcode='42501'; end if;
  if p_expected_updated_at is null or current_client.updated_at is distinct from p_expected_updated_at then raise exception 'This client changed. Reload the record before saving.' using errcode='40001'; end if;
  next_client:=jsonb_populate_record(current_client,p_client);
  update public.clients set intake_source=next_client.intake_source,
    intake_source_other=next_client.intake_source_other,
    client_name=next_client.client_name,
    age=next_client.age,
    sex=next_client.sex,
    dob=next_client.dob,
    complete_address=next_client.complete_address,
    mobile_number=next_client.mobile_number,
    email=next_client.email,
    sibling_order=next_client.sibling_order,
    sexual_orientation=next_client.sexual_orientation,
    sexual_orientation_other=next_client.sexual_orientation_other,
    marital_status=next_client.marital_status,
    marital_status_other=next_client.marital_status_other,
    educational_attainment=next_client.educational_attainment,
    employment_status=next_client.employment_status,
    employment_status_other=next_client.employment_status_other,
    occupation=next_client.occupation,
    employer_school=next_client.employer_school,
    employer_school_address=next_client.employer_school_address,
    partner_name=next_client.partner_name,
    partner_age=next_client.partner_age,
    partner_dob=next_client.partner_dob,
    partner_sexual_orientation=next_client.partner_sexual_orientation,
    partner_sexual_orientation_other=next_client.partner_sexual_orientation_other,
    years_together=next_client.years_together,
    partner_educational_attainment=next_client.partner_educational_attainment,
    partner_employment_status=next_client.partner_employment_status,
    partner_employment_status_other=next_client.partner_employment_status_other,
    partner_occupation=next_client.partner_occupation,
    partner_employer_school=next_client.partner_employer_school,
    partner_employer_school_address=next_client.partner_employer_school_address,
    pre_existing_psychiatric_diagnosis=next_client.pre_existing_psychiatric_diagnosis,
    pre_existing_psychiatric_diagnosis_details=next_client.pre_existing_psychiatric_diagnosis_details,
    counselling_reasons=next_client.counselling_reasons,
    counselling_reason_text=next_client.counselling_reason_text,
    emergency_contact_person=next_client.emergency_contact_person,
    emergency_contact_relationship=next_client.emergency_contact_relationship,
    emergency_contact_address=next_client.emergency_contact_address,
    emergency_contact_number=next_client.emergency_contact_number,
    intake_date=next_client.intake_date,
    client_status=next_client.client_status,
    category_path=next_client.category_path,
    hpc_representative=next_client.hpc_representative,
    hpc_representative_other=next_client.hpc_representative_other,
    time_started=next_client.time_started,
    time_ended=next_client.time_ended where id=p_client_id returning * into saved;
  if not found then raise exception 'Client update was not authorized.' using errcode='42501'; end if;
  delete from public.client_children where client_id=p_client_id;
  insert into public.client_children(client_id,child_name,child_age,child_birth_date,child_sex,child_sex_other)
    select p_client_id,coalesce(nullif(child_name,''),'Unnamed Child'),child_age,child_birth_date,child_sex,child_sex_other
    from jsonb_to_recordset(p_children) as child(child_name text,child_age integer,child_birth_date date,child_sex text,child_sex_other text);
  perform public.log_audit_event('Clients','Updated Overview','client',p_client_id::text,null,jsonb_build_object('summary','Updated client overview and child records atomically.'));
  return jsonb_build_object('id',saved.id,'updated_at',saved.updated_at);
end $$;
revoke all on function public.save_client_overview(uuid,timestamptz,jsonb,jsonb) from public,anon;
grant execute on function public.save_client_overview(uuid,timestamptz,jsonb,jsonb) to authenticated;

-- All tables are read in this ONE SELECT, using one MVCC statement snapshot.
-- No REST row paging/cap can truncate individual table arrays inside the object.
create or replace function public.hpc_export_backup() returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare result jsonb;
begin
  if auth.uid() is null or not hpc_private.hpc_current_profile_has_role(array['admin','staff','ceo']) then raise exception 'Only active Admin or Staff may export backups.' using errcode='42501'; end if;
  select jsonb_build_object('profiles',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.profiles r),
    'clinic_settings',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.clinic_settings r),
    'appointment_services',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.appointment_services r),
    'clinic_hours',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.clinic_hours r),
    'clients',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.clients r),
    'care_team_availability',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.care_team_availability r),
    'care_team_availability_overrides',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.care_team_availability_overrides r),
    'appointments',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.appointments r),
    'appointment_status_events',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.appointment_status_events r),
    'client_4ps',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.client_4ps r),
    'client_categories',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.client_categories r),
    'client_children',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.client_children r),
    'progress_notes',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.progress_notes r),
    'client_documents',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.client_documents r),
    'client_assessments',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.client_assessments r),
    'client_cssrs',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.client_cssrs r),
    'dashboard_announcements',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.dashboard_announcements r)) into result;
  if octet_length(result::text)>16*1024*1024 then raise exception 'Backup exceeds the in-app limit. Use the protected operational backup process.'; end if;
  perform public.log_audit_event('Settings','Backup Snapshot Prepared','backup',null,null,jsonb_build_object('tables',17,'encrypted_output_required',true));
  return result;
end $$;
revoke all on function public.hpc_export_backup() from public,anon;
grant execute on function public.hpc_export_backup() to authenticated;

-- Summary projections preserve completion checks without transferring narratives
-- or free-text clinical formulations into Dashboard / Analytics caches.
create or replace view public.hpc_analytics_4ps with (security_invoker=true) as
select client_id,created_at,updated_at,
  case when nullif(btrim(predisposing_biological),'') is null then '' else 'present' end as predisposing_biological,
  case when nullif(btrim(predisposing_psychological),'') is null then '' else 'present' end as predisposing_psychological,
  case when nullif(btrim(predisposing_social),'') is null then '' else 'present' end as predisposing_social,
  case when nullif(btrim(precipitating_biological),'') is null then '' else 'present' end as precipitating_biological,
  case when nullif(btrim(precipitating_psychological),'') is null then '' else 'present' end as precipitating_psychological,
  case when nullif(btrim(precipitating_social),'') is null then '' else 'present' end as precipitating_social,
  case when nullif(btrim(perpetuating_biological),'') is null then '' else 'present' end as perpetuating_biological,
  case when nullif(btrim(perpetuating_psychological),'') is null then '' else 'present' end as perpetuating_psychological,
  case when nullif(btrim(perpetuating_social),'') is null then '' else 'present' end as perpetuating_social,
  case when nullif(btrim(protective_biological),'') is null then '' else 'present' end as protective_biological,
  case when nullif(btrim(protective_psychological),'') is null then '' else 'present' end as protective_psychological,
  case when nullif(btrim(protective_social),'') is null then '' else 'present' end as protective_social,
  case when nullif(btrim(narrative_report),'') is null then '' else 'present' end as narrative_report
from public.client_4ps;
create or replace view public.hpc_analytics_cssrs with (security_invoker=true) as
select client_id,positive_severity,behavior,ideation_answers,demeanor_selections,updated_at,
  coalesce((select jsonb_object_agg(key,case when nullif(btrim(value),'') is null then '' else 'present' end) from jsonb_each_text(protective_factor_texts)),'{}'::jsonb) as protective_factor_texts
from public.client_cssrs;
revoke all on public.hpc_analytics_4ps,public.hpc_analytics_cssrs from public,anon;
grant select on public.hpc_analytics_4ps,public.hpc_analytics_cssrs to authenticated;

-- Called only by verified Edge services. Lock actor AND target in stable order,
-- recheck current authority, mutate and audit in the same transaction.
create or replace function public.hpc_manage_team_service(p_actor_id uuid,p_target_id uuid,p_action text,p_role text default null,p_representative text default null,p_full_name text default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare actor public.profiles; target public.profiles; previous public.profiles; actor_role text; target_role text; next_role text;
begin
  if p_actor_id is null or p_target_id is null or p_actor_id=p_target_id then raise exception 'Cannot change your own account here.' using errcode='42501'; end if;
  perform id from public.profiles where id in(p_actor_id,p_target_id) order by id for update;
  select * into actor from public.profiles where id=p_actor_id;
  select * into target from public.profiles where id=p_target_id;
  if target.id is null then raise exception 'Care team member was not found.'; end if;
  actor_role:=public.hpc_normalized_role(actor.role); target_role:=public.hpc_normalized_role(target.role); next_role:=public.hpc_normalized_role(p_role);
  if actor.is_active is distinct from true or actor_role not in('admin','ceo','staff') then raise exception 'Your current account cannot manage care team members.' using errcode='42501'; end if;
  if p_action not in('role','deactivate','invite') then raise exception 'Unsupported care team action.'; end if;
  if actor_role='staff' and (target_role in('admin','ceo') or next_role in('admin','ceo')) then raise exception 'Staff cannot affect Admin accounts.' using errcode='42501'; end if;
  if p_action<>'invite' and target.is_active is distinct from true then raise exception 'The target account is inactive.'; end if;
  if p_action='invite' and target.is_active then raise exception 'The invited account is already active.'; end if;
  if p_action<>'deactivate' and next_role not in('admin','staff','psychologist / counselor') then raise exception 'Unsupported role.'; end if;
  if p_action<>'deactivate' and next_role in('admin','psychologist / counselor') and nullif(btrim(p_representative),'') is null then raise exception 'Representative assignment is required.'; end if;
  previous:=target;
  update public.profiles set
    role=case when p_action='deactivate' then role else p_role end,
    hpc_representative_name=case when p_action='deactivate' then hpc_representative_name when next_role in('admin','psychologist / counselor') then nullif(btrim(p_representative),'') else null end,
    full_name=case when p_action='invite' then coalesce(nullif(btrim(p_full_name),''),full_name) else full_name end,
    is_active=(p_action<>'deactivate') where id=p_target_id returning * into target;
  insert into public.audit_logs(actor_user_id,actor_email,actor_name,module,action,target_type,target_id,target_label,details)
    values(actor.id,actor.email,actor.full_name,'Care Team',case p_action when 'deactivate' then 'Deactivated Member Account' when 'invite' then 'Invited Member Account' else 'Role Updated' end,'profile',target.id::text,null,
      jsonb_build_object('previous_role',previous.role,'next_role',target.role,'target_is_active',target.is_active,'source','edge_function','account_data_retained',true));
  return to_jsonb(target);
end $$;
revoke all on function public.hpc_manage_team_service(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.hpc_manage_team_service(uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.hpc_normalized_role(text) to service_role;

-- Uploaded bytes remain quarantined until a service validates content. Client
-- writes cannot forge proof or overwrite an already verified object's bytes.
create schema if not exists hpc_private;
revoke all on schema hpc_private from public;
create table if not exists hpc_private.verified_uploads(object_id uuid primary key references storage.objects(id) on delete cascade,object_updated_at timestamptz not null,sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),verified_at timestamptz not null default now());
alter table hpc_private.verified_uploads enable row level security;
revoke all on hpc_private.verified_uploads from public,anon,authenticated;
grant usage on schema hpc_private to service_role;
grant select,insert,update on hpc_private.verified_uploads to service_role;
create or replace function hpc_private.upload_is_verified(p_id uuid,p_updated_at timestamptz) returns boolean
language sql stable security definer set search_path=pg_catalog,hpc_private,pg_temp as $$
 select exists(select 1 from hpc_private.verified_uploads where object_id=p_id and object_updated_at=p_updated_at);
$$;
revoke all on function hpc_private.upload_is_verified(uuid,timestamptz) from public;
grant usage on schema hpc_private to authenticated,anon;
grant execute on function hpc_private.upload_is_verified(uuid,timestamptz) to authenticated,anon;
create or replace function public.hpc_verify_upload_service(p_bucket text,p_path text,p_sha256 text,p_object_id uuid,p_updated_at timestamptz) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare object_row storage.objects;
begin
  if p_bucket not in('client-documents','client-assessments','profile-pictures') then raise exception 'Unsupported bucket.'; end if;
  select * into object_row from storage.objects where bucket_id=p_bucket and name=p_path for share;
  if not found or object_row.id is distinct from p_object_id or object_row.updated_at is distinct from p_updated_at then raise exception 'Uploaded object changed during validation.'; end if;
  insert into hpc_private.verified_uploads(object_id,object_updated_at,sha256) values(object_row.id,object_row.updated_at,p_sha256)
    on conflict(object_id) do update set object_updated_at=excluded.object_updated_at,sha256=excluded.sha256,verified_at=now();
end $$;
revoke all on function public.hpc_verify_upload_service(text,text,text,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.hpc_verify_upload_service(text,text,text,uuid,timestamptz) to service_role;
drop policy if exists "Require verified clinical upload content" on storage.objects;
create policy "Require verified clinical upload content" on storage.objects as restrictive for select to authenticated
 using(bucket_id not in('client-documents','client-assessments','profile-pictures') or hpc_private.upload_is_verified(id,updated_at));
drop policy if exists "Prevent clinical upload byte replacement" on storage.objects;
create policy "Prevent clinical upload byte replacement" on storage.objects as restrictive for update to authenticated
 using(bucket_id not in('client-documents','client-assessments','profile-pictures'))
 with check(bucket_id not in('client-documents','client-assessments','profile-pictures'));

create or replace view public.hpc_analytics_clients with (security_invoker=true) as
select id,client_name,age,sex,intake_source,sibling_order,sexual_orientation,marital_status,educational_attainment,employment_status,occupation,partner_age,partner_sexual_orientation,years_together,partner_educational_attainment,partner_employment_status,
 case when nullif(btrim(coalesce(pre_existing_psychiatric_diagnosis,'')),'') is null then null when lower(btrim(pre_existing_psychiatric_diagnosis)) in('no','n','false','none','n/a','na','not applicable','no diagnosis indicated') then 'No' else 'Yes' end as pre_existing_psychiatric_diagnosis,
 hpc_representative,intake_date,client_status,category_path,created_at,updated_at,counselling_reasons from public.clients;
revoke all on public.hpc_analytics_clients from public,anon;
grant select on public.hpc_analytics_clients to authenticated;

create or replace function public.hpc_save_clinic_hours(p_hours jsonb) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare day record;
begin
 if auth.uid() is null or not hpc_private.hpc_current_profile_has_role(array['admin','ceo']) then raise exception 'Not authorized to edit clinic hours.' using errcode='42501'; end if;
 if jsonb_typeof(p_hours) is distinct from 'array' or jsonb_array_length(p_hours)<>7 then raise exception 'Supply all seven clinic weekdays.'; end if;
 if (select count(distinct weekday) from jsonb_to_recordset(p_hours) x(weekday integer) where weekday between 0 and 6)<>7 then raise exception 'Weekdays must be unique values from 0 through 6.'; end if;
 for day in select * from jsonb_to_recordset(p_hours) as x(weekday integer,is_open boolean,opens_at time,closes_at time) loop
   update public.clinic_hours set is_open=day.is_open, opens_at=case when day.is_open then day.opens_at else null end, closes_at=case when day.is_open then day.closes_at else null end where weekday=day.weekday;
   if not found then raise exception 'Clinic day was not updated. Reload the schedule.'; end if;
 end loop;
 perform public.log_audit_event('Calendar','Updated Clinic Hours','clinic_hours',null,null,jsonb_build_object('weekdays',7));
end $$;
revoke all on function public.hpc_save_clinic_hours(jsonb) from public,anon;
grant execute on function public.hpc_save_clinic_hours(jsonb) to authenticated;

commit;
