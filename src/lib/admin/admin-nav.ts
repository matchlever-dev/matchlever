/** Shared Admin Portal navigation links. */
export const ADMIN_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/talent", label: "Talent" },
  { href: "/admin/employers", label: "Employers" },
  { href: "/admin/contact", label: "Contact" },
  { href: "/admin/site-copy", label: "Site copy" },
] as const;

export type AdminNavLink = (typeof ADMIN_LINKS)[number];
