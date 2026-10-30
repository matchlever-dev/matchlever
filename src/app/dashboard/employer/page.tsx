import { EmployerDashboard } from "@/components/dashboard/employer-dashboard";

export const metadata = {
  title: "Employer Dashboard | MatchLever",
  description: "Manage your MatchLever employer account and hiring pipeline.",
};

export default function Page() {
  return <EmployerDashboard />;
}
