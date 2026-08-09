-- Staff may create and maintain client overview records, but clinical writing and
-- deletion of uploaded paperwork remain limited to Admin and Psychologist/Counselor.
-- New and changed client assignments must reference an active clinical representative.

create or replace function public.hpc_is_assignable_representative(
  representative_name text
)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.is_active = true
      and public.hpc_normalized_role(p.role) in (
        'admin',
        'psychologist / counselor'
      )
      and nullif(trim(coalesce(p.hpc_representative_name, '')), '') is not null
      and lower(trim(p.hpc_representative_name)) =
          lower(trim(coalesce(representative_name, '')))
  );
$function$;

create or replace function public.hpc_profile_can_create_client(
  representative_name text
)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    public.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor',
      'staff'
    ])
    and public.hpc_is_assignable_representative(representative_name)
    and (
      public.hpc_current_profile_has_role(array['admin', 'staff'])
      or public.can_access_client_by_representative(representative_name)
    );
$function$;

create or replace function public.hpc_profile_can_delete_client(
  representative_name text
)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    public.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor'
    ])
    and public.can_access_client_by_representative(representative_name);
$function$;

create or replace function public.hpc_profile_can_write_client_clinical_records(
  target_client_id uuid
)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor'
    ])
    and public.can_access_client(target_client_id);
$function$;

create or replace function public.hpc_profile_can_write_client_cssrs_interview(
  target_client_id uuid
)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_profile_can_write_client_clinical_records(target_client_id);
$function$;

create or replace function public.hpc_profile_can_write_client_cssrs_protective_factors(
  target_client_id uuid
)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_profile_can_write_client_clinical_records(target_client_id);
$function$;

create or replace function public.hpc_profile_can_manage_client_documents(
  target_client_id uuid
)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor',
      'staff'
    ])
    and public.can_access_client(target_client_id);
$function$;

create or replace function public.hpc_profile_can_manage_client_assessments(
  target_client_id uuid
)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor',
      'staff'
    ])
    and public.can_access_client(target_client_id);
$function$;

create or replace function public.hpc_profile_can_delete_client_documents(
  target_client_id uuid
)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor'
    ])
    and public.can_access_client(target_client_id);
$function$;

create or replace function public.hpc_profile_can_delete_client_assessments(
  target_client_id uuid
)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.hpc_current_profile_has_role(array[
      'admin',
      'psychologist / counselor'
    ])
    and public.can_access_client(target_client_id);
$function$;

create or replace function public.hpc_enforce_assignable_client_representative()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.hpc_representative is distinct from old.hpc_representative
     and not public.hpc_is_assignable_representative(new.hpc_representative) then
    raise exception 'HPC Representative must belong to an active Admin or Psychologist / Counselor.';
  end if;

  return new;
end;
$function$;

drop trigger if exists hpc_clients_require_assignable_representative on public.clients;
create trigger hpc_clients_require_assignable_representative
before update of hpc_representative on public.clients
for each row
execute function public.hpc_enforce_assignable_client_representative();

drop policy if exists "hpc clients insert accessible" on public.clients;
create policy "hpc clients insert accessible"
  on public.clients
  as permissive
  for insert
  to authenticated
  with check (
    public.hpc_profile_can_create_client(hpc_representative)
    and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "hpc clients delete accessible" on public.clients;
create policy "hpc clients delete accessible"
  on public.clients
  as permissive
  for delete
  to authenticated
  using (public.hpc_profile_can_delete_client(hpc_representative));

drop policy if exists "hpc client documents insert permitted" on public.client_documents;
create policy "hpc client documents insert permitted"
  on public.client_documents
  as permissive
  for insert
  to authenticated
  with check (
    public.hpc_profile_can_manage_client_documents(client_id)
    and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "hpc client assessments insert permitted" on public.client_assessments;
create policy "hpc client assessments insert permitted"
  on public.client_assessments
  as permissive
  for insert
  to authenticated
  with check (
    public.hpc_profile_can_manage_client_assessments(client_id)
    and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "hpc client documents delete permitted" on public.client_documents;
create policy "hpc client documents delete permitted"
  on public.client_documents
  as permissive
  for delete
  to authenticated
  using (public.hpc_profile_can_delete_client_documents(client_id));

drop policy if exists "hpc client assessments delete permitted" on public.client_assessments;
create policy "hpc client assessments delete permitted"
  on public.client_assessments
  as permissive
  for delete
  to authenticated
  using (public.hpc_profile_can_delete_client_assessments(client_id));

drop policy if exists "hpc client documents storage delete" on storage.objects;
create policy "hpc client documents storage delete"
  on storage.objects
  as permissive
  for delete
  to authenticated
  using (
    bucket_id = 'client-documents'
    and public.hpc_profile_can_delete_client_documents(
      public.hpc_storage_client_id_from_path(name)
    )
  );

drop policy if exists "hpc client assessments storage delete" on storage.objects;
create policy "hpc client assessments storage delete"
  on storage.objects
  as permissive
  for delete
  to authenticated
  using (
    bucket_id = 'client-assessments'
    and public.hpc_profile_can_delete_client_assessments(
      public.hpc_storage_client_id_from_path(name)
    )
  );

-- File records can be renamed, but their ownership and storage metadata are immutable
-- through the client API. Storage object access remains protected by its own RLS policies.
revoke update on table public.client_documents from authenticated;
grant update (document_name) on table public.client_documents to authenticated;

revoke update on table public.client_assessments from authenticated;
grant update (assessment_name) on table public.client_assessments to authenticated;

revoke execute on function public.hpc_is_assignable_representative(text)
  from public, anon;
revoke execute on function public.hpc_profile_can_create_client(text)
  from public, anon;
revoke execute on function public.hpc_profile_can_delete_client(text)
  from public, anon;
revoke execute on function public.hpc_profile_can_delete_client_documents(uuid)
  from public, anon;
revoke execute on function public.hpc_profile_can_delete_client_assessments(uuid)
  from public, anon;
revoke execute on function public.hpc_enforce_assignable_client_representative()
  from public, anon, authenticated;

grant execute on function public.hpc_is_assignable_representative(text)
  to authenticated;
grant execute on function public.hpc_profile_can_create_client(text)
  to authenticated;
grant execute on function public.hpc_profile_can_delete_client(text)
  to authenticated;
grant execute on function public.hpc_profile_can_delete_client_documents(uuid)
  to authenticated;
grant execute on function public.hpc_profile_can_delete_client_assessments(uuid)
  to authenticated;
