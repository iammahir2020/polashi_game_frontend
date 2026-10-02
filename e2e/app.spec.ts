/**
 * LEVEL 5 — WORKED EXAMPLE: END-TO-END (PLAYWRIGHT)
 *
 * Everything before this ran in a fake DOM with no real browser (Vitest +
 * jsdom for Levels 3-4). This is a REAL, actual Chromium instance, driven
 * against the app really running (`playwright.config.ts`'s `webServer`
 * starts `npm run dev` for you). No mocked socket, no jsdom limitations —
 * and no real backend needed for THESE two tests, since the join/create
 * screen renders regardless of whether the socket connection ever succeeds.
 *
 * `page.goto(...)` is Playwright's `render()` — it's what puts something on
 * the page in the first place. `expect(locator).toBeVisible()` and friends
 * auto-retry for a few seconds by default, which matters here: React needs
 * a moment to mount, and a real splash timer really waits 1200ms — Playwright
 * assertions are built to tolerate that without an explicit sleep.
 */

import { test, expect } from '@playwright/test';
import { test as twoPlayerTest, expect as twoPlayerExpect } from './fixtures';

test.describe('the splash screen', () => {
  test('is skipped entirely when sessionStorage.intro_played is already seeded', async ({ page }) => {
    // `addInitScript` runs BEFORE any of the page's own scripts, on every
    // navigation — so by the time App.tsx's `useState(() => !sessionStorage
    // .getItem('intro_played'))` initializer runs, the value is already
    // there. This is the general technique for any test that needs to skip
    // a one-time-per-session UI: seed the same signal the app itself reads,
    // don't try to click through the intro faster.
    await page.addInitScript(() => {
      window.sessionStorage.setItem('intro_played', 'true');
    });

    await page.goto('/');

    // Straight to the join/create screen — no splash video, no "ENTER
    // POLASHI" button ever appears.
    await expect(page.getByPlaceholder('Enter Alias...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ENTER POLASHI' })).toHaveCount(0);
  });

  test('shows a boot sequence and requires a click to proceed, when nothing is seeded', async ({ page }) => {
    // No `addInitScript` this time — a genuinely fresh session, the same as
    // a real first-time visitor.
    await page.goto('/');

    // App.tsx's own boot timer holds this message for 1200ms before
    // flipping to the "proceed" button — proving THIS message appears first
    // is what makes the next assertion (the button showing up afterward)
    // meaningful, rather than the button simply having been there the whole
    // time for an unrelated reason.
    await expect(page.getByText('Establishing Intelligence Links...')).toBeVisible();

    // Playwright's default assertion timeout (5s) comfortably covers the
    // 1200ms boot timer — no manual wait needed.
    const proceedButton = page.getByRole('button', { name: 'ENTER POLASHI' });
    await expect(proceedButton).toBeVisible();

    await proceedButton.click();

    await expect(page.getByPlaceholder('Enter Alias...')).toBeVisible();
  });
});

test.describe('the two-player fixture', () => {
  // `twoPlayerTest`, imported from `./fixtures` above (not plain
  // `@playwright/test`), is what makes the `playerAPage`/`playerBPage`
  // parameters below resolvable — Playwright wires up whichever named
  // fixtures a test function asks for, the same way `{ page }` above asked
  // for the built-in default one.
  twoPlayerTest(
    'two player contexts are genuinely independent sessions, both starting past the splash',
    async ({ playerAPage, playerBPage }) => {
      await playerAPage.goto('/');
      await playerBPage.goto('/');

      // Both skipped the splash (the fixture's `addInitScript`) without
      // this test having to seed anything itself.
      await twoPlayerExpect(playerAPage.getByPlaceholder('Enter Alias...')).toBeVisible();
      await twoPlayerExpect(playerBPage.getByPlaceholder('Enter Alias...')).toBeVisible();

      // Prove the isolation, not just that both loaded: type a name into
      // player A only, and confirm player B's own field is untouched — if
      // these two shared one session (the mistake this fixture exists to
      // avoid), typing in one would risk colliding with the other's state.
      await playerAPage.getByPlaceholder('Enter Alias...').fill('Siraj');
      await twoPlayerExpect(playerAPage.getByPlaceholder('Enter Alias...')).toHaveValue('Siraj');
      await twoPlayerExpect(playerBPage.getByPlaceholder('Enter Alias...')).toHaveValue('');
    },
  );
});
