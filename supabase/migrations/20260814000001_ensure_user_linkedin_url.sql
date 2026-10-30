alter table public.user_profiles
  add column if not exists linkedin_url text;
