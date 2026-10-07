import { createClient } from "@supabase/supabase-js";

export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server-only client. Visitors can insert alerts but never read them, so anything that
// reads or changes an alert goes through here and checks the alert's manage token.
export function adminDb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}

export const escapeLike = (s: string) => s.replace(/[%_\\]/g, "\\$&");

export function alertError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}
