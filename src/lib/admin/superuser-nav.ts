/** Shared Superuser Portal navigation links. */
export const SUPERUSER_LINKS = [
  { href: "/superuser/talent", label: "Talent" },
  { href: "/superuser/job-openings", label: "Job Openings" },
  { href: "/superuser/manual-match", label: "Manual Match" },
] as const;

export type SuperuserNavLink = (typeof SUPERUSER_LINKS)[number];
