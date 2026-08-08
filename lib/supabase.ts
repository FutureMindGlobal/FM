import { createClient } from "@supabase/supabase-js";

// These browser-safe defaults keep static deployments connected when the host
// does not inline NEXT_PUBLIC_* values during its build step.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wngrvaaozcvbtflzsfsq.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_YiwfzhF7Ocv8lqcxGfDwWw_tfzM538E";

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export type PlatformRole = "participant" | "reviewer" | "editor" | "admin";
