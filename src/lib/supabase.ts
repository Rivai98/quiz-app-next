import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/** True when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both present (non-empty). */
export function hasSupabaseEnv(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Slack failure if the environment variables are missing or unfinished. */
export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseAdmin();
    return true;
  } catch {
    return false;
  }
}

/** Service-role client for server routes only. Never import this from client components. */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}
