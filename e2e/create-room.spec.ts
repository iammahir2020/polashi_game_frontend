/**
 * Create room → HQ code appears.
 *
 * REQUIRES THE REAL BACKEND RUNNING — `../palassy-backend`, `npm start`,
 * port 3000. `playwright.config.ts`'s `webServer` points `VITE_SOCKET_URL`
 * at `http://localhost:3000/` specifically so this test (and the ones after
 * it) have a real server to talk to; without the backend running, this
 * hangs until the socket connection times out rather than failing fast.
 *
 * WHY THIS TEST IS QUALITATIVELY DIFFERENT FROM EVERYTHING BEFORE IT
 * `app.spec.ts` and `seo.spec.ts` never needed the backend to succeed at
 * all — the join/create screen and the SEO tags render the same whether the
 * socket connects or not. This is the first test in the WHOLE COURSE where
 * a real client talks to a real server over a real (if local) network
 * connection, and the assertion depends on that round trip actually working.
 */

import { test, expect } from '@playwright/test';

test('creating a room replaces the enlistment form with a live HQ code', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('intro_played', 'true');
  });
  await page.goto('/');

  await page.getByPlaceholder('Enter Alias...').fill('Siraj');
  await page.getByRole('button', { name: 'Establish New HQ' }).click();

  // The enlistment form (EnlistmentForm) only renders while `room` is null
  // — once the backend's "roomJoined" response sets it, this disappears.
  // `toHaveCount(0)` (not `not.toBeVisible()`) because the element won't
  // just be hidden, it won't exist in the DOM at all once `room` is set.
  await expect(page.getByPlaceholder('Enter Alias...')).toHaveCount(0);

  // The backend generates the room code itself
  // (`Math.random().toString(36).substring(2, 8).toUpperCase()`, per its own
  // source) — there's no fixed value to assert against, which is exactly
  // why this checks the SHAPE (six base-36 characters, upper-cased) rather
  // than a specific code. This is the same principle as the canonical-URL
  // test in `seo.spec.ts`: when a value is generated rather than configured,
  // assert what MUST be true about it, not a value you can't actually know
  // ahead of time.
  await expect(page.getByText(/^[A-Z0-9]{6}$/)).toBeVisible();
});
