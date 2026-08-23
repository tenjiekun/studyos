import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Returns null if Supabase is not configured
export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Convenience export — always returns a client (use only when you know it's configured)
export const supabase = getSupabase()!;
