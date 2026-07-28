#!/usr/bin/env node
/**
 * Run a SQL file against the linked Supabase Postgres database.
 * Requires SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in .env.local
 * (Dashboard → Project Settings → Database).
 */
import { readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

const env = loadEnv(envPath);
const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Usage: node scripts/run-sql.mjs <path-to.sql>");
  process.exit(1);
}

const sqlFile = resolve(root, fileArg);
if (!existsSync(sqlFile)) {
  console.error(`SQL file not found: ${sqlFile}`);
  process.exit(1);
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const dbUrl = env.SUPABASE_DB_URL || env.DATABASE_URL;
const dbPassword = env.SUPABASE_DB_PASSWORD;
const ref = url ? new URL(url).hostname.split(".")[0] : "";

let connection = dbUrl;
if (!connection && dbPassword && ref) {
  connection = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;
}

if (!connection) {
  console.error(
    "Missing database credentials. Add to .env.local:\n" +
      "  SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@...\n" +
      "  or SUPABASE_DB_PASSWORD=your-database-password\n" +
      "(Supabase Dashboard → Project Settings → Database)"
  );
  process.exit(2);
}

const r = spawnSync(
  "npx",
  ["--yes", "supabase", "db", "query", "--file", sqlFile, "--db-url", connection],
  { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
);

if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
