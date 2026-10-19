begin;

-- Storage's listing API serializes updated_at through a JavaScript Date,
-- losing sub-millisecond precision. Return the original database text only
-- to the validation service so the proof RPC can retain exact comparisons.
create or replace function public.hpc_get_upload_metadata_service(p_bucket text, p_path text)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'id', object.id,
    'updated_at', object.updated_at::text,
    'metadata', object.metadata
  )
  from storage.objects as object
  where object.bucket_id = p_bucket
    and object.name = p_path
    and p_bucket in ('client-documents', 'client-assessments', 'profile-pictures');
$$;

revoke all on function public.hpc_get_upload_metadata_service(text, text)
  from public, anon, authenticated;
grant execute on function public.hpc_get_upload_metadata_service(text, text)
  to service_role;

commit;
