-- Terminology rename: candidate → talent, recruiter → employer
-- Tables, columns, roles, indexes/constraints/triggers, and get_reference_invite.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

alter table public.candidate_profiles rename to talent_profiles;
alter table public.candidate_references rename to talent_references;

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.talent_references
  rename column candidate_profile_id to talent_profile_id;

alter table public.match_handshakes
  rename column candidate_profile_id to talent_profile_id;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

alter index if exists public.candidate_profiles_user_id_idx
  rename to talent_profiles_user_id_idx;
alter index if exists public.candidate_profiles_global_location_idx
  rename to talent_profiles_global_location_idx;
alter index if exists public.candidate_profiles_status_idx
  rename to talent_profiles_status_idx;

alter index if exists public.candidate_references_candidate_profile_id_idx
  rename to talent_references_talent_profile_id_idx;
alter index if exists public.candidate_references_reference_email_idx
  rename to talent_references_reference_email_idx;
alter index if exists public.candidate_references_verification_token_idx
  rename to talent_references_verification_token_idx;
alter index if exists public.candidate_references_status_idx
  rename to talent_references_status_idx;

alter index if exists public.match_handshakes_candidate_profile_id_idx
  rename to match_handshakes_talent_profile_id_idx;

-- ---------------------------------------------------------------------------
-- Constraints (rename where names are candidate_*; skip if already renamed)
-- ---------------------------------------------------------------------------

create or replace function public._rename_constraint_if_exists(
  p_table text,
  p_old text,
  p_new text
) returns void
language plpgsql
as $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = p_table
      and c.conname = p_old
  ) then
    execute format(
      'alter table public.%I rename constraint %I to %I',
      p_table, p_old, p_new
    );
  end if;
end;
$$;


select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_pkey', 'talent_profiles_pkey');
select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_user_id_key', 'talent_profiles_user_id_key');
select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_user_id_fkey', 'talent_profiles_user_id_fkey');
select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_suggested_taglines_is_array', 'talent_profiles_suggested_taglines_is_array');
select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_timezone_offset_range', 'talent_profiles_timezone_offset_range');
select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_work_hours_order', 'talent_profiles_work_hours_order');
select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_status_check', 'talent_profiles_status_check');
select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_verified_skills_is_array', 'talent_profiles_verified_skills_is_array');
select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_verified_superpowers_is_array', 'talent_profiles_verified_superpowers_is_array');
select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_location_mode_check', 'talent_profiles_location_mode_check');
select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_min_salary_check', 'talent_profiles_min_salary_check');
select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_years_experience_check', 'talent_profiles_years_experience_check');
select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_location_modes_check', 'talent_profiles_location_modes_check');
select public._rename_constraint_if_exists('talent_profiles', 'candidate_profiles_max_commute_miles_check', 'talent_profiles_max_commute_miles_check');

select public._rename_constraint_if_exists('talent_references', 'candidate_references_pkey', 'talent_references_pkey');
select public._rename_constraint_if_exists('talent_references', 'candidate_references_email_format', 'talent_references_email_format');
select public._rename_constraint_if_exists('talent_references', 'candidate_references_authenticity_score_range', 'talent_references_authenticity_score_range');
select public._rename_constraint_if_exists('talent_references', 'candidate_references_authenticity_flags_is_array', 'talent_references_authenticity_flags_is_array');
select public._rename_constraint_if_exists('talent_references', 'candidate_references_verification_token_unique', 'talent_references_verification_token_unique');
select public._rename_constraint_if_exists('talent_references', 'candidate_references_status_check', 'talent_references_status_check');
select public._rename_constraint_if_exists('talent_references', 'candidate_references_superpowers_is_array', 'talent_references_superpowers_is_array');
select public._rename_constraint_if_exists('talent_references', 'candidate_references_rating_ranges', 'talent_references_rating_ranges');

-- FK from talent_references → talent_profiles (auto name may vary)
do $$
declare
  fk_name text;
begin
  select c.conname into fk_name
  from pg_constraint c
  join pg_class rel on rel.oid = c.conrelid
  join pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public'
    and rel.relname = 'talent_references'
    and c.contype = 'f'
    and c.conname like '%candidate%';
  if fk_name is not null then
    execute format(
      'alter table public.talent_references rename constraint %I to talent_references_talent_profile_id_fkey',
      fk_name
    );
  end if;
end $$;

select public._rename_constraint_if_exists(
  'match_handshakes',
  'match_handshakes_job_candidate_unique',
  'match_handshakes_job_talent_unique'
);

do $$
declare
  fk_name text;
begin
  select c.conname into fk_name
  from pg_constraint c
  join pg_class rel on rel.oid = c.conrelid
  join pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public'
    and rel.relname = 'match_handshakes'
    and c.contype = 'f'
    and c.conname like '%candidate%';
  if fk_name is not null then
    execute format(
      'alter table public.match_handshakes rename constraint %I to match_handshakes_talent_profile_id_fkey',
      fk_name
    );
  end if;
end $$;

drop function if exists public._rename_constraint_if_exists(text, text, text);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

alter trigger candidate_profiles_set_updated_at on public.talent_profiles
  rename to talent_profiles_set_updated_at;
alter trigger candidate_references_set_updated_at on public.talent_references
  rename to talent_references_set_updated_at;

drop trigger if exists trg_sync_candidate_location_mode on public.talent_profiles;

create or replace function public.sync_talent_location_mode()
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

drop function if exists public.sync_candidate_location_mode();

create trigger trg_sync_talent_location_mode
  before insert or update of location_modes
  on public.talent_profiles
  for each row
  execute function public.sync_talent_location_mode();

-- ---------------------------------------------------------------------------
-- RLS policy names (policies stay on renamed tables by OID)
-- ---------------------------------------------------------------------------

alter policy "Authenticated users can view candidate profiles"
  on public.talent_profiles
  rename to "Authenticated users can view talent profiles";
alter policy "Owners or admins can create candidate profiles"
  on public.talent_profiles
  rename to "Owners or admins can create talent profiles";
alter policy "Owners or admins can update candidate profiles"
  on public.talent_profiles
  rename to "Owners or admins can update talent profiles";
alter policy "Owners or admins can delete candidate profiles"
  on public.talent_profiles
  rename to "Owners or admins can delete talent profiles";

alter policy "Authenticated users can view candidate references"
  on public.talent_references
  rename to "Authenticated users can view talent references";
alter policy "Owners or admins can create candidate references"
  on public.talent_references
  rename to "Owners or admins can create talent references";
alter policy "Owners or admins can update candidate references"
  on public.talent_references
  rename to "Owners or admins can update talent references";
alter policy "Owners or admins can delete candidate references"
  on public.talent_references
  rename to "Owners or admins can delete talent references";

-- ---------------------------------------------------------------------------
-- user_profiles.role: candidate → talent, recruiter → employer
-- ---------------------------------------------------------------------------

alter table public.user_profiles
  drop constraint if exists user_profiles_role_check;

update public.user_profiles
set role = 'talent'
where role = 'candidate';

update public.user_profiles
set role = 'employer'
where role = 'recruiter';

alter table public.user_profiles
  alter column role set default 'talent';

alter table public.user_profiles
  add constraint user_profiles_role_check
    check (role in ('talent', 'employer', 'both', 'staff'));

comment on column public.user_profiles.role is
  'Platform role used by directory: talent, employer, both, or staff.';

-- ---------------------------------------------------------------------------
-- get_reference_invite: new table/column names + talent_* return cols
-- ---------------------------------------------------------------------------

drop function if exists public.get_reference_invite(text);

create function public.get_reference_invite(p_token text)
returns table (
  token text,
  status text,
  relationship text,
  reference_name text,
  reference_linkedin_url text,
  talent_title text,
  talent_tagline text
)
language sql
security definer
set search_path = public
as $$
  select
    tr.verification_token as token,
    tr.status,
    tr.relationship,
    tr.reference_name,
    tr.reference_linkedin_url,
    coalesce(tp.headline, 'MatchLever talent') as talent_title,
    coalesce(
      (
        select elem
        from jsonb_array_elements_text(tp.suggested_taglines) as elem
        limit 1
      ),
      'Verified enterprise software talent'
    ) as talent_tagline
  from public.talent_references tr
  join public.talent_profiles tp on tp.id = tr.talent_profile_id
  where tr.verification_token = p_token
  limit 1;
$$;

revoke all on function public.get_reference_invite(text) from public;
grant execute on function public.get_reference_invite(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------

comment on table public.talent_profiles is
  'Talent (job-seeker) profiles for MatchLever matching.';
comment on table public.talent_references is
  'Professional references attached to a talent profile.';

-- ---------------------------------------------------------------------------
-- Column: seeker_tos_accepted_at → talent_tos_accepted_at
-- ---------------------------------------------------------------------------

alter table public.talent_profiles
  rename column seeker_tos_accepted_at to talent_tos_accepted_at;

comment on column public.talent_profiles.talent_tos_accepted_at is
  'When the talent accepted the Job Talent Terms of Service.';

-- ---------------------------------------------------------------------------
-- hirer_profiles → employer_profiles (recruiter/employer side)
-- ---------------------------------------------------------------------------

alter table public.hirer_profiles rename to employer_profiles;

alter table public.job_postings
  rename column hirer_profile_id to employer_profile_id;

alter index if exists public.hirer_profiles_user_id_idx
  rename to employer_profiles_user_id_idx;
alter index if exists public.job_postings_hirer_profile_id_idx
  rename to job_postings_employer_profile_id_idx;

do $$
declare
  r record;
begin
  for r in
    select c.conname as old_name,
      case c.conname
        when 'hirer_profiles_pkey' then 'employer_profiles_pkey'
        when 'hirer_profiles_user_id_key' then 'employer_profiles_user_id_key'
        when 'hirer_profiles_user_id_fkey' then 'employer_profiles_user_id_fkey'
        else null
      end as new_name
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'employer_profiles'
      and c.conname like 'hirer_profiles%'
  loop
    if r.new_name is not null then
      execute format(
        'alter table public.employer_profiles rename constraint %I to %I',
        r.old_name, r.new_name
      );
    end if;
  end loop;
end $$;

do $$
declare
  fk_name text;
begin
  select c.conname into fk_name
  from pg_constraint c
  join pg_class rel on rel.oid = c.conrelid
  join pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public'
    and rel.relname = 'job_postings'
    and c.contype = 'f'
    and c.conname like '%hirer%';
  if fk_name is not null then
    execute format(
      'alter table public.job_postings rename constraint %I to job_postings_employer_profile_id_fkey',
      fk_name
    );
  end if;
end $$;

alter trigger hirer_profiles_set_updated_at on public.employer_profiles
  rename to employer_profiles_set_updated_at;

alter policy "Authenticated users can view hirer profiles"
  on public.employer_profiles
  rename to "Authenticated users can view employer profiles";
alter policy "Owners or admins can create hirer profiles"
  on public.employer_profiles
  rename to "Owners or admins can create employer profiles";
alter policy "Owners or admins can update hirer profiles"
  on public.employer_profiles
  rename to "Owners or admins can update employer profiles";
alter policy "Owners or admins can delete hirer profiles"
  on public.employer_profiles
  rename to "Owners or admins can delete employer profiles";

comment on table public.employer_profiles is
  'Employer (hiring company) profiles for MatchLever matching.';

-- ---------------------------------------------------------------------------
-- Authenticity flag rename (stored JSON strings)
-- ---------------------------------------------------------------------------

update public.talent_references
set authenticity_flags = (
  select coalesce(
    jsonb_agg(
      case
        when elem = '"seeker_provided_linkedin"'::jsonb
          then '"talent_provided_linkedin"'::jsonb
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(authenticity_flags, '[]'::jsonb)) as elem
)
where authenticity_flags::text like '%seeker_provided_linkedin%';
