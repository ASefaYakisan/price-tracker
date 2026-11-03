# Security audit log

Record of checks run against the live Supabase project. It states what was found, not that the app is unhackable.

## 2026-11-03: Supabase security advisors

Run with the Supabase `get_advisors` (security) check on the production project.

| Finding | Level | Verdict |
| --- | --- | --- |
| `public.track_attempts` has RLS enabled but no policies | INFO | Expected. The table is written and read only by the server with the service role; no policy means anon and signed-in users cannot touch it (see `docs/data-model.md`, Access rules). |
| Leaked password protection disabled (Auth) | WARN | Open. This is a Supabase dashboard setting (Authentication > Providers > Email, "Prevent use of leaked passwords"). It may need a paid Supabase plan. The app already enforces an 8-character minimum. |

No other advisories were reported: no table without RLS, no exposed views or functions flagged.

## 2026-11-03: Dependency audit (`npm audit`)

| Package set | Result |
| --- | --- |
| `scraper/` | 0 vulnerabilities |
| `web/` production dependencies (`npm audit --omit=dev`) | 8 moderate, all one chain: `minimatch` (DoS via glob pattern amplification) under `exceljs` > `archiver` > `glob`/`readdir-glob` |
| `web/` including dev dependencies | 23 moderate, 0 high, 0 critical (the same chain plus ESLint tooling) |

Verdict: no high or critical findings. The `minimatch` issue needs an attacker-controlled glob pattern; `exceljs` only writes the Excel export in `web/src/app/api/export/route.ts` and never receives patterns from users, so it is not reachable from the request. `npm audit fix --force` would downgrade `exceljs` to 4.1.1 (a breaking change), so it was not applied; Dependabot (`.github/dependabot.yml`, weekly for `web`, `scraper` and GitHub Actions) will propose the fix when `exceljs` ships one. Recheck with `cd web && npm audit --omit=dev`.

## Still open from issue #229

- Server-side sign-in lockout (today the lockout lives in the browser; PR #264 is open).
- RLS review table by table against `docs/data-model.md`.
- DNS rebinding: redirects are re-checked on every hop, but the address checked is not pinned for the actual connection.
