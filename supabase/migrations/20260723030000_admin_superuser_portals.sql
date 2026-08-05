-- Admin / Superuser portals: roles, resume fields, hirers, jobs, handshakes

-- ---------------------------------------------------------------------------
-- Privilege escalation: allow admins (and service role) to update flags
-- ---------------------------------------------------------------------------

create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role / system calls have no auth.uid(); allow those writes.
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_admin() then
    if new.is_admin is distinct from old.is_admin
       or new.is_superuser is distinct from old.is_superuser then
      raise exception 'Only admins can modify admin privilege flags';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- user_profiles.role for directory (candidate / recruiter / both / staff)
-- ---------------------------------------------------------------------------

alter table public.user_profiles
  add column if not exists role text not null default 'candidate';

alter table public.user_profiles
  drop constraint if exists user_profiles_role_check;

alter table public.user_profiles
  add constraint user_profiles_role_check
    check (role in ('candidate', 'recruiter', 'both', 'staff'));

comment on column public.user_profiles.role is
  'Platform role used by directory: candidate, recruiter, both, or staff.';

create index if not exists user_profiles_role_idx
  on public.user_profiles (role);

-- ---------------------------------------------------------------------------
-- candidate_profiles resume fields for admin audit tabs
-- ---------------------------------------------------------------------------

alter table public.candidate_profiles
  add column if not exists raw_resume_text text,
  add column if not exists sanitized_summary text;

comment on column public.candidate_profiles.raw_resume_text is
  'Un-sanitized resume text retained for admin audit (never shown to hirers).';
comment on column public.candidate_profiles.sanitized_summary is
  'AI-sanitized anonymous summary shown on the employer-facing card.';

-- ---------------------------------------------------------------------------
-- Hirer profiles
-- ---------------------------------------------------------------------------

create table if not exists public.hirer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles (id) on delete cascade,
  company_name text not null,
  title text,
  global_city text,
  global_country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.hirer_profiles is
  'Enterprise hirer / hiring-manager profile.';

create index if not exists hirer_profiles_user_id_idx
  on public.hirer_profiles (user_id);

drop trigger if exists hirer_profiles_set_updated_at on public.hirer_profiles;
create trigger hirer_profiles_set_updated_at
  before update on public.hirer_profiles
  for each row execute function public.set_updated_at();

alter table public.hirer_profiles enable row level security;

drop policy if exists "Authenticated users can view hirer profiles" on public.hirer_profiles;
create policy "Authenticated users can view hirer profiles"
  on public.hirer_profiles
  for select
  to authenticated
  using (true);

drop policy if exists "Owners or admins can create hirer profiles" on public.hirer_profiles;
create policy "Owners or admins can create hirer profiles"
  on public.hirer_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Owners or admins can update hirer profiles" on public.hirer_profiles;
create policy "Owners or admins can update hirer profiles"
  on public.hirer_profiles
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Owners or admins can delete hirer profiles" on public.hirer_profiles;
create policy "Owners or admins can delete hirer profiles"
  on public.hirer_profiles
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Job postings (Kanban boards)
-- ---------------------------------------------------------------------------

create table if not exists public.job_postings (
  id uuid primary key default gen_random_uuid(),
  hirer_profile_id uuid not null
    references public.hirer_profiles (id) on delete cascade,
  title text not null,
  company_name text,
  description text,
  status text not null default 'active',
  kanban_columns jsonb not null default '["sourced","screening","interview","offer","hired"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_postings_status_check
    check (status in ('active', 'paused', 'closed')),
  constraint job_postings_kanban_columns_is_array
    check (jsonb_typeof(kanban_columns) = 'array')
);

comment on table public.job_postings is
  'Active hiring requisitions with a Kanban board for matches.';

create index if not exists job_postings_hirer_profile_id_idx
  on public.job_postings (hirer_profile_id);
create index if not exists job_postings_status_idx
  on public.job_postings (status);

drop trigger if exists job_postings_set_updated_at on public.job_postings;
create trigger job_postings_set_updated_at
  before update on public.job_postings
  for each row execute function public.set_updated_at();

alter table public.job_postings enable row level security;

drop policy if exists "Authenticated users can view job postings" on public.job_postings;
create policy "Authenticated users can view job postings"
  on public.job_postings
  for select
  to authenticated
  using (true);

drop policy if exists "Hirers or admins can create job postings" on public.job_postings;
create policy "Hirers or admins can create job postings"
  on public.job_postings
  for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.hirer_profiles hp
      where hp.id = hirer_profile_id and hp.user_id = auth.uid()
    )
  );

drop policy if exists "Hirers or admins can update job postings" on public.job_postings;
create policy "Hirers or admins can update job postings"
  on public.job_postings
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.hirer_profiles hp
      where hp.id = hirer_profile_id and hp.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.hirer_profiles hp
      where hp.id = hirer_profile_id and hp.user_id = auth.uid()
    )
  );

drop policy if exists "Hirers or admins can delete job postings" on public.job_postings;
create policy "Hirers or admins can delete job postings"
  on public.job_postings
  for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.hirer_profiles hp
      where hp.id = hirer_profile_id and hp.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Match handshakes (incl. concierge / manual matches)
-- ---------------------------------------------------------------------------

create table if not exists public.match_handshakes (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid not null
    references public.job_postings (id) on delete cascade,
  candidate_profile_id uuid not null
    references public.candidate_profiles (id) on delete cascade,
  kanban_column text not null default 'sourced',
  is_manual_match boolean not null default false,
  matched_by uuid references public.user_profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_handshakes_job_candidate_unique
    unique (job_posting_id, candidate_profile_id)
);

comment on table public.match_handshakes is
  'Candidate placements on a job Kanban board; is_manual_match marks Concierge Matches.';
comment on column public.match_handshakes.is_manual_match is
  'True when a superuser pushed the candidate as a Concierge Match.';

create index if not exists match_handshakes_job_posting_id_idx
  on public.match_handshakes (job_posting_id);
create index if not exists match_handshakes_candidate_profile_id_idx
  on public.match_handshakes (candidate_profile_id);
create index if not exists match_handshakes_is_manual_match_idx
  on public.match_handshakes (is_manual_match);

drop trigger if exists match_handshakes_set_updated_at on public.match_handshakes;
create trigger match_handshakes_set_updated_at
  before update on public.match_handshakes
  for each row execute function public.set_updated_at();

alter table public.match_handshakes enable row level security;

drop policy if exists "Authenticated users can view match handshakes" on public.match_handshakes;
create policy "Authenticated users can view match handshakes"
  on public.match_handshakes
  for select
  to authenticated
  using (true);

drop policy if exists "Admins or superusers can insert match handshakes" on public.match_handshakes;
create policy "Admins or superusers can insert match handshakes"
  on public.match_handshakes
  for insert
  to authenticated
  with check (public.is_admin() or public.is_superuser());

drop policy if exists "Admins or hirers can update match handshakes" on public.match_handshakes;
create policy "Admins or hirers can update match handshakes"
  on public.match_handshakes
  for update
  to authenticated
  using (
    public.is_admin()
    or public.is_superuser()
    or exists (
      select 1
      from public.job_postings jp
      join public.hirer_profiles hp on hp.id = jp.hirer_profile_id
      where jp.id = job_posting_id and hp.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or public.is_superuser()
    or exists (
      select 1
      from public.job_postings jp
      join public.hirer_profiles hp on hp.id = jp.hirer_profile_id
      where jp.id = job_posting_id and hp.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can delete match handshakes" on public.match_handshakes;
create policy "Admins can delete match handshakes"
  on public.match_handshakes
  for delete
  to authenticated
  using (public.is_admin() or public.is_superuser());
