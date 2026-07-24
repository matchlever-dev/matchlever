-- Reference verification tokens, ratings, superpowers aggregation

alter table public.candidate_profiles
  add column if not exists verified_superpowers jsonb not null default '[]'::jsonb;

alter table public.candidate_profiles
  drop constraint if exists candidate_profiles_verified_superpowers_is_array;

alter table public.candidate_profiles
  add constraint candidate_profiles_verified_superpowers_is_array
    check (jsonb_typeof(verified_superpowers) = 'array');

comment on column public.candidate_profiles.verified_superpowers is
  'Aggregated superpowers from verified references (id, label, category, votes).';

alter table public.candidate_references
  add column if not exists verification_token text,
  add column if not exists status text not null default 'pending',
  add column if not exists superpowers jsonb not null default '[]'::jsonb,
  add column if not exists reliability_score smallint,
  add column if not exists technical_quality_score smallint,
  add column if not exists rehire_intent_score smallint,
  add column if not exists endorsement text,
  add column if not exists verified_at timestamptz;

update public.candidate_references
set verification_token = replace(gen_random_uuid()::text, '-', '')
where verification_token is null;

alter table public.candidate_references
  alter column verification_token set not null;

alter table public.candidate_references
  drop constraint if exists candidate_references_verification_token_unique;

alter table public.candidate_references
  add constraint candidate_references_verification_token_unique
    unique (verification_token);

alter table public.candidate_references
  drop constraint if exists candidate_references_status_check;

alter table public.candidate_references
  add constraint candidate_references_status_check
    check (status in ('pending', 'verified', 'expired', 'revoked'));

alter table public.candidate_references
  drop constraint if exists candidate_references_superpowers_is_array;

alter table public.candidate_references
  add constraint candidate_references_superpowers_is_array
    check (jsonb_typeof(superpowers) = 'array');

alter table public.candidate_references
  drop constraint if exists candidate_references_rating_ranges;

alter table public.candidate_references
  add constraint candidate_references_rating_ranges
    check (
      (reliability_score is null or reliability_score between 1 and 5)
      and (technical_quality_score is null or technical_quality_score between 1 and 5)
      and (rehire_intent_score is null or rehire_intent_score between 1 and 5)
    );

create index if not exists candidate_references_verification_token_idx
  on public.candidate_references (verification_token);

create index if not exists candidate_references_status_idx
  on public.candidate_references (status);

-- Public can read minimal pending invite by token via security definer RPC
create or replace function public.get_reference_invite(p_token text)
returns table (
  token text,
  status text,
  relationship text,
  reference_name text,
  candidate_title text,
  candidate_tagline text
)
language sql
security definer
set search_path = public
as $$
  select
    cr.verification_token as token,
    cr.status,
    cr.relationship,
    cr.reference_name,
    coalesce(cp.headline, 'MatchLever candidate') as candidate_title,
    coalesce(
      (
        select elem
        from jsonb_array_elements_text(cp.suggested_taglines) as elem
        limit 1
      ),
      'Verified enterprise software talent'
    ) as candidate_tagline
  from public.candidate_references cr
  join public.candidate_profiles cp on cp.id = cr.candidate_profile_id
  where cr.verification_token = p_token
  limit 1;
$$;

revoke all on function public.get_reference_invite(text) from public;
grant execute on function public.get_reference_invite(text) to anon, authenticated;
