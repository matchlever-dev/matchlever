-- Expose seeker-provided LinkedIn URL on reference invite load so the
-- referrer can confirm the same profile (mismatch = opaque invalid).

create or replace function public.get_reference_invite(p_token text)
returns table (
  token text,
  status text,
  relationship text,
  reference_name text,
  reference_linkedin_url text,
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
    cr.reference_linkedin_url,
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
