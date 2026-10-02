import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against the production build (`vite preview`), so they
// cover the pre-rendered page, generated sitemap and built head tags. They never
// talk to the real game server: specs stub the socket.io connection.
// Not the vite preview default (4173), so another project's preview server is never reused by mistake.
const PORT = 4317

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  // The game screen is lazy-loaded; give it room on a busy machine.
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
})
