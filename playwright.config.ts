import { defineConfig, devices } from '@playwright/test';

/**
 * LEVEL 5 — END-TO-END (PLAYWRIGHT)
 *
 * Everything before this level ran without a browser (Vitest + jsdom, a
 * DOM implementation in plain JS). This is the first level that launches a
 * REAL browser and points it at the app actually running — no faking the
 * DOM, no mocking the socket. That's slower and less deterministic than
 * anything before it (a real page load, real network timing), which is
 * exactly why it sits at the top of the testing pyramid described in
 * TESTING.md: a handful of these, not hundreds — they prove the whole
 * system is wired together, not any one piece of logic.
 */
export default defineConfig({
  testDir: './e2e',

  // Playwright's own `test` global collides with Vitest's if the two ever
  // look at the same files — this repo avoids that by keeping Playwright
  // specs under `e2e/`, which `vite.config.ts` explicitly excludes from
  // Vitest's `test.exclude`.
  fullyParallel: true,

  // On CI, an accidentally-committed `.only` should fail the build loudly
  // rather than silently skip every other test in the file.
  forbidOnly: !!process.env.CI,

  use: {
    baseURL: 'http://localhost:5173',
    // Keep a trace only for a test that actually failed — the trace viewer
    // (`npx playwright show-trace`) can then replay exactly what happened,
    // screenshot-by-screenshot, without paying that cost for passing runs.
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Playwright starts the app itself before the first test and reuses one
  // server across the whole run, rather than every test spinning up its
  // own. `reuseExistingServer` is `true` outside CI so a dev server you
  // already have running (e.g. from `npm run dev` in another terminal)
  // doesn't get fought over or duplicated.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // `.env.local`'s VITE_SOCKET_URL points at the deployed production
    // backend — right for `npm run dev` on its own, wrong for E2E tests
    // that need to create/join real rooms against a backend these tests can
    // see the effects of. This env var overrides just the process
    // Playwright itself starts, without touching `.env.local` (and without
    // needing to remember to revert it afterward). This is the payoff of
    // Steps.md Step 2, Level 5's prerequisite: without `socket.ts` actually
    // reading `VITE_SOCKET_URL`, there'd be no way to redirect it at all
    // short of editing the hardcoded URL by hand before every E2E run.
    env: {
      VITE_SOCKET_URL: 'http://localhost:3000/',
    },
  },
});
