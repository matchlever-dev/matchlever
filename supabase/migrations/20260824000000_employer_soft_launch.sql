-- Employer soft launch: status lifecycle + waitlist intake fields.

alter table public.employer_profiles
  add column if not exists status text not null default 'waitlisted',
  add column if not exists user_role text,
  add column if not exists company_website text,
  add column if not exists industry text,
  add column if not exists company_size text,
  add column if not exists estimated_roles integer,
  add column if not exists hiring_departments text[] not null default '{}',
  add column if not exists work_arrangement text,
  add column if not exists first_match_free_claimed boolean not null default true;

alter table public.employer_profiles
  drop constraint if exists employer_profiles_status_check;

alter table public.employer_profiles
  add constraint employer_profiles_status_check
    check (status in ('waitlisted', 'active', 'on_hold', 'inactive'));

alter table public.employer_profiles
  drop constraint if exists employer_profiles_user_role_check;

alter table public.employer_profiles
  add constraint employer_profiles_user_role_check
    check (user_role is null or user_role in ('recruiter', 'hiring_manager'));

alter table public.employer_profiles
  drop constraint if exists employer_profiles_company_size_check;

alter table public.employer_profiles
  add constraint employer_profiles_company_size_check
    check (
      company_size is null
      or company_size in ('1-10', '11-50', '51-200', '201+')
    );

alter table public.employer_profiles
  drop constraint if exists employer_profiles_work_arrangement_check;

alter table public.employer_profiles
  add constraint employer_profiles_work_arrangement_check
    check (
      work_arrangement is null
      or work_arrangement in ('remote', 'hybrid', 'onsite', 'mixed')
    );

create index if not exists employer_profiles_status_idx
  on public.employer_profiles (status);

comment on column public.employer_profiles.status is
  'Employer lifecycle: waitlisted (default), active, on_hold, inactive.';
comment on column public.employer_profiles.user_role is
  'Primary hiring role: in-house recruiter/talent acquisition vs hiring manager.';
comment on column public.employer_profiles.first_match_free_claimed is
  'Soft launch promotion: first accepted match is free.';
