-- Persist IANA timezone id alongside minutes-from-UTC offset so UIs can
-- show a named zone (e.g. "US Eastern (UTC−5)") instead of offset alone.

alter table public.candidate_profiles
  add column if not exists timezone text;

comment on column public.candidate_profiles.timezone is
  'IANA timezone id (e.g. America/New_York). Display with timezone_offset.';
