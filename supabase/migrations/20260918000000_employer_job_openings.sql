-- Employer job openings: mirror talent requirement fields + soft billing columns.

alter table public.job_postings
  add column if not exists verified_skills jsonb not null default '[]'::jsonb,
  add column if not exists years_experience integer,
  add column if not exists suggested_taglines jsonb not null default '[]'::jsonb,
  add column if not exists endorsed_skills jsonb not null default '[]'::jsonb,
  add column if not exists location_modes text[] not null default array['remote']::text[],
  add column if not exists max_commute_miles integer,
  add column if not exists open_to_relocation boolean,
  add column if not exists global_city text,
  add column if not exists global_country text,
  add column if not exists timezone text,
  add column if not exists work_hours_start time,
  add column if not exists work_hours_end time,
  add column if not exists min_salary integer,
  add column if not exists visa_statuses text[] not null default '{}'::text[],
  add column if not exists accepted_match_count integer not null default 0,
  add column if not exists match_bundle_purchased_at timestamptz;

alter table public.job_postings
  drop constraint if exists job_postings_status_check;

alter table public.job_postings
  add constraint job_postings_status_check
  check (status in ('draft', 'active', 'paused', 'closed'));

alter table public.job_postings
  drop constraint if exists job_postings_verified_skills_is_array;

alter table public.job_postings
  add constraint job_postings_verified_skills_is_array
  check (jsonb_typeof(verified_skills) = 'array');

alter table public.job_postings
  drop constraint if exists job_postings_suggested_taglines_is_array;

alter table public.job_postings
  add constraint job_postings_suggested_taglines_is_array
  check (jsonb_typeof(suggested_taglines) = 'array');

alter table public.job_postings
  drop constraint if exists job_postings_endorsed_skills_is_array;

alter table public.job_postings
  add constraint job_postings_endorsed_skills_is_array
  check (jsonb_typeof(endorsed_skills) = 'array');

alter table public.job_postings
  drop constraint if exists job_postings_years_experience_check;

alter table public.job_postings
  add constraint job_postings_years_experience_check
  check (
    years_experience is null
    or (years_experience >= 0 and years_experience <= 40)
  );

alter table public.job_postings
  drop constraint if exists job_postings_min_salary_check;

alter table public.job_postings
  add constraint job_postings_min_salary_check
  check (
    min_salary is null
    or (min_salary >= 40000 and min_salary <= 400000)
  );

alter table public.job_postings
  drop constraint if exists job_postings_accepted_match_count_check;

alter table public.job_postings
  add constraint job_postings_accepted_match_count_check
  check (accepted_match_count >= 0);

comment on column public.job_postings.endorsed_skills is
  'Up to 7 superpower trait ids from the shared reference taxonomy.';
comment on column public.job_postings.accepted_match_count is
  'Accepted matches counted against the current $600 unlock bundle (max 5).';
comment on column public.job_postings.match_bundle_purchased_at is
  'When the employer last paid $600 to unlock up to 5 accepts on this job.';

alter table public.employer_profiles
  add column if not exists free_matches_used integer not null default 0,
  add column if not exists ap_invoicing_email text,
  add column if not exists po_number text,
  add column if not exists has_payment_method boolean not null default false,
  add column if not exists stripe_payment_method_brand text,
  add column if not exists stripe_payment_method_last4 text;

alter table public.employer_profiles
  drop constraint if exists employer_profiles_free_matches_used_check;

alter table public.employer_profiles
  add constraint employer_profiles_free_matches_used_check
  check (free_matches_used >= 0);

comment on column public.employer_profiles.free_matches_used is
  'Count of $0 founder promo accepts used (2026 signup special: first match free).';
comment on column public.employer_profiles.has_payment_method is
  'True when a Stripe payment method is on file for Accept Match charges.';
