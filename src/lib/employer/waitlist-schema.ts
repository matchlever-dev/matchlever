import { z } from "zod";

export const EMPLOYER_USER_ROLES = [
  { value: "recruiter", label: "In-House Recruiter / Talent Acquisition" },
  { value: "hiring_manager", label: "Hiring Manager" },
] as const;

export const COMPANY_SIZES = [
  { value: "1-10", label: "1–10" },
  { value: "11-50", label: "11–50" },
  { value: "51-200", label: "51–200" },
  { value: "201+", label: "201+" },
] as const;

export const HIRING_DEPARTMENTS = [
  "Engineering",
  "Product",
  "Sales",
  "Marketing",
  "Design",
  "Operations",
  "Finance",
  "Customer Success",
  "Other",
] as const;

export const WORK_ARRANGEMENTS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
  { value: "mixed", label: "Mixed / varies by role" },
] as const;

export const EMPLOYER_STATUSES = [
  "waitlisted",
  "active",
  "on_hold",
  "inactive",
] as const;

export type EmployerStatus = (typeof EMPLOYER_STATUSES)[number];

export const employerWaitlistSchema = z.object({
  userRole: z.enum(["recruiter", "hiring_manager"]),
  companyWebsite: z.string().url("Enter a valid company website URL"),
  industry: z.string().min(1, "Industry is required"),
  companySize: z.enum(["1-10", "11-50", "51-200", "201+"]),
  estimatedRoles: z.number().int().min(1).max(500),
  hiringDepartments: z
    .array(z.string())
    .min(1, "Select at least one department"),
  workArrangement: z.enum(["remote", "hybrid", "onsite", "mixed"]),
  firstMatchFreeClaimed: z.literal(true),
});

export type EmployerWaitlistValues = z.infer<typeof employerWaitlistSchema>;

export function employerStatusLabel(status: string): string {
  switch (status) {
    case "waitlisted":
      return "Waitlisted";
    case "active":
      return "Active";
    case "on_hold":
      return "On Hold";
    case "inactive":
      return "Inactive";
    default:
      return status.replaceAll("_", " ");
  }
}
