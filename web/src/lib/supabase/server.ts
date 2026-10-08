import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Per-request client that acts as the signed-in visitor, so row level security applies.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; the proxy refreshes the session instead.
        }
      },
    },
  });
}

// The signed-in user's id and email, verified against the project's signing keys, or null.
export async function currentUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const db = await createClient();
  const { data } = await db.auth.getClaims();
  const claims = data?.claims;
  return claims?.sub ? { db, id: claims.sub as string, email: (claims.email as string | undefined) ?? null } : null;
}
