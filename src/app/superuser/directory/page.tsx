import { redirect } from "next/navigation";

/** Legacy Directory route → Candidates profiles. */
export default function Page() {
  redirect("/superuser/candidates");
}
