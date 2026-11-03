# Contributing

## Local development

Use Node.js 22, matching [CI](.github/workflows/ci.yml), and npm.
The collector lives in `scraper/`; the Next.js application lives in `web/`.
For database and deployment setup, follow [SETUP.md](docs/SETUP.md).

From the repository root, install and test each project:

```sh
cd scraper && npm ci && npm test
```

Return to the repository root, then run:

```sh
cd web && npm ci && npm test && npx eslint src
```

From `web/`, start the development server:

```sh
npm run dev
```

Open the local address printed by Next.js. With both
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` unset or empty,
the dashboard uses demo data. An existing `web/.env.local` can override your
intended configuration; use your own development services when testing accounts.

## Checks before a PR

Run both projects' tests above. CI uses Node.js 22 on Ubuntu 24.04 and runs
jobs only for affected paths (shared shop fixtures also trigger the web job).
The scraper job runs `npm ci` and `npm test`. The web job runs `npm ci`,
`npm test`, then these additional commands from `web/`:

```sh
npm run lint
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

For the build, CI explicitly sets both public Supabase variables to empty
strings to enable demo mode. Do the same for a local demo build using your
shell's environment-variable syntax. Playwright runs the production build
on port 3100; build first. Its configuration supplies empty Supabase values
to the test server. Browser installation may need OS package permissions.

Use a separate branch, never write directly to `main`, and keep one task per
PR. Explain the behavior changed, files touched, commands run and any checks
you could not run. Tests should pass before review; disclose failures rather
than claiming success. Do not bundle unrelated cleanup.

## Changes that must stay together

- Add new interface keys to all 24 dictionaries in
  `web/src/i18n/dictionaries/`. The key and placeholder tests in `web/test/`
  check that translations retain the same structure and substitutions.
- Keep `scraper/src/extract-price.js` and `web/src/lib/extract-price.ts`
  equivalent. Both test suites exercise shared examples in
  `scraper/test/fixtures/shops/`.
- Give a new migration in `supabase/migrations/` the next consecutive number
  and add its filename to the table in `docs/SETUP.md`.
  `scraper/test/migrations.test.js` checks numbering and table coverage.
- Read [web/AGENTS.md](web/AGENTS.md) before changing the app. This Next.js
  version has breaking changes: consult the installed guides under
  `web/node_modules/next/dist/docs/` instead of assuming older conventions.

## Configuration and secrets

Never commit credentials or populated local environment files. The root
`.env.example` and `web/.env.example` contain placeholders only; keep real
values in local environment files or the hosting provider's secret settings.
Never expose a server credential through a `NEXT_PUBLIC_*` variable.
See [README Configuration](README.md#configuration) for variable names,
where to configure them and optional integrations.
