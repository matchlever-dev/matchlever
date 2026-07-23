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

## Schema (Phase 1)

- `user_profiles` — `is_admin`, `is_superuser`
- `candidate_profiles` — location, timezone, work hours, `suggested_taglines` JSONB
- `candidate_references` — email, LinkedIn, authenticity score/flags
- Helpers: `is_admin()`, `is_superuser()`
- RLS: candidate profiles editable by owner **or** `is_admin = true`
