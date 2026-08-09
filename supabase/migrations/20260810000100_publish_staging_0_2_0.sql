update public.app_releases
set is_active = false
where channel = 'staging';

insert into public.app_releases (
  channel,
  version,
  release_notes,
  download_url,
  published_at,
  is_active
)
values (
  'staging',
  '0.2.0',
  'Redesigned clinic workspace, maintainability refactor, expanded role workflow tests, and automated quality checks.',
  null,
  now(),
  true
)
on conflict (channel, version) do update
set release_notes = excluded.release_notes,
    download_url = excluded.download_url,
    published_at = excluded.published_at,
    is_active = true;
