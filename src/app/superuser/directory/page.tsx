import { redirect } from "next/navigation";

/** Legacy Directory route → Talent profiles. */
export default function Page() {
  redirect("/superuser/talent");
}
