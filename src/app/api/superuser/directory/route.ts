import { NextResponse } from "next/server";

import { requireSuperuserApi } from "@/lib/auth/api-guards";
import {
  DEMO_DIRECTORY,
  averageAuthenticityScore,
  type DirectoryPerson,
} from "@/lib/admin/demo";
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

  const [{ data: talent }, { data: employers }] = await Promise.all([
    supabase
      .from("talent_profiles")
      .select(
        "id, headline, status, global_city, global_country, created_at, user_id"
      ),
    supabase
      .from("employer_profiles")
      .select(
        "id, company_name, title, global_city, global_country, created_at, user_id"
      ),
  ]);

  const userIds = [
    ...new Set([
      ...(talent ?? []).map((c) => c.user_id),
      ...(employers ?? []).map((h) => h.user_id),
    ]),
  ];
  const talentIds = (talent ?? []).map((c) => c.id);

  const [{ data: users }, { data: references }] = await Promise.all([
    userIds.length
      ? supabase
          .from("user_profiles")
          .select("id, email, full_name")
          .in("id", userIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            email: string | null;
            full_name: string | null;
          }[],
        }),
    talentIds.length
      ? supabase
          .from("talent_references")
          .select("talent_profile_id, authenticity_score")
          .in("talent_profile_id", talentIds)
      : Promise.resolve({
          data: [] as {
            talent_profile_id: string;
            authenticity_score: number | null;
          }[],
        }),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const refsByTalent = new Map<
    string,
    { authenticity_score: number | null }[]
  >();
  for (const ref of references ?? []) {
    const list = refsByTalent.get(ref.talent_profile_id) ?? [];
    list.push({
      authenticity_score:
        ref.authenticity_score === null
          ? null
          : Number(ref.authenticity_score),
    });
    refsByTalent.set(ref.talent_profile_id, list);
  }

  const people: DirectoryPerson[] = [
    ...(talent ?? []).map((c) => {
      const user = userMap.get(c.user_id);
      const location = [c.global_city, c.global_country]
        .filter(Boolean)
        .join(", ");
      const refs = refsByTalent.get(c.id) ?? [];
      return {
        id: c.id,
        kind: "talent" as const,
        email: user?.email ?? null,
        full_name: user?.full_name ?? null,
        title: c.headline,
        company: null,
        location: location || null,
        status: c.status,
        created_at: c.created_at,
        avg_authenticity_score: averageAuthenticityScore(refs),
      };
    }),
    ...(employers ?? []).map((h) => {
      const user = userMap.get(h.user_id);
      const location = [h.global_city, h.global_country]
        .filter(Boolean)
        .join(", ");
      return {
        id: h.id,
        kind: "employer" as const,
        email: user?.email ?? null,
        full_name: user?.full_name ?? null,
        title: h.title,
        company: h.company_name,
        location: location || null,
        status: "active",
        created_at: h.created_at,
        avg_authenticity_score: null,
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
