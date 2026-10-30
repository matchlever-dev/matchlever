-- Editable FAQ items for public FAQ page and admin portal

create table public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  constraint faq_items_question_length
    check (char_length(trim(question)) between 1 and 500),
  constraint faq_items_answer_length
    check (char_length(trim(answer)) between 1 and 10000)
);

comment on table public.faq_items is
  'Ordered FAQ question/answer pairs editable from the admin portal.';

create index faq_items_sort_order_idx on public.faq_items (sort_order);

drop trigger if exists faq_items_set_updated_at on public.faq_items;
create trigger faq_items_set_updated_at
  before update on public.faq_items
  for each row execute function public.set_updated_at();

insert into public.faq_items (question, answer, sort_order)
values
  (
    'What is MatchLever and what is it for?',
    'We are a dual-sided marketplace built by Arise Solutions LLC to connect top-tier candidates with hiring organizations. Our platform is designed to generate precise career matches with zero search fatigue—meaning no endless scrolling or firing resumes into the void. Employers only pay when they find a match.',
    0
  ),
  (
    'What are the main advantages?',
    E'Zero Bias: Our AI Sanitizer Engine automatically strips all Personally Identifiable Information (PII) from your uploaded resume, including your full name, university, and past employer names.\n\nSuperpower Taglines: Instead of vague cover letters, our AI evaluates your verified tech stack to generate three metrics-driven "Superpower Taglines" for you to choose from.\n\nSmart Matching: Our Two-Tier Match Engine filters by hard dealbreakers (minimum salary, work authorization) and semantic alignment (daily working hours overlap) to ensure we only surface relevant roles.',
    1
  ),
  (
    'What problems do these features address?',
    E'Candidates - Sending thousands of applications and get no interview?  We ensure that the job best suited you will find you.\n\nEmployers: Tired of going thru hundreds of AI-modified resumes for one job opening?  Never missed that perfect match to your opening again!\n\nMismatch: The worst problem is finding the candidate not really suited after rounds of interviews, or failing to provide legimate references!!!  MatchLever candidates are already vetted AND you only see those with matching characteristics, which vastly increase the chance of a successful hire with less effort and time.',
    2
  ),
  (
    'Is my data private?',
    E'Not only do we have industry-standard data privacy and security protection, we go one step beyond by operating on Incognito Privacy Mode!  Your identity remains completely anonymous to employers on your profiles unless they decide to go to next step with you.  Your contact email, real name, and original resume are only revealed after an employer accepts your match to advance you to the interview stage.  Hit the "On Hold (Snoozed)" toggle to vanish from employer searches, or use the "Delete Account" button to wipe your data permanently.',
    3
  ),
  (
    'Why do you require reference checks?',
    'Because your profile is completely anonymous, we need to prove you are as good as your stats. We use a peer-validated system where you provide three email addresses for former managers or peers. Our Multi-Signal AI Authenticity Scoring Matrix analyzes their LinkedIn profiles to check for bot-farm patterns and account maturity. It keeps platform trust high and ensures real professionals are vouching for your work.',
    4
  ),
  (
    'What happens next after I set up my profile?',
    E'1. References: Make sure your references respond to reference check requests, see further actions in the next question.\n\n2.Match: Once your profile is completed and references checked out, AI and Concierge evaluation.Your anonymous profile is evaluated automatically by our Two-Tier Match Engine, or manually pushed to employer Kanban boards by our Concierge Superusers.\n\n3.Unlock & Interview: When an employer decides you are a fit, they pay to unlock your profile. Your identity is revealed, and you head straight into the interview stage.',
    5
  ),
  (
    'How do I make sure references responds?',
    E'First of all, make sure these are legit reference that know you and will vouch for you.\n\nAlso, be sure to let the references know that NO ONE will actually speak to them right away.  They just need to respond to an email with a few questions, which shouldn''t take more than a couple of minutes.\n\nFinally, if they do not receive reference validation emails a few minutes after you submit your profile, please ask them to check their Spam/Junk folder for an email from MatchLever.',
    6
  );

alter table public.faq_items enable row level security;

create policy "Anyone can read FAQ items"
  on public.faq_items
  for select
  to anon, authenticated
  using (true);

create policy "Admins can insert FAQ items"
  on public.faq_items
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update FAQ items"
  on public.faq_items
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete FAQ items"
  on public.faq_items
  for delete
  to authenticated
  using (public.is_admin());
