-- HPC Client Management canonical Supabase migration
-- Generated from live Supabase CSV exports supplied on 2026-05-04.
-- Intended for a NEW/FRESH Supabase project. Do not run blindly against the current live project.

-- Baseline app seed data.
-- Only standard client category defaults are seeded.
-- Live/admin-created categories from the export such as Capuchin, Clinic, and Silay are intentionally not seeded.

insert into public.client_categories (name)
select seed.name
from (values
  ('Bago'),
  ('Himamaylan'),
  ('Cauayan')
) as seed(name)
where not exists (
  select 1
  from public.client_categories existing
  where lower(trim(existing.name)) = lower(trim(seed.name))
);

