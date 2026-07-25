-- Multi-select work modes + commute / relocation preferences

alter table public.candidate_profiles
  add column if not exists location_modes text[] not null default array['remote']::text[],
  add column if not exists max_commute_miles integer,
  add column if not exists open_to_relocation boolean;

-- Backfill from legacy single location_mode
update public.candidate_profiles
set location_modes = array[location_mode]::text[]
where location_mode is not null
  and location_mode in ('remote', 'hybrid', 'onsite');

alter table public.candidate_profiles
  drop constraint if exists candidate_profiles_location_modes_check;

alter table public.candidate_profiles
  add constraint candidate_profiles_location_modes_check
  check (
    cardinality(location_modes) >= 1
    and location_modes <@ array['remote', 'hybrid', 'onsite']::text[]
  );

alter table public.candidate_profiles
  drop constraint if exists candidate_profiles_max_commute_miles_check;

alter table public.candidate_profiles
  add constraint candidate_profiles_max_commute_miles_check
  check (
    max_commute_miles is null
    or (max_commute_miles >= 1 and max_commute_miles <= 500)
  );

-- Keep legacy location_mode in sync as a denormalized primary for older readers
create or replace function public.sync_candidate_location_mode()
returns trigger
language plpgsql
as $$
begin
  if new.location_modes is not null and cardinality(new.location_modes) >= 1 then
    new.location_mode := new.location_modes[1];
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_candidate_location_mode on public.candidate_profiles;
create trigger trg_sync_candidate_location_mode
  before insert or update of location_modes
  on public.candidate_profiles
  for each row
  execute function public.sync_candidate_location_mode();

comment on column public.candidate_profiles.location_modes is
  'Preferred work modes; one or more of remote, hybrid, onsite.';
comment on column public.candidate_profiles.max_commute_miles is
  'Max one-way commute in miles when hybrid or onsite is selected.';
comment on column public.candidate_profiles.open_to_relocation is
  'Whether seeker is open to relocating when hybrid or onsite is selected.';
