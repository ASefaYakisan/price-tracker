import { defineConfig } from "@playwright/test";

const port = 3100;

// Runs against the production build in demo mode (empty Supabase variables), so no
// database or keys are needed. Build first: `npm run build && npm run test:e2e`.
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  outputDir: "test-results",
  use: {
    baseURL: `http://localhost:${port}`,
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `npx next start -p ${port}`,
    url: `http://localhost:${port}/en`,
    env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
