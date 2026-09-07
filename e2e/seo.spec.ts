/**
 * SEO metadata — title, canonical link, JSON-LD.
 *
 * WHY THIS HAS TO BE AN E2E TEST, NOT A UNIT TEST
 * `resolveRouteSeo` (the pure function that PICKS the right metadata for a
 * path) already has full unit test coverage in `src/seo/routeSeo.test.ts` —
 * that's the right level for "does the lookup logic work". What only a real
 * browser can prove is the OTHER half: does `SeoHead`'s `useEffect` actually
 * reach into `document.head` and set these tags for real, once the app is
 * truly running. jsdom could fake that too, technically, but the point of
 * this level is testing the real thing end to end.
 *
 * WHY THE SPLASH HAS TO BE SKIPPED HERE TOO
 * `RouteSeoManager` (which renders `SeoHead`) only mounts in App.tsx's
 * post-splash branch — same reason `app.spec.ts` needed
 * `addInitScript` to seed `sessionStorage.intro_played`.
 */

import { test, expect } from '@playwright/test';

test.describe('SEO metadata', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem('intro_played', 'true');
    });
    await page.goto('/');
    // Wait for the real app to be up before checking anything SeoHead sets —
    // its effect runs during the same commit, but there's no reason to race
    // it when a normal, already-used wait does the job.
    await expect(page.getByPlaceholder('Enter Alias...')).toBeVisible();
  });

  test('sets the document title to the route\'s configured title', async ({ page }) => {
    // Hardcoding this string is a DIFFERENT situation from Level 0's warning
    // against hardcoding `SITE_URL` — `SITE_NAME`/`SITE_ALT_NAME` are app
    // COPY, not environment configuration; they don't differ between a
    // local run, CI, and the deployed site the way a domain does. (We also
    // can't safely import `seoConfig.ts` directly into a Playwright spec to
    // derive it: that file reads `import.meta.env` at the top level, which
    // Vite provides at build time but plain Node does not — the import
    // would throw before a single assertion ran.)
    await expect(page).toHaveTitle('The Battle of Polashi (Polashi (পলাশী))');
  });

  test('sets an absolute canonical link', async ({ page }) => {
    const href = await page.locator('link[rel="canonical"]').getAttribute('href');

    // Unlike the title, the canonical URL's DOMAIN comes from
    // `VITE_SITE_URL` — genuine environment configuration, exactly what
    // Level 0 warned against hardcoding, since it legitimately differs
    // between this machine and the deployed site. Checking the SHAPE
    // (absolute, https, ending at the root path) proves the mechanism works
    // without pinning the test to one specific domain.
    expect(href).toMatch(/^https:\/\/.+\/$/);
  });

  test('injects JSON-LD structured data for the route', async ({ page }) => {
    // `index.html` (checked by hand — no `data-seo-jsonld` script anywhere
    // in it) has none of this baked in statically; this selector can only
    // ever match something `SeoHead`'s effect created at runtime. That
    // makes this the one assertion in this file that's impossible to pass
    // by accident — title and canonical both happen to already match
    // static values the build script writes into `index.html`, so on their
    // own they wouldn't catch `RouteSeoManager` being deleted from
    // `App.tsx` entirely. This one would.
    const jsonLdScripts = page.locator('script[data-seo-jsonld="true"]');
    await expect(jsonLdScripts).toHaveCount(3);

    const types = await jsonLdScripts.evaluateAll((nodes) =>
      nodes.map((node) => JSON.parse(node.textContent ?? '{}')['@type']),
    );
    expect(types).toEqual(['WebSite', 'VideoGame', 'Organization']);
  });
});
