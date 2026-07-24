import { redirect } from "next/navigation";

export default function SuperuserIndexPage() {
  redirect("/superuser/directory");
}
