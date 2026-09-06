import { test as base, type Page } from '@playwright/test';

/**
 * Two independent player fixtures — two separate `BrowserContext`s (Playwright's
 * equivalent of two different browsers, or one browser used in two separate
 * private-window sessions: each gets its own cookies, `localStorage`, and
 * `sessionStorage`, completely isolated from the other). This is what "two
 * players in the same game" actually requires: a single `page` reused for
 * both would share one session, and player B's actions would silently affect
 * player A's login/room state too.
 *
 * `context.addInitScript` runs BEFORE any of the app's own scripts, on every
 * navigation in that context — seeding `sessionStorage.intro_played` here
 * means neither player ever sees the splash screen, which is set dressing
 * unrelated to whatever a multiplayer test is actually about. See
 * `app.spec.ts` for a worked example that deliberately does NOT use this
 * fixture, to prove the splash-skip technique on its own first.
 *
 * Two players is the minimum useful case; `fivePlayerPages` below is the same
 * pattern scaled up — one `browser.newContext()` per simulated player,
 * exactly as many as the game needs.
 */
type TwoPlayerFixtures = {
  playerAPage: Page;
  playerBPage: Page;
};

type FivePlayerFixtures = {
  fivePlayerPages: Page[];
};

async function newSkippedSplashPage(browser: import('@playwright/test').Browser): Promise<Page> {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.sessionStorage.setItem('intro_played', 'true');
  });
  return context.newPage();
}

export const test = base.extend<TwoPlayerFixtures & FivePlayerFixtures>({
  playerAPage: async ({ browser }, use) => {
    const page = await newSkippedSplashPage(browser);
    await use(page);
    await page.context().close();
  },
  playerBPage: async ({ browser }, use) => {
    const page = await newSkippedSplashPage(browser);
    await use(page);
    await page.context().close();
  },
  fivePlayerPages: async ({ browser }, use) => {
    const pages = await Promise.all(
      Array.from({ length: 5 }, () => newSkippedSplashPage(browser)),
    );
    await use(pages);
    await Promise.all(pages.map((page) => page.context().close()));
  },
});

export { expect } from '@playwright/test';
