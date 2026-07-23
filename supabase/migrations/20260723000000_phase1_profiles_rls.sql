-- MatchLever Phase 1: user_profiles, candidate_profiles, candidate_references
-- Helpers: is_admin(), is_superuser()
-- RLS: candidate profiles editable by owner OR admins

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  is_admin boolean not null default false,
  is_superuser boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_superuser_implies_admin
    check (not is_superuser or is_admin)
);

comment on table public.user_profiles is
  'App-level profile for each auth user, including admin/superuser flags.';
comment on column public.user_profiles.is_admin is
  'When true, user may edit any candidate profile (in addition to owners).';
comment on column public.user_profiles.is_superuser is
  'Elevated privilege flag; implies is_admin via check constraint.';

create table public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles (id) on delete cascade,
  headline text,
  bio text,
  global_city text,
  global_country text,
  timezone_offset integer,
  work_hours_start time,
  work_hours_end time,
  suggested_taglines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_profiles_suggested_taglines_is_array
    check (jsonb_typeof(suggested_taglines) = 'array'),
  constraint candidate_profiles_timezone_offset_range
    check (timezone_offset is null or timezone_offset between -720 and 840),
  constraint candidate_profiles_work_hours_order
    check (
      work_hours_start is null
      or work_hours_end is null
      or work_hours_start < work_hours_end
    )
);

comment on table public.candidate_profiles is
  'Talent exchange candidate profile with global location and work-window metadata.';
comment on column public.candidate_profiles.timezone_offset is
  'Minutes offset from UTC (e.g. -480 for UTC-8).';
comment on column public.candidate_profiles.suggested_taglines is
  'JSONB array of suggested tagline strings.';

create table public.candidate_references (
  id uuid primary key default gen_random_uuid(),
  candidate_profile_id uuid not null
    references public.candidate_profiles (id) on delete cascade,
  reference_name text,
  reference_email text not null,
  reference_linkedin_url text,
  relationship text,
  authenticity_score numeric(5, 2),
  authenticity_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_references_email_format
    check (reference_email ~* '^[^@]+@[^@]+\.[^@]+$'),
  constraint candidate_references_authenticity_score_range
    check (
      authenticity_score is null
      or (authenticity_score >= 0 and authenticity_score <= 100)
    ),
  constraint candidate_references_authenticity_flags_is_array
    check (jsonb_typeof(authenticity_flags) = 'array')
);

comment on table public.candidate_references is
  'Professional references attached to a candidate profile.';
comment on column public.candidate_references.authenticity_score is
  '0–100 score from authenticity checks; null until scored.';
comment on column public.candidate_references.authenticity_flags is
  'JSONB array of authenticity flag codes/objects.';

create index candidate_profiles_user_id_idx
  on public.candidate_profiles (user_id);
create index candidate_profiles_global_location_idx
  on public.candidate_profiles (global_country, global_city);
create index candidate_references_candidate_profile_id_idx
  on public.candidate_references (candidate_profile_id);
create index candidate_references_reference_email_idx
  on public.candidate_references (reference_email);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

create trigger candidate_profiles_set_updated_at
  before update on public.candidate_profiles
  for each row execute function public.set_updated_at();

create trigger candidate_references_set_updated_at
  before update on public.candidate_references
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create user_profiles on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Privilege helpers (SECURITY DEFINER to avoid RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select up.is_admin
      from public.user_profiles up
      where up.id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.is_superuser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select up.is_superuser
      from public.user_profiles up
      where up.id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_superuser() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_superuser() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.user_profiles enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.candidate_references enable row level security;

-- user_profiles
create policy "Users can view their own profile"
  on public.user_profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "Users can update their own non-privileged profile fields"
  on public.user_profiles
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "Superusers can insert user profiles"
  on public.user_profiles
  for insert
  to authenticated
  with check (public.is_superuser());

-- candidate_profiles
-- Read: authenticated users (talent exchange discovery)
create policy "Authenticated users can view candidate profiles"
  on public.candidate_profiles
  for select
  to authenticated
  using (true);

-- Insert: owner only (admins may insert on behalf of a user)
create policy "Owners or admins can create candidate profiles"
  on public.candidate_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

-- Update: owner OR is_admin = true (Phase 1 requirement)
create policy "Owners or admins can update candidate profiles"
  on public.candidate_profiles
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Delete: owner OR admin
create policy "Owners or admins can delete candidate profiles"
  on public.candidate_profiles
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- candidate_references: scoped through owning candidate_profile
create policy "Authenticated users can view candidate references"
  on public.candidate_references
  for select
  to authenticated
  using (true);

create policy "Owners or admins can create candidate references"
  on public.candidate_references
  for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.candidate_profiles cp
      where cp.id = candidate_profile_id
        and cp.user_id = auth.uid()
    )
  );

create policy "Owners or admins can update candidate references"
  on public.candidate_references
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.candidate_profiles cp
      where cp.id = candidate_profile_id
        and cp.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.candidate_profiles cp
      where cp.id = candidate_profile_id
        and cp.user_id = auth.uid()
    )
  );

create policy "Owners or admins can delete candidate references"
  on public.candidate_references
  for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.candidate_profiles cp
      where cp.id = candidate_profile_id
        and cp.user_id = auth.uid()
    )
  );

-- Prevent non-superusers from escalating admin flags via UPDATE
create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superuser() then
    if new.is_admin is distinct from old.is_admin
       or new.is_superuser is distinct from old.is_superuser then
      raise exception 'Only superusers can modify admin privilege flags';
    end if;
  end if;
  return new;
end;
$$;

create trigger user_profiles_prevent_privilege_escalation
  before update on public.user_profiles
  for each row execute function public.prevent_privilege_escalation();
