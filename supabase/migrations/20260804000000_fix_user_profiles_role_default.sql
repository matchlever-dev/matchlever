-- Fix signup failures: role default 'seeker' violates live role check
-- (candidate | recruiter | both | staff). Also restore intended privilege
-- constraint: superuser implies admin (not the reverse).

alter table public.user_profiles
  alter column role set default 'candidate';

-- Any leftover seeker/hirer rows from older naming
update public.user_profiles
set role = 'candidate'
where role = 'seeker';

update public.user_profiles
set role = 'recruiter'
where role = 'hirer';

alter table public.user_profiles
  drop constraint if exists user_profiles_role_check;

alter table public.user_profiles
  add constraint user_profiles_role_check
    check (role in ('candidate', 'recruiter', 'both', 'staff'));

comment on column public.user_profiles.role is
  'Platform role used by directory: candidate, recruiter, both, or staff.';

-- Align privilege check with product rules (superuser ⇒ admin).
alter table public.user_profiles
  drop constraint if exists user_profiles_admin_implies_superuser;

alter table public.user_profiles
  drop constraint if exists user_profiles_superuser_implies_admin;

-- First repair any superuser rows that are missing is_admin.
update public.user_profiles
set is_admin = true
where is_superuser = true
  and is_admin = false;

alter table public.user_profiles
  add constraint user_profiles_superuser_implies_admin
    check (not is_superuser or is_admin);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    'candidate'
  )
  on conflict (id) do update
    set
      email = excluded.email,
      full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, public.user_profiles.avatar_url);
  return new;
end;
$$;
