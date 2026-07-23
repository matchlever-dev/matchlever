import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  company: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid waitlist payload" }, { status: 400 });
    }

    // Phase 1: acknowledge signup. Persist to Supabase waitlist table in Phase 2.
    console.info("[waitlist]", parsed.data.email, parsed.data.company);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to join waitlist" }, { status: 500 });
  }
}
