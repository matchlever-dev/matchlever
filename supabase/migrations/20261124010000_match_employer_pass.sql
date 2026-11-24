-- Employer can Accept or Pass a match. Matching stays perpetual (no hard stop at 7).

alter table public.match_handshakes
  add column if not exists employer_response text not null default 'pending',
  add column if not exists passed_at timestamptz;

-- Backfill from existing accepted_at values.
update public.match_handshakes
set employer_response = 'accepted'
where accepted_at is not null
  and employer_response = 'pending';

alter table public.match_handshakes
  drop constraint if exists match_handshakes_employer_response_check;

alter table public.match_handshakes
  add constraint match_handshakes_employer_response_check
  check (employer_response in ('pending', 'accepted', 'passed'));

-- Keep response timestamps consistent with employer_response.
alter table public.match_handshakes
  drop constraint if exists match_handshakes_employer_response_timestamps_check;

alter table public.match_handshakes
  add constraint match_handshakes_employer_response_timestamps_check
  check (
    (employer_response = 'pending' and accepted_at is null and passed_at is null)
    or (employer_response = 'accepted' and accepted_at is not null and passed_at is null)
    or (employer_response = 'passed' and passed_at is not null and accepted_at is null)
  );

create index if not exists match_handshakes_employer_response_idx
  on public.match_handshakes (employer_response);

create index if not exists match_handshakes_passed_at_idx
  on public.match_handshakes (passed_at);

comment on column public.match_handshakes.employer_response is
  'Employer decision on the match email: pending, accepted (LinkedIn sent), or passed.';
comment on column public.match_handshakes.passed_at is
  'When the employer chose Pass on this match (no LinkedIn reveal).';
comment on column public.match_handshakes.billing_status is
  'Per-job billing mark: first match in each 7-match cycle is free; other positions are invoiced. Matching may continue perpetually; cycles repeat at 8, 15, … — no hard stop at 7.';
comment on column public.match_handshakes.invoice_cycle is
  'Bundle cycle number: ceil(match_index / 7). One manual invoice covers matches 2–7 in the cycle. Further cycles are allowed.';
