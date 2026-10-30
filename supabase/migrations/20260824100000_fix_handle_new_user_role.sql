-- Fix LinkedIn signup: handle_new_user still inserted role 'candidate'
-- after roles were renamed to talent / employer.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name, avatar_url, role, linkedin_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    'talent',
    public.linkedin_url_from_user_metadata(new.raw_user_meta_data)
  )
  on conflict (id) do update
    set
      email = excluded.email,
      full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, public.user_profiles.avatar_url),
      linkedin_url = coalesce(excluded.linkedin_url, public.user_profiles.linkedin_url);
  return new;
end;
$$;
