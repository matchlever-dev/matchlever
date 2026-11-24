-- Employer can mark a job opening as hired (filled). Matching stops for hired openings.

alter table public.job_postings
  drop constraint if exists job_postings_status_check;

alter table public.job_postings
  add constraint job_postings_status_check
  check (status in ('draft', 'active', 'paused', 'closed', 'hired'));

comment on column public.job_postings.status is
  'Job lifecycle: draft, active, paused, closed, hired (filled — matching stopped).';
