-- Seeker dashboard: availability status + card fields

alter table public.candidate_profiles
  add column if not exists status text not null default 'actively_looking',
  add column if not exists selected_tagline text,
  add column if not exists verified_skills jsonb not null default '[]'::jsonb;

alter table public.candidate_profiles
  drop constraint if exists candidate_profiles_status_check;

alter table public.candidate_profiles
  add constraint candidate_profiles_status_check
    check (status in ('actively_looking', 'on_hold'));

alter table public.candidate_profiles
  drop constraint if exists candidate_profiles_verified_skills_is_array;

alter table public.candidate_profiles
  add constraint candidate_profiles_verified_skills_is_array
    check (jsonb_typeof(verified_skills) = 'array');

comment on column public.candidate_profiles.status is
  'actively_looking = visible in search; on_hold = snoozed/hidden from searches.';
comment on column public.candidate_profiles.selected_tagline is
  'Candidate-selected AI Superpower Tagline shown on anonymous employer card.';
comment on column public.candidate_profiles.verified_skills is
  'Skills shown on the anonymous employer card.';

create index if not exists candidate_profiles_status_idx
  on public.candidate_profiles (status);
