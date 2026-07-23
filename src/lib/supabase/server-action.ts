/**
 * Supabase client for Server Actions.
 * Re-uses the cookie-aware server client (same as Server Components / Route Handlers).
 *
 * @example
 * ```ts
 * "use server";
 * import { createClient } from "@/lib/supabase/server-action";
 *
 * export async function updateCandidateProfile(formData: FormData) {
 *   const supabase = await createClient();
 *   // ...
 * }
 * ```
 */
export { createClient } from "./server";
