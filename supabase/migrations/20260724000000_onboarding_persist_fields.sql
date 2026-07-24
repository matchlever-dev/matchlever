-- Onboarding preference + ToS fields on candidate_profiles

alter table public.candidate_profiles
  add column if not exists location_mode text not null default 'remote',
  add column if not exists min_salary integer,
  add column if not exists visa_status text,
  add column if not exists years_experience integer,
  add column if not exists seeker_tos_accepted_at timestamptz;

alter table public.candidate_profiles
  drop constraint if exists candidate_profiles_location_mode_check;

alter table public.candidate_profiles
  add constraint candidate_profiles_location_mode_check
    check (location_mode in ('remote', 'hybrid', 'onsite'));

alter table public.candidate_profiles
  drop constraint if exists candidate_profiles_min_salary_check;

alter table public.candidate_profiles
  add constraint candidate_profiles_min_salary_check
    check (min_salary is null or (min_salary >= 40000 and min_salary <= 500000));

alter table public.candidate_profiles
  drop constraint if exists candidate_profiles_years_experience_check;

alter table public.candidate_profiles
  add constraint candidate_profiles_years_experience_check
    check (years_experience is null or years_experience between 0 and 60);

comment on column public.candidate_profiles.location_mode is
  'Preferred work mode: remote, hybrid, or onsite.';
comment on column public.candidate_profiles.min_salary is
  'Minimum annual salary expectation (USD).';
comment on column public.candidate_profiles.visa_status is
  'Work authorization / visa preference code from onboarding.';
comment on column public.candidate_profiles.seeker_tos_accepted_at is
  'When the seeker accepted the Job Seeker Terms of Service.';
