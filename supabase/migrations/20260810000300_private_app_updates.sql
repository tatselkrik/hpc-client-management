-- Private, signed desktop update distribution. The bucket has no client-facing
-- Storage policies; only service-role code can publish files or create signed URLs.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'app-updates',
  'app-updates',
  false,
  209715200
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

create table if not exists public.app_release_artifacts (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.app_releases(id) on delete cascade,
  target text not null check (target in ('windows', 'linux', 'darwin')),
  architecture text not null check (architecture in ('x86_64', 'aarch64', 'i686', 'armv7')),
  bucket_id text not null default 'app-updates' check (bucket_id = 'app-updates'),
  object_path text not null,
  signature text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_release_artifacts_target_unique
    unique (release_id, target, architecture),
  constraint app_release_artifacts_path_check
    check (object_path ~ '^(stable|staging)/[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?/[A-Za-z0-9._/-]+$'),
  constraint app_release_artifacts_signature_check
    check (char_length(signature) between 40 and 4096)
);

create index if not exists app_release_artifacts_lookup_idx
  on public.app_release_artifacts (release_id, target, architecture);

alter table public.app_release_artifacts enable row level security;
revoke all on public.app_release_artifacts from public, anon, authenticated;
grant select, insert, update, delete on public.app_release_artifacts to service_role;

create or replace function public.hpc_publish_app_release(
  p_channel text,
  p_version text,
  p_release_notes text,
  p_target text,
  p_architecture text,
  p_bucket_id text,
  p_object_path text,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  release_id_value uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Release publication is restricted to the service role.';
  end if;

  if p_channel not in ('stable', 'staging') then
    raise exception 'Unsupported release channel.';
  end if;
  if p_version !~ '^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$' then
    raise exception 'Release version must use semantic versioning.';
  end if;
  if p_target not in ('windows', 'linux', 'darwin') then
    raise exception 'Unsupported update target.';
  end if;
  if p_architecture not in ('x86_64', 'aarch64', 'i686', 'armv7') then
    raise exception 'Unsupported update architecture.';
  end if;
  if p_bucket_id <> 'app-updates' then
    raise exception 'Updates must use the private app-updates bucket.';
  end if;
  if left(
    p_object_path,
    char_length(p_channel || '/' || p_version || '/')
  ) <> p_channel || '/' || p_version || '/' then
    raise exception 'Update object path does not match its channel and version.';
  end if;
  if char_length(coalesce(p_signature, '')) not between 40 and 4096 then
    raise exception 'Update signature is missing or invalid.';
  end if;

  insert into public.app_releases (
    channel,
    version,
    release_notes,
    download_url,
    published_at,
    is_active
  )
  values (
    p_channel,
    p_version,
    coalesce(p_release_notes, ''),
    null,
    now(),
    false
  )
  on conflict (channel, version) do update
  set release_notes = excluded.release_notes,
      download_url = null,
      published_at = excluded.published_at,
      is_active = false
  returning id into release_id_value;

  insert into public.app_release_artifacts (
    release_id,
    target,
    architecture,
    bucket_id,
    object_path,
    signature,
    updated_at
  )
  values (
    release_id_value,
    p_target,
    p_architecture,
    p_bucket_id,
    p_object_path,
    p_signature,
    now()
  )
  on conflict (release_id, target, architecture) do update
  set bucket_id = excluded.bucket_id,
      object_path = excluded.object_path,
      signature = excluded.signature,
      updated_at = now();

  update public.app_releases
  set is_active = (id = release_id_value)
  where channel = p_channel;

  return jsonb_build_object(
    'ok', true,
    'release_id', release_id_value,
    'channel', p_channel,
    'version', p_version,
    'target', p_target,
    'architecture', p_architecture
  );
end;
$function$;

revoke all on function public.hpc_publish_app_release(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
grant execute on function public.hpc_publish_app_release(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
