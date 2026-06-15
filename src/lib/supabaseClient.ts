import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, isSupabaseConfigured } from "./supabaseEnv";

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const env = getSupabaseEnv();
  browserClient = createClient(env.url, env.publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

export function maybeGetSupabaseClient(): SupabaseClient | null {
  return isSupabaseConfigured() ? getSupabaseClient() : null;
}
