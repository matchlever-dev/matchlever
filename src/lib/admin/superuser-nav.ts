/** Shared Superuser Portal navigation links. */
export const SUPERUSER_LINKS = [
  { href: "/superuser/talent", label: "Talent" },
  { href: "/superuser/employers", label: "Employers" },
  { href: "/superuser/job-openings", label: "Job Openings" },
] as const;

export type SuperuserNavLink = (typeof SUPERUSER_LINKS)[number];
