import { createClient } from "@supabase/supabase-js";

// Client for the password reset link only. It keeps the session in memory, never in cookies,
// so opening the link does not sign in the other open tabs. Implicit flow: the link works in any browser.
export function createRecoveryClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "pt-recovery" },
  });
}
