-- Recipients who asked not to receive automated MatchLever emails.
-- Keyed by email so referrers (no user account) and candidates are covered.

create table public.email_unsubscribes (
  email text primary key,
  unsubscribed_at timestamptz not null default now(),
  constraint email_unsubscribes_email_format
    check (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

comment on table public.email_unsubscribes is
  'Emails that must not receive automated MatchLever messages (reference invites, profile reminders).';

create index email_unsubscribes_unsubscribed_at_idx
  on public.email_unsubscribes (unsubscribed_at desc);

alter table public.email_unsubscribes enable row level security;

-- Writes and reads go through the service-role API after a signed unsubscribe token.
-- No anon/authenticated policies on purpose.
