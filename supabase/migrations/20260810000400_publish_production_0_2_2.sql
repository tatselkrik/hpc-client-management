-- Publish updater-enabled production 0.2.2 only during the coordinated cutover.

update public.app_releases
set is_active = false
where channel = 'stable';

insert into public.app_releases (
  channel,
  version,
  release_notes,
  download_url,
  published_at,
  is_active
)
values (
  'stable',
  '0.2.2',
  'Redesigned clinic workspace, hardened account and role controls, improved analytics reporting, editable clinic information, protected backup restore, and private signed application updates.',
  null,
  now(),
  true
)
on conflict (channel, version) do update
set release_notes = excluded.release_notes,
    download_url = excluded.download_url,
    published_at = excluded.published_at,
    is_active = true;
