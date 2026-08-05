/** Shared demo payloads + helpers for admin / superuser portals. */

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_admin: boolean;
  is_superuser: boolean;
  created_at: string;
};

export type AdminReferenceRow = {
  id: string;
  reference_email: string;
  reference_linkedin_url: string | null;
  authenticity_score: number | null;
  authenticity_flags: string[];
  status: string;
  lowTrust: boolean;
};

export type AdminCandidateRow = {
  id: string;
  user_id: string;
  headline: string | null;
  status: string;
  global_city: string | null;
  global_country: string | null;
  timezone_offset: number | null;
  work_hours_start: string | null;
  work_hours_end: string | null;
  raw_resume_text: string | null;
  sanitized_summary: string | null;
  email: string | null;
  full_name: string | null;
  references: AdminReferenceRow[];
};

export type DirectoryPerson = {
  id: string;
  kind: "seeker" | "hirer";
  email: string | null;
  full_name: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  status: string | null;
  created_at: string;
};

export type ActiveJobPosting = {
  id: string;
  title: string;
  company_name: string | null;
  status: string;
  kanban_columns: string[];
  hirer_name: string | null;
};

export type ActiveCandidateOption = {
  id: string;
  headline: string | null;
  email: string | null;
  full_name: string | null;
  status: string;
};

export const LOW_TRUST_AUTHENTICITY_THRESHOLD = 55;

export function isLowTrustScore(
  score: number | null,
  flags: unknown
): boolean {
  const flagCount = Array.isArray(flags) ? flags.length : 0;
  if (score === null || score === undefined) return flagCount > 0;
  return score < LOW_TRUST_AUTHENTICITY_THRESHOLD || flagCount > 0;
}

export const DEMO_ADMIN_USERS: AdminUserRow[] = [
  {
    id: "user-1",
    email: "alex@matchlever.demo",
    full_name: "Alex Rivera",
    role: "staff",
    is_admin: true,
    is_superuser: true,
    created_at: "2026-06-01T12:00:00.000Z",
  },
  {
    id: "user-2",
    email: "sam.seeker@example.com",
    full_name: "Sam Patel",
    role: "candidate",
    is_admin: false,
    is_superuser: false,
    created_at: "2026-06-12T15:30:00.000Z",
  },
  {
    id: "user-3",
    email: "jordan.hirer@acme.io",
    full_name: "Jordan Lee",
    role: "recruiter",
    is_admin: false,
    is_superuser: false,
    created_at: "2026-06-18T09:10:00.000Z",
  },
  {
    id: "user-4",
    email: "ops@matchlever.demo",
    full_name: "Casey Ops",
    role: "staff",
    is_admin: true,
    is_superuser: false,
    created_at: "2026-07-01T11:00:00.000Z",
  },
];

export const DEMO_ADMIN_CANDIDATES: AdminCandidateRow[] = [
  {
    id: "cand-1",
    user_id: "user-2",
    headline: "Staff Platform Engineer",
    status: "actively_looking",
    global_city: "Austin",
    global_country: "United States",
    timezone_offset: -300,
    work_hours_start: "09:00:00",
    work_hours_end: "17:00:00",
    raw_resume_text:
      "Sam Patel\nsam.seeker@example.com\n+1 512-555-0199\nBuilt Kafka pipelines at Acme…",
    sanitized_summary:
      "Staff platform engineer who cut p99 latency 62% on a multi-region event bus.",
    email: "sam.seeker@example.com",
    full_name: "Sam Patel",
    references: [
      {
        id: "ref-a",
        reference_email: "manager.one@example.com",
        reference_linkedin_url: "https://linkedin.com/in/manager-one",
        authenticity_score: 88,
        authenticity_flags: [],
        status: "verified",
        lowTrust: false,
      },
      {
        id: "ref-b",
        reference_email: "peer.two@example.com",
        reference_linkedin_url: "https://linkedin.com/in/peer-two",
        authenticity_score: 41,
        authenticity_flags: ["linkedin_mismatch", "tenure_gap"],
        status: "verified",
        lowTrust: true,
      },
    ],
  },
  {
    id: "cand-2",
    user_id: "user-5",
    headline: "Senior Backend Engineer",
    status: "on_hold",
    global_city: "Berlin",
    global_country: "Germany",
    timezone_offset: 120,
    work_hours_start: "10:00:00",
    work_hours_end: "18:00:00",
    raw_resume_text: "Resume PDF extract with personal identifiers…",
    sanitized_summary:
      "Backend engineer specializing in Postgres performance and API design.",
    email: "taylor@example.com",
    full_name: "Taylor Nguyen",
    references: [
      {
        id: "ref-c",
        reference_email: "dir@example.com",
        reference_linkedin_url: null,
        authenticity_score: null,
        authenticity_flags: ["awaiting_linkedin"],
        status: "pending",
        lowTrust: true,
      },
    ],
  },
];

export const DEMO_DIRECTORY: DirectoryPerson[] = [
  {
    id: "dir-s1",
    kind: "seeker",
    email: "sam.seeker@example.com",
    full_name: "Sam Patel",
    title: "Staff Platform Engineer",
    company: null,
    location: "Austin, United States",
    status: "actively_looking",
    created_at: "2026-06-12T15:30:00.000Z",
  },
  {
    id: "dir-s2",
    kind: "seeker",
    email: "taylor@example.com",
    full_name: "Taylor Nguyen",
    title: "Senior Backend Engineer",
    company: null,
    location: "Berlin, Germany",
    status: "on_hold",
    created_at: "2026-06-20T10:00:00.000Z",
  },
  {
    id: "dir-h1",
    kind: "hirer",
    email: "jordan.hirer@acme.io",
    full_name: "Jordan Lee",
    title: "VP Engineering",
    company: "Acme Systems",
    location: "San Francisco, United States",
    status: "active",
    created_at: "2026-06-18T09:10:00.000Z",
  },
  {
    id: "dir-h2",
    kind: "hirer",
    email: "priya@northwind.dev",
    full_name: "Priya Shah",
    title: "Head of Talent",
    company: "Northwind",
    location: "Toronto, Canada",
    status: "active",
    created_at: "2026-07-02T14:00:00.000Z",
  },
];

export const DEMO_ACTIVE_JOBS: ActiveJobPosting[] = [
  {
    id: "job-1",
    title: "Staff Platform Engineer",
    company_name: "Acme Systems",
    status: "active",
    kanban_columns: ["sourced", "screening", "interview", "offer", "hired"],
    hirer_name: "Jordan Lee",
  },
  {
    id: "job-2",
    title: "Senior Backend Engineer",
    company_name: "Northwind",
    status: "active",
    kanban_columns: ["sourced", "screening", "interview", "offer", "hired"],
    hirer_name: "Priya Shah",
  },
];

export const DEMO_ACTIVE_CANDIDATES: ActiveCandidateOption[] =
  DEMO_ADMIN_CANDIDATES.filter((c) => c.status === "actively_looking").map(
    (c) => ({
      id: c.id,
      headline: c.headline,
      email: c.email,
      full_name: c.full_name,
      status: c.status,
    })
  );

export type DemoContactRequest = {
  id: string;
  email: string;
  topic: string;
  message: string;
  attachment_url: string | null;
  attachment_download_url: string | null;
  admin_notes: string | null;
  status: "New" | "Active" | "Closed";
  created_at: string;
  updated_at: string;
};

export const DEMO_CONTACT_REQUESTS: DemoContactRequest[] = [
  {
    id: "contact-1",
    email: "jane@example.com",
    topic: "Report an issue",
    message:
      "I can't finish onboarding — the references step keeps spinning after I hit send.",
    attachment_url: "contact-1/screenshot.png",
    attachment_download_url: null,
    admin_notes: null,
    status: "New",
    created_at: "2026-07-27T18:22:00.000Z",
    updated_at: "2026-07-27T18:22:00.000Z",
  },
  {
    id: "contact-2",
    email: "ops@acme.io",
    topic: "Partnership",
    message:
      "We're a 40-person hiring team interested in early hirer access this quarter.",
    attachment_url: null,
    attachment_download_url: null,
    admin_notes: "Forwarded to partnerships — waiting on calendar hold.",
    status: "Active",
    created_at: "2026-07-25T11:05:00.000Z",
    updated_at: "2026-07-26T09:40:00.000Z",
  },
  {
    id: "contact-3",
    email: "sam.seeker@example.com",
    topic: "Account help",
    message: "Please confirm whether deleting my seeker profile also removes references.",
    attachment_url: null,
    attachment_download_url: null,
    admin_notes: "Replied with privacy FAQ link.",
    status: "Closed",
    created_at: "2026-07-20T14:12:00.000Z",
    updated_at: "2026-07-21T08:00:00.000Z",
  },
];
