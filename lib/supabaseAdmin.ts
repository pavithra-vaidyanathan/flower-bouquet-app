import { createClient, SupabaseClient } from "@supabase/supabase-js";

function isPlaceholder(url: string | undefined, key: string | undefined) {
  if (!url || !key) return true;
  if (url.includes("your_supabase")) return true;
  if (key.includes("your_supabase")) return true;
  return false;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (isPlaceholder(url, key) || !url || !key) return null;
  return createClient(url, key);
}
