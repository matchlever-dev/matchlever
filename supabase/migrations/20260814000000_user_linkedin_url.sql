-- Persist the candidate's LinkedIn profile URL from OIDC metadata.

alter table public.user_profiles
  add column if not exists linkedin_url text;

comment on column public.user_profiles.linkedin_url is
  'Public LinkedIn profile URL captured at LinkedIn sign-in, when available.';

create or replace function public.linkedin_url_from_user_metadata(meta jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    case
      when meta ->> 'linkedin_url' ~* '^https?://([^/]+\.)?linkedin\.com/'
        then regexp_replace(meta ->> 'linkedin_url', '^http://', 'https://', 'i')
    end,
    case
      when meta ->> 'profile' ~* '^https?://([^/]+\.)?linkedin\.com/'
        then regexp_replace(meta ->> 'profile', '^http://', 'https://', 'i')
    end,
    case
      when coalesce(meta ->> 'preferred_username', meta ->> 'vanityName', meta ->> 'vanity_name')
        ~ '^[A-Za-z0-9\-_%]+$'
        then 'https://www.linkedin.com/in/'
          || coalesce(meta ->> 'preferred_username', meta ->> 'vanityName', meta ->> 'vanity_name')
    end
  );
$$;

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
    'candidate',
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
