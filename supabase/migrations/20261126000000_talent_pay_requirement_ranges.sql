-- Talent pay requirements: annual and/or hourly ranges (min–max).
-- Jobs keep pay_type + min_salary (single amount). Matching compares job amount
-- against the talent range for that denomination.
-- Legacy talent pay_type + min_salary stay as mirrors of the primary floor.

alter table public.talent_profiles
  add column if not exists pay_annual_min integer,
  add column if not exists pay_annual_max integer,
  add column if not exists pay_hourly_min integer,
  add column if not exists pay_hourly_max integer;

-- Backfill ranges from legacy single amount.
update public.talent_profiles
set
  pay_annual_min = case
    when coalesce(pay_type, 'annual') = 'annual' and min_salary is not null
      then min_salary
    else pay_annual_min
  end,
  pay_hourly_min = case
    when pay_type = 'hourly' and min_salary is not null
      then min_salary
    else pay_hourly_min
  end
where min_salary is not null
  and (
    (coalesce(pay_type, 'annual') = 'annual' and pay_annual_min is null)
    or (pay_type = 'hourly' and pay_hourly_min is null)
  );

alter table public.talent_profiles
  drop constraint if exists talent_profiles_pay_annual_min_positive;
alter table public.talent_profiles
  add constraint talent_profiles_pay_annual_min_positive
    check (pay_annual_min is null or pay_annual_min > 0);

alter table public.talent_profiles
  drop constraint if exists talent_profiles_pay_annual_max_positive;
alter table public.talent_profiles
  add constraint talent_profiles_pay_annual_max_positive
    check (pay_annual_max is null or pay_annual_max > 0);

alter table public.talent_profiles
  drop constraint if exists talent_profiles_pay_annual_range;
alter table public.talent_profiles
  add constraint talent_profiles_pay_annual_range
    check (
      pay_annual_min is null
      or pay_annual_max is null
      or pay_annual_max >= pay_annual_min
    );

alter table public.talent_profiles
  drop constraint if exists talent_profiles_pay_hourly_min_positive;
alter table public.talent_profiles
  add constraint talent_profiles_pay_hourly_min_positive
    check (pay_hourly_min is null or pay_hourly_min > 0);

alter table public.talent_profiles
  drop constraint if exists talent_profiles_pay_hourly_max_positive;
alter table public.talent_profiles
  add constraint talent_profiles_pay_hourly_max_positive
    check (pay_hourly_max is null or pay_hourly_max > 0);

alter table public.talent_profiles
  drop constraint if exists talent_profiles_pay_hourly_range;
alter table public.talent_profiles
  add constraint talent_profiles_pay_hourly_range
    check (
      pay_hourly_min is null
      or pay_hourly_max is null
      or pay_hourly_max >= pay_hourly_min
    );

comment on column public.talent_profiles.pay_annual_min is
  'Talent annual salary requirement floor (USD). Null when annual not set.';
comment on column public.talent_profiles.pay_annual_max is
  'Talent annual salary requirement ceiling (USD). Null = open-ended.';
comment on column public.talent_profiles.pay_hourly_min is
  'Talent hourly rate requirement floor (USD). Null when hourly not set.';
comment on column public.talent_profiles.pay_hourly_max is
  'Talent hourly rate requirement ceiling (USD). Null = open-ended.';
comment on column public.talent_profiles.min_salary is
  'Legacy mirror: primary pay floor (USD). Prefer pay_annual_* / pay_hourly_*.';
comment on column public.talent_profiles.pay_type is
  'Legacy mirror: denomination of min_salary. Prefer pay_annual_* / pay_hourly_*.';
