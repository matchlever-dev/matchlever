-- Pay: annual salary OR hourly rate (no enforced USD bounds).
-- Keep min_salary as the numeric amount; pay_type says how to interpret it.

alter table public.talent_profiles
  drop constraint if exists talent_profiles_min_salary_check;

alter table public.talent_profiles
  drop constraint if exists candidate_profiles_min_salary_check;

alter table public.job_postings
  drop constraint if exists job_postings_min_salary_check;

alter table public.talent_profiles
  add column if not exists pay_type text not null default 'annual';

alter table public.job_postings
  add column if not exists pay_type text not null default 'annual';

alter table public.talent_profiles
  drop constraint if exists talent_profiles_pay_type_check;

alter table public.talent_profiles
  add constraint talent_profiles_pay_type_check
    check (pay_type in ('annual', 'hourly'));

alter table public.job_postings
  drop constraint if exists job_postings_pay_type_check;

alter table public.job_postings
  add constraint job_postings_pay_type_check
    check (pay_type in ('annual', 'hourly'));

alter table public.talent_profiles
  drop constraint if exists talent_profiles_min_salary_positive;

alter table public.talent_profiles
  add constraint talent_profiles_min_salary_positive
    check (min_salary is null or min_salary > 0);

alter table public.job_postings
  drop constraint if exists job_postings_min_salary_positive;

alter table public.job_postings
  add constraint job_postings_min_salary_positive
    check (min_salary is null or min_salary > 0);

comment on column public.talent_profiles.min_salary is
  'Pay amount in USD: annual salary when pay_type=annual, hourly rate when pay_type=hourly.';
comment on column public.talent_profiles.pay_type is
  'How min_salary is denominated: annual or hourly.';
comment on column public.job_postings.min_salary is
  'Pay amount in USD: annual salary when pay_type=annual, hourly rate when pay_type=hourly.';
comment on column public.job_postings.pay_type is
  'How min_salary is denominated: annual or hourly.';
