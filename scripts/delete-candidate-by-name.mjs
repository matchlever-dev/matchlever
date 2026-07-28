#!/usr/bin/env node
/**
 * Delete all app + auth data for a candidate matched by display name.
 *
 * Usage:
 *   node scripts/delete-candidate-by-name.mjs "Anna Duterte"           # dry run
 *   node scripts/delete-candidate-by-name.mjs "Anna Duterte" --execute
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const name = args.find((a) => !a.startsWith("--"))?.trim() ?? "Anna Duterte";

if (!name) {
  console.error("Usage: node scripts/delete-candidate-by-name.mjs \"Full Name\" [--execute]");
  process.exit(1);
}

const env = loadEnv(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole || serviceRole.includes("your-")) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(2);
}

const admin = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const needle = name.toLowerCase();

function nameMatches(fullName) {
  return (fullName ?? "").trim().toLowerCase() === needle;
}

function metaName(user) {
  const m = user.user_metadata ?? {};
  return (m.full_name ?? m.name ?? "").trim();
}

/** @param {import('@supabase/supabase-js').User[]} users */
function collectMatches(users, profileRows) {
  const byId = new Map();

  for (const row of profileRows ?? []) {
    if (nameMatches(row.full_name)) {
      byId.set(row.id, {
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        source: "user_profiles.full_name",
      });
    }
  }

  for (const user of users) {
    if (nameMatches(metaName(user))) {
      byId.set(user.id, {
        id: user.id,
        email: user.email ?? null,
        full_name: metaName(user) || null,
        source: "auth.user_metadata",
      });
    }
  }

  return [...byId.values()];
}

async function loadAllAuthUsers() {
  const users = [];
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...(data.users ?? []));
    if ((data.users?.length ?? 0) < perPage) break;
    page += 1;
  }
  return users;
}

async function loadRelated(userId) {
  const { data: cp } = await admin
    .from("candidate_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  let referenceCount = 0;
  let handshakeCount = 0;
  if (cp?.id) {
    const { count: refCount } = await admin
      .from("candidate_references")
      .select("id", { count: "exact", head: true })
      .eq("candidate_profile_id", cp.id);
    referenceCount = refCount ?? 0;

    const { count: hsCount } = await admin
      .from("match_handshakes")
      .select("id", { count: "exact", head: true })
      .eq("candidate_profile_id", cp.id);
    handshakeCount = hsCount ?? 0;
  }

  const { count: hirerCount } = await admin
    .from("hirer_profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return {
    candidate_profile_id: cp?.id ?? null,
    reference_count: referenceCount,
    handshake_count: handshakeCount,
    hirer_profile_count: hirerCount ?? 0,
  };
}

try {
  console.log(`Looking for candidate (exact name, case-insensitive): "${name}"\n`);

  const [{ data: profiles, error: profileError }, authUsers] = await Promise.all([
    admin.from("user_profiles").select("id, email, full_name"),
    loadAllAuthUsers(),
  ]);

  if (profileError) throw profileError;

  const matches = collectMatches(authUsers, profiles);

  if (matches.length === 0) {
    console.log("No users matched. Nothing to delete.");
    process.exit(0);
  }

  for (const m of matches) {
    const related = await loadRelated(m.id);
    console.log("Match:", {
      user_id: m.id,
      email: m.email,
      full_name: m.full_name,
      matched_via: m.source,
      ...related,
    });
  }

  if (!execute) {
    console.log(
      `\nDry run only. Re-run with --execute to delete ${matches.length} auth user(s) ` +
        "(cascades profiles, references, handshakes)."
    );
    process.exit(0);
  }

  for (const m of matches) {
    const { error } = await admin.auth.admin.deleteUser(m.id);
    if (error) {
      console.error(`Failed to delete ${m.id} (${m.email}):`, error.message);
      process.exit(1);
    }
    console.log(`Deleted auth user ${m.id} (${m.email ?? "no email"})`);
  }

  console.log("Done.");
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
