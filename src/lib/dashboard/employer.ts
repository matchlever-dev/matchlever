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
  user: {
    fullName: string | null;
    email: string | null;
    linkedinUrl: string | null;
    role: string;
    isAdmin: boolean;
    isSuperuser: boolean;
  };
};

export const DEMO_EMPLOYER_DASHBOARD: EmployerDashboardData = {
  demo: true,
  profile: {
    id: "demo-employer-1",
    companyName: "Acme Systems",
    title: "Head of Talent",
    status: "waitlisted",
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
  user: {
    fullName: "Jordan Lee",
    email: "jordan.employer@acme.io",
    linkedinUrl: "https://www.linkedin.com/in/jordan-lee",
    role: "employer",
    isAdmin: false,
    isSuperuser: false,
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
      return "Employer dashboard";
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
