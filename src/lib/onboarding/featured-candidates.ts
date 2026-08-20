export type FeaturedCandidate = {
  id: string;
  anonymousTitle: string;
  tagline: string;
  skills: string[];
  timezone: string;
  timezoneLabel: string;
  workHours: string;
  overlapBadge: string;
  overlapHours: number;
  yearsExperience: number;
  locationMode: "Remote" | "Hybrid" | "Onsite";
};

export const FEATURED_CANDIDATES: FeaturedCandidate[] = [
  {
    id: "1",
    anonymousTitle: "Staff Platform Engineer",
    tagline: "Cut p99 latency 62% on a multi-region event bus",
    skills: ["Go", "Kubernetes", "Kafka"],
    timezone: "America/Los_Angeles",
    timezoneLabel: "US Pacific (UTC−8)",
    workHours: "09:00–17:00",
    overlapBadge: "6h overlap with EST",
    overlapHours: 6,
    yearsExperience: 11,
    locationMode: "Remote",
  },
  {
    id: "2",
    anonymousTitle: "Senior Full-Stack Engineer",
    tagline: "Shipped B2B checkout that lifted conversion 28%",
    skills: ["TypeScript", "React", "PostgreSQL"],
    timezone: "Europe/Berlin",
    timezoneLabel: "Central Europe (UTC+1)",
    workHours: "08:00–16:00",
    overlapBadge: "5h overlap with EST",
    overlapHours: 5,
    yearsExperience: 8,
    locationMode: "Hybrid",
  },
  {
    id: "3",
    anonymousTitle: "Principal Data Engineer",
    tagline: "Rebuilt warehouse pipelines — $1.4M annual cloud savings",
    skills: ["Python", "Spark", "dbt"],
    timezone: "America/New_York",
    timezoneLabel: "US Eastern (UTC−5)",
    workHours: "10:00–18:00",
    overlapBadge: "8h overlap with EST",
    overlapHours: 8,
    yearsExperience: 14,
    locationMode: "Remote",
  },
  {
    id: "4",
    anonymousTitle: "Senior Security Engineer",
    tagline: "Zero-trust rollout across 40+ services, 0 sev-1s in 9 months",
    skills: ["AWS", "Terraform", "IAM"],
    timezone: "Asia/Kolkata",
    timezoneLabel: "India (UTC+5:30)",
    workHours: "13:00–21:00",
    overlapBadge: "4h overlap with EST",
    overlapHours: 4,
    yearsExperience: 10,
    locationMode: "Remote",
  },
  {
    id: "5",
    anonymousTitle: "Staff Mobile Engineer",
    tagline: "Grew MAU 3.2× while dropping crash rate below 0.1%",
    skills: ["Swift", "Kotlin", "GraphQL"],
    timezone: "Europe/London",
    timezoneLabel: "London (UTC+0)",
    workHours: "09:00–17:00",
    overlapBadge: "5h overlap with EST",
    overlapHours: 5,
    yearsExperience: 9,
    locationMode: "Hybrid",
  },
];
