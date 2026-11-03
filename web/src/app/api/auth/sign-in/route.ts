import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { adminDb } from "@/lib/alerts-server";
import { signIn, WINDOW_MS, type Failures } from "@/lib/login-guard";

// POST { email, password, captchaToken? } -> checks the server-side wrong-password lock, then signs in.
// The browser completes the sign-in with the returned tokens (supabase.auth.setSession).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password || email.length > 320 || password.length > 1024) {
    return Response.json({ ok: false, code: "invalid_request" }, { status: 400 });
  }
  const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : undefined;

  const admin = adminDb();
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const hash = (v: string) => createHmac("sha256", secret).update(v).digest("hex");
  const ip = (request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "").trim();
  const emailHash = hash(`email:${email}`);
  const ipHash = ip ? hash(`ip:${ip}`) : null;

  const store = admin
    ? {
        async load(): Promise<Failures | null> {
          const since = new Date(Date.now() - WINDOW_MS).toISOString();
          const times = async (column: "email_hash" | "ip_hash", value: string | null) => {
            if (!value) return [] as number[];
            const { data, error } = await admin.from("login_failures").select("created_at").eq(column, value).gt("created_at", since);
            if (error) throw error;
            return (data ?? []).map((r) => Date.parse(r.created_at as string));
          };
          try {
            return { email: await times("email_hash", emailHash), ip: await times("ip_hash", ipHash) };
          } catch {
            return null;
          }
        },
        async record() {
          await admin.from("login_failures").insert({ email_hash: emailHash, ip_hash: ipHash });
          // Housekeeping: nothing older than a day is useful.
          await admin.from("login_failures").delete().lt("created_at", new Date(Date.now() - 86_400_000).toISOString());
        },
        async clear() {
          await admin.from("login_failures").delete().eq("email_hash", emailHash);
        },
      }
    : null;

  const result = await signIn({
    store,
    authenticate: async () => {
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await db.auth.signInWithPassword({ email, password, options: { captchaToken } });
      return {
        session: data.session ?? undefined,
        error: error ? { code: error.code, message: error.message, status: error.status } : undefined,
      };
    },
  });
  return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
