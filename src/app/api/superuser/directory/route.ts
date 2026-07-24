import { NextResponse } from "next/server";

import { requireSuperuserApi } from "@/lib/auth/api-guards";
import { DEMO_DIRECTORY, type DirectoryPerson } from "@/lib/admin/demo";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const auth = await requireSuperuserApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  if (auth.actor.demo) {
    const people = filterDirectory(DEMO_DIRECTORY, q);
    return NextResponse.json({ demo: true, people });
  }

  const supabase = await createClient();

  const [{ data: candidates }, { data: hirers }] = await Promise.all([
    supabase
      .from("candidate_profiles")
      .select(
        "id, headline, status, global_city, global_country, created_at, user_id"
      ),
    supabase
      .from("hirer_profiles")
      .select(
        "id, company_name, title, global_city, global_country, created_at, user_id"
      ),
  ]);

  const userIds = [
    ...new Set([
      ...(candidates ?? []).map((c) => c.user_id),
      ...(hirers ?? []).map((h) => h.user_id),
    ]),
  ];

  const { data: users } = userIds.length
    ? await supabase
        .from("user_profiles")
        .select("id, email, full_name")
        .in("id", userIds)
    : { data: [] as { id: string; email: string | null; full_name: string | null }[] };

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  const people: DirectoryPerson[] = [
    ...(candidates ?? []).map((c) => {
      const user = userMap.get(c.user_id);
      const location = [c.global_city, c.global_country]
        .filter(Boolean)
        .join(", ");
      return {
        id: c.id,
        kind: "seeker" as const,
        email: user?.email ?? null,
        full_name: user?.full_name ?? null,
        title: c.headline,
        company: null,
        location: location || null,
        status: c.status,
        created_at: c.created_at,
      };
    }),
    ...(hirers ?? []).map((h) => {
      const user = userMap.get(h.user_id);
      const location = [h.global_city, h.global_country]
        .filter(Boolean)
        .join(", ");
      return {
        id: h.id,
        kind: "hirer" as const,
        email: user?.email ?? null,
        full_name: user?.full_name ?? null,
        title: h.title,
        company: h.company_name,
        location: location || null,
        status: "active",
        created_at: h.created_at,
      };
    }),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({
    demo: false,
    people: filterDirectory(people, q),
  });
}

function filterDirectory(people: DirectoryPerson[], q: string) {
  if (!q) return people;
  return people.filter((p) => {
    const hay = [
      p.email,
      p.full_name,
      p.title,
      p.company,
      p.location,
      p.kind,
      p.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
