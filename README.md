# MatchLever

Enterprise Software Talent Exchange — Phase 1 foundation on Next.js 15 (App Router), Tailwind CSS, shadcn/ui, and Supabase.

## Stack

- Next.js 15 App Router + TypeScript
- Tailwind CSS v4 with MatchLever brand tokens
- shadcn/ui
- Supabase Auth + Postgres (RLS)

## Brand colors

| Token | Hex | Usage |
| --- | --- | --- |
| Primary Slate Blue | `#2B5B84` | `bg-brand-primary`, `bg-primary` |
| Accent Terracotta | `#E87A5D` | `bg-brand-accent`, `bg-accent` |
| Warm Gray Canvas | `#F8F9FA` | `bg-brand-canvas`, `bg-background` |
| Dark Charcoal | `#2A2D34` | `text-brand-charcoal`, `text-foreground` |

## Setup

```bash
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

Apply the SQL migration in the Supabase SQL editor (or via Supabase CLI):

```bash
supabase db push
# or paste supabase/migrations/20260723000000_phase1_profiles_rls.sql
```

## Supabase clients

| Import | Use in |
| --- | --- |
| `@/lib/supabase/client` | Client Components |
| `@/lib/supabase/server` | Server Components & Route Handlers |
| `@/lib/supabase/server-action` | Server Actions |

Session refresh runs in `src/middleware.ts`.

## Resume sanitize API

`POST /api/candidate/sanitize` accepts multipart form field `resume` (PDF or DOCX), strips PII via Groq, and returns:

```json
{
  "anonymous_title": "Senior Backend Engineer",
  "sanitized_summary": "...",
  "verified_skills": ["TypeScript", "PostgreSQL"],
  "years_experience": 8,
  "suggested_taglines": ["...", "...", "..."]
}
```

```bash
curl -X POST http://localhost:3000/api/candidate/sanitize \
  -F "resume=@./path/to/resume.pdf"
```

Requires `GROQ_API_KEY` in `.env.local`.

## Landing & onboarding

- `/` — hero, featured candidate carousel (timezone / work-hour overlap), seeker + hirer CTAs, hirer waitlist modal
- `/onboarding` — 4-step seeker wizard (Terms of Service → LinkedIn + Incognito → resume sanitize → global prefs + taglines → references)
- `/legal/seekers` — Job Seeker Terms of Service (PDF + readable page; required before account creation)
- `/reference/[token]` — mobile reference verification (identity → 7 superpowers → ratings → endorsement)
- `/dashboard/seeker` — anonymous employer card, availability toggle, reference tracker + Resend, edit/delete

## Seeker dashboard

`/dashboard/seeker` shows the employer-facing anonymous card (initials, AI tagline, verified skills, location/timezone, reference progress), an **Actively Looking / On Hold** toggle (writes `candidate_profiles.status`), Resend-powered **Resend Link** for pending references, plus Edit Profile and Delete Account.

Env for invite email:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (e.g. `MatchLever <onboarding@resend.dev>`)
- `NEXT_PUBLIC_APP_URL`

Optional LinkedIn enrichment (full connection / job / photo / activity checks):

- `LINKEDIN_ENRICHMENT_URL`
- `LINKEDIN_ENRICHMENT_API_KEY`

Without an enrichment provider, referrer LinkedIn checks use public probes plus structural gates. Failures always surface as the opaque message **Referrer LinkedIn profile invalid**. At verification time, the referrer’s LinkedIn must also match the URL the seeker provided.

Without Supabase auth configured, the page runs in demo mode with sample data.

Onboarding completion (`POST /api/onboarding/complete`) requires a signed-in user, upserts `candidate_profiles`, creates 3 `candidate_references` with email + LinkedIn URL + tokens, validates LinkedIn profiles, and emails invite links via Resend.

## Admin & Superuser portals

Middleware gates:

- `/admin/*` requires `user_profiles.is_admin = true` (superusers also pass)
- `/superuser/*` requires `user_profiles.is_superuser = true`

Routes:

- `/admin/users` — toggle `is_admin` / `is_superuser` switches
- `/admin/candidates` — resume vs sanitized tabs, location/hours, reference authenticity audit, status override / delete
- `/superuser/directory` — searchable Seekers + Hirers directory
- `/superuser/manual-match` — Concierge Match into a job Kanban (`match_handshakes.is_manual_match = true`)

Apply `supabase/migrations/20260723030000_admin_superuser_portals.sql` for hirers, jobs, handshakes, and resume audit fields. Without Supabase, portals run in demo mode.

## Schema (Phase 1)

- `user_profiles` — `is_admin`, `is_superuser`, `role`
- `candidate_profiles` — location, timezone, work hours, `suggested_taglines` JSONB, `status`, `selected_tagline`, `verified_skills`, `raw_resume_text`, `sanitized_summary`
- `candidate_references` — email, LinkedIn, authenticity score/flags
- `hirer_profiles`, `job_postings`, `match_handshakes` (`is_manual_match`)
- Helpers: `is_admin()`, `is_superuser()`
- RLS: candidate profiles editable by owner **or** `is_admin = true`
