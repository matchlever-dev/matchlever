-- Contact Us submissions + private attachment storage bucket

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  topic text not null,
  message text not null,
  attachment_url text,
  admin_notes text,
  status text not null default 'New',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_requests_email_format
    check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  constraint contact_requests_message_length
    check (char_length(message) between 1 and 300),
  constraint contact_requests_topic_length
    check (char_length(topic) between 1 and 120),
  constraint contact_requests_status_check
    check (status in ('New', 'Active', 'Closed'))
);

comment on table public.contact_requests is
  'Public Contact Us form submissions managed by admins.';
comment on column public.contact_requests.attachment_url is
  'Storage object path in the contact-attachments bucket (not a public URL).';
comment on column public.contact_requests.status is
  'Workflow status: New, Active, or Closed.';

create index contact_requests_created_at_idx
  on public.contact_requests (created_at desc);

create index contact_requests_status_idx
  on public.contact_requests (status);

drop trigger if exists contact_requests_set_updated_at on public.contact_requests;
create trigger contact_requests_set_updated_at
  before update on public.contact_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.contact_requests enable row level security;

-- Public inserts go through the service-role API route; no anon insert policy.
-- Authenticated admins may read and update via the user-scoped client.

create policy "Admins can view contact requests"
  on public.contact_requests
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can update contact requests"
  on public.contact_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage bucket for optional .png / .jpg / .pdf attachments (max 5MB enforced in API)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contact-attachments',
  'contact-attachments',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Service role uploads from the API; admins may read objects for download links.

create policy "Admins can read contact attachments"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'contact-attachments'
    and public.is_admin()
  );
