import {
  COMPANY_SIZES,
  EMPLOYER_USER_ROLES,
  WORK_ARRANGEMENTS,
  employerStatusLabel,
} from "@/lib/employer/waitlist-schema";
import type { EmployerBillingProfile } from "@/lib/employer/billing";
import {
  formatJobLocationLine,
  jobOpeningStatusLabel,
} from "@/lib/employer/job-opening-schema";

export type EmployerJobSummary = {
  id: string;
  title: string;
  status: string;
  locationModes: string[];
  globalCity: string | null;
  minSalary: number | null;
  acceptedMatchCount: number;
  matchBundlePurchasedAt: string | null;
  updatedAt: string;
};

export type EmployerDashboardData = {
  demo: boolean;
  profile: {
    id: string;
    companyName: string;
    title: string | null;
    status: string;
    userRole: string | null;
    companyWebsite: string | null;
    industry: string | null;
    companySize: string | null;
    estimatedRoles: number | null;
    hiringDepartments: string[];
    workArrangement: string | null;
    firstMatchFreeClaimed: boolean;
    createdAt: string;
    updatedAt: string;
  };
  billing: EmployerBillingProfile;
  jobs: EmployerJobSummary[];
  user: {
    fullName: string | null;
    email: string | null;
    avatarUrl: string | null;
    linkedinUrl: string | null;
    role: string;
    isAdmin: boolean;
    isSuperuser: boolean;
    hasTalentProfile: boolean;
  };
};

export const DEMO_EMPLOYER_JOBS: EmployerJobSummary[] = [
  {
    id: "demo-job-1",
    title: "Staff Platform Engineer",
    status: "active",
    locationModes: ["hybrid"],
    globalCity: "San Francisco",
    minSalary: 180000,
    acceptedMatchCount: 0,
    matchBundlePurchasedAt: null,
    updatedAt: "2026-09-01T12:00:00.000Z",
  },
  {
    id: "demo-job-2",
    title: "Data Platform Lead",
    status: "draft",
    locationModes: ["remote"],
    globalCity: null,
    minSalary: 160000,
    acceptedMatchCount: 0,
    matchBundlePurchasedAt: null,
    updatedAt: "2026-09-10T12:00:00.000Z",
  },
];

export const DEMO_EMPLOYER_DASHBOARD: EmployerDashboardData = {
  demo: true,
  profile: {
    id: "demo-employer-1",
    companyName: "Acme Systems",
    title: "Head of Talent",
    status: "active",
    userRole: "recruiter",
    companyWebsite: "https://acme.example.com",
    industry: "Enterprise Software",
    companySize: "51-200",
    estimatedRoles: 4,
    hiringDepartments: ["Engineering", "Product"],
    workArrangement: "hybrid",
    firstMatchFreeClaimed: true,
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
  },
  billing: {
    createdAt: "2026-07-01T12:00:00.000Z",
    freeMatchesUsed: 0,
    firstMatchFreeClaimed: true,
    hasPaymentMethod: false,
    apInvoicingEmail: null,
    poNumber: null,
    stripePaymentMethodBrand: null,
    stripePaymentMethodLast4: null,
  },
  jobs: DEMO_EMPLOYER_JOBS,
  user: {
    fullName: "Jordan Lee",
    email: "jordan.employer@acme.io",
    avatarUrl: null,
    linkedinUrl: "https://www.linkedin.com/in/jordan-lee",
    role: "employer",
    isAdmin: false,
    isSuperuser: false,
    hasTalentProfile: false,
  },
};

export function employerStatusHeadline(status: string): string {
  switch (status) {
    case "waitlisted":
      return "You are on the Employer Soft Launch waitlist";
    case "active":
      return "Your employer account is active";
    case "on_hold":
      return "Your employer account is on hold";
    case "inactive":
      return "Your employer account is inactive";
    default:
      return "Employer profile";
  }
}

export function employerStatusDescription(status: string): string {
  switch (status) {
    case "waitlisted":
      return "Our team is verifying employer accounts and onboarding hiring teams in batches. We will email you when your account is activated.";
    case "active":
      return "Post jobs, review incognito talent matches, and accept high-confidence introductions.";
    case "on_hold":
      return "Account access is temporarily paused. Contact support if you believe this is an error.";
    case "inactive":
      return "This employer account has been deactivated.";
    default:
      return "";
  }
}

export function employerUserRoleLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return (
    EMPLOYER_USER_ROLES.find((role) => role.value === value)?.label ?? value
  );
}

export function employerCompanySizeLabel(
  value: string | null | undefined
): string {
  if (!value) return "—";
  return COMPANY_SIZES.find((size) => size.value === value)?.label ?? value;
}

export function employerWorkArrangementLabel(
  value: string | null | undefined
): string {
  if (!value) return "—";
  return (
    WORK_ARRANGEMENTS.find((item) => item.value === value)?.label ?? value
  );
}

export function formatSalary(value: number | null | undefined): string {
  if (value == null) return "Salary TBD";
  return `$${value.toLocaleString()}+`;
}

export {
  employerStatusLabel,
  formatJobLocationLine,
  jobOpeningStatusLabel,
};
