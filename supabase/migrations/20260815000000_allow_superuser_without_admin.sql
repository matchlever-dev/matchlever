-- Privileges are independent: a user may be admin, superuser, both, or neither.
-- Superuser-only accounts still need read/update access used by the Superuser portal.

alter table public.user_profiles
  drop constraint if exists user_profiles_superuser_implies_admin;

alter table public.user_profiles
  drop constraint if exists user_profiles_admin_implies_superuser;

comment on column public.user_profiles.is_admin is
  'Admin Portal access. Independent of is_superuser.';
comment on column public.user_profiles.is_superuser is
  'Superuser Portal access. Independent of is_admin.';

drop policy if exists "Users can view their own profile" on public.user_profiles;
create policy "Users can view their own profile"
  on public.user_profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or public.is_superuser()
  );

drop policy if exists "Owners or admins can update candidate profiles"
  on public.candidate_profiles;
create policy "Owners or admins can update candidate profiles"
  on public.candidate_profiles
  for update
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or public.is_superuser()
  )
  with check (
    user_id = auth.uid()
    or public.is_admin()
    or public.is_superuser()
  );
