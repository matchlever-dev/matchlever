-- Persist Employer Terms of Service acceptance on employer profiles.

alter table public.employer_profiles
  add column if not exists employer_tos_accepted_at timestamptz;

comment on column public.employer_profiles.employer_tos_accepted_at is
  'When the employer accepted the MatchLever Employer Terms of Service.';
