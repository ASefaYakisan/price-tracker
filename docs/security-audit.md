# Security audit log

Record of checks run against the live Supabase project. It states what was found, not that the app is unhackable.

## 2026-11-03: Supabase security advisors

Run with the Supabase `get_advisors` (security) check on the production project.

| Finding | Level | Verdict |
| --- | --- | --- |
| `public.track_attempts` has RLS enabled but no policies | INFO | Expected. The table is written and read only by the server with the service role; no policy means anon and signed-in users cannot touch it (see `docs/data-model.md`, Access rules). |
| Leaked password protection disabled (Auth) | WARN | Open. This is a Supabase dashboard setting (Authentication > Providers > Email, "Prevent use of leaked passwords"). It may need a paid Supabase plan. The app already enforces an 8-character minimum. |

No other advisories were reported: no table without RLS, no exposed views or functions flagged.

## Still open from issue #229

- Server-side sign-in lockout (today the lockout lives in the browser).
- RLS review table by table against `docs/data-model.md`.
- DNS rebinding: redirects are re-checked on every hop, but the address checked is not pinned for the actual connection.
