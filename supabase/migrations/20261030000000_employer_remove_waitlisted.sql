-- Drop waitlisted employer status: new accounts are active and can post jobs.

update public.employer_profiles
set status = 'active'
where status = 'waitlisted';

alter table public.employer_profiles
  alter column status set default 'active';

alter table public.employer_profiles
  drop constraint if exists employer_profiles_status_check;

alter table public.employer_profiles
  add constraint employer_profiles_status_check
  check (status in ('active', 'on_hold', 'inactive'));

comment on column public.employer_profiles.status is
  'Employer lifecycle: active (default), on_hold, inactive.';
