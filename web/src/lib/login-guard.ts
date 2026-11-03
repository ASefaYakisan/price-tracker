// Server-side wrong-password lock for POST /api/auth/sign-in. Free of Next.js and Supabase imports so it can be unit tested.

export const FREE_TRIES = 5; // wrong passwords per account before it locks
export const IP_FREE_TRIES = 20; // wrong passwords from one network before it locks (many accounts, one guesser)
export const WINDOW_MS = 15 * 60_000; // failures older than this no longer count
export const BASE_LOCK_S = 30; // first lock; doubles with each further miss
export const MAX_LOCK_S = 15 * 60;

// Seconds the next attempt must wait, from the times (ms) of recent failures; 0 = free to try.
export function lockSeconds(failures: readonly number[], freeTries: number, now = Date.now()): number {
  const recent = failures.filter((t) => now - t < WINDOW_MS);
  if (recent.length < freeTries) return 0;
  const last = Math.max(...recent);
  const lock = Math.min(MAX_LOCK_S, BASE_LOCK_S * 2 ** (recent.length - freeTries));
  return Math.max(0, Math.ceil((last + lock * 1000 - now) / 1000));
}

export type Failures = { email: number[]; ip: number[] };

export type SignInDeps = {
  // Null when SUPABASE_SERVICE_ROLE_KEY is not set: then only Supabase's own limits apply.
  store: {
    load(): Promise<Failures | null>; // null = the lookup failed
    record(): Promise<void>;
    clear(): Promise<void>;
  } | null;
  authenticate(): Promise<{
    session?: { access_token: string; refresh_token: string };
    error?: { code?: string; message: string; status?: number };
  }>;
  now?: number;
};

export type SignInResult = { status: number; body: Record<string, unknown> };

export async function signIn({ store, authenticate, now = Date.now() }: SignInDeps): Promise<SignInResult> {
  if (store) {
    const failures = await store.load();
    // Fail closed: if the lock cannot be checked, do not let the request skip it.
    if (!failures) return { status: 503, body: { ok: false, code: "unavailable" } };
    const wait = Math.max(lockSeconds(failures.email, FREE_TRIES, now), lockSeconds(failures.ip, IP_FREE_TRIES, now));
    if (wait > 0) return { status: 429, body: { ok: false, code: "locked", retryAfter: wait } };
  }
  const { session, error } = await authenticate();
  if (session && !error) {
    await store?.clear().catch(() => {});
    return { status: 200, body: { ok: true, access_token: session.access_token, refresh_token: session.refresh_token } };
  }
  const code = error?.code ?? (error?.message === "Invalid login credentials" ? "invalid_credentials" : undefined);
  if (code === "invalid_credentials") {
    await store?.record().catch(() => {});
    return { status: 401, body: { ok: false, code } };
  }
  return { status: error?.status && error.status >= 400 ? error.status : 400, body: { ok: false, code: code ?? "error", message: error?.message } };
}
