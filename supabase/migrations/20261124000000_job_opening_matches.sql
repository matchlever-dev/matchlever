-- Job opening matches: track accept state, billing marks, and email accept tokens.

alter table public.match_handshakes
  add column if not exists match_source text not null default 'manual',
  add column if not exists match_index integer,
  add column if not exists billing_status text,
  add column if not exists invoice_cycle integer,
  add column if not exists accepted_at timestamptz,
  add column if not exists accept_token text,
  add column if not exists employer_notified_at timestamptz,
  add column if not exists linkedin_sent_at timestamptz;

-- Backfill existing rows so new constraints can apply.
with ranked as (
  select
    id,
    row_number() over (
      partition by job_posting_id
      order by created_at asc, id asc
    ) as rn
  from public.match_handshakes
)
update public.match_handshakes mh
set
  match_index = ranked.rn,
  billing_status = case
    when ((ranked.rn - 1) % 7) = 0 then 'free'
    else 'invoiced'
  end,
  invoice_cycle = ((ranked.rn - 1) / 7) + 1,
  accept_token = coalesce(mh.accept_token, replace(gen_random_uuid()::text, '-', '')),
  match_source = case
    when mh.is_manual_match then 'manual'
    else coalesce(mh.match_source, 'manual')
  end
from ranked
where mh.id = ranked.id
  and (
    mh.match_index is null
    or mh.billing_status is null
    or mh.invoice_cycle is null
    or mh.accept_token is null
  );

alter table public.match_handshakes
  alter column match_index set not null,
  alter column billing_status set not null,
  alter column invoice_cycle set not null,
  alter column accept_token set not null;

alter table public.match_handshakes
  drop constraint if exists match_handshakes_match_source_check;

alter table public.match_handshakes
  add constraint match_handshakes_match_source_check
  check (match_source in ('manual', 'ai'));

alter table public.match_handshakes
  drop constraint if exists match_handshakes_billing_status_check;

alter table public.match_handshakes
  add constraint match_handshakes_billing_status_check
  check (billing_status in ('free', 'invoiced'));

alter table public.match_handshakes
  drop constraint if exists match_handshakes_match_index_check;

alter table public.match_handshakes
  add constraint match_handshakes_match_index_check
  check (match_index >= 1);

alter table public.match_handshakes
  drop constraint if exists match_handshakes_invoice_cycle_check;

alter table public.match_handshakes
  add constraint match_handshakes_invoice_cycle_check
  check (invoice_cycle >= 1);

create unique index if not exists match_handshakes_accept_token_uidx
  on public.match_handshakes (accept_token);

create index if not exists match_handshakes_billing_status_idx
  on public.match_handshakes (billing_status);

create index if not exists match_handshakes_accepted_at_idx
  on public.match_handshakes (accepted_at);

comment on column public.match_handshakes.match_source is
  'How the match was created: manual (concierge) or ai (engine stub).';
comment on column public.match_handshakes.match_index is
  '1-based ordinal of this match on the job opening (drives free vs invoiced).';
comment on column public.match_handshakes.billing_status is
  'Per-job billing mark: first match in each 7-match cycle is free; matches 2–7 are invoiced (manual invoice).';
comment on column public.match_handshakes.invoice_cycle is
  'Bundle cycle number: ceil(match_index / 7). One manual invoice covers matches 2–7 in the cycle.';
comment on column public.match_handshakes.accepted_at is
  'When the employer accepted the match (reveals LinkedIn).';
comment on column public.match_handshakes.accept_token is
  'Opaque token embedded in the employer match email Accept button.';
comment on column public.match_handshakes.employer_notified_at is
  'When the incognito profile email was sent to the employer.';
comment on column public.match_handshakes.linkedin_sent_at is
  'When the talent LinkedIn URL was emailed after Accept.';

-- Replace legacy hirer-based update policy with employer_profiles + staff.
drop policy if exists "Admins or hirers can update match handshakes" on public.match_handshakes;
drop policy if exists "Employers can accept own job matches" on public.match_handshakes;
create policy "Staff or employers can update match handshakes"
  on public.match_handshakes
  for update
  to authenticated
  using (
    public.is_admin()
    or public.is_superuser()
    or exists (
      select 1
      from public.job_postings jp
      join public.employer_profiles ep on ep.id = jp.employer_profile_id
      where jp.id = job_posting_id and ep.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or public.is_superuser()
    or exists (
      select 1
      from public.job_postings jp
      join public.employer_profiles ep on ep.id = jp.employer_profile_id
      where jp.id = job_posting_id and ep.user_id = auth.uid()
    )
  );
