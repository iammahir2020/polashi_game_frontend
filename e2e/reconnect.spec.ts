/**
 * Socket listener lifecycle — exposes Steps.md #6.
 *
 * WHAT ACTUALLY HAPPENED WRITING THIS FILE, WORTH KNOWING
 * The obvious first attempt — two player contexts, one goes offline via
 * `context.setOffline(true)`, comes back via `setOffline(false)`, check the
 * roster recovers — was tried FIRST, and it PASSED. That's real: it doesn't
 * mean the bug is fake, it means that particular scenario doesn't expose it.
 * `roomUpdated` (the listener that repaints the roster) isn't gated by the
 * broken flag at all, so it survives regardless and quietly papers over the
 * actual break. Writing a test that "passes" there and calling it done would
 * have been dishonest — it wouldn't have been testing the bug, just a path
 * around it.
 *
 * What's actually broken, confirmed by directly inspecting the running
 * app's socket (via the dev-only `window.__socketService` hook in
 * `socket.ts` — exists purely so a real browser test can reach in and check,
 * added specifically for this): React 19's StrictMode (`main.tsx` wraps the
 * app in it) intentionally double-invokes every effect once on mount — mount,
 * cleanup, mount again — specifically to catch missing cleanup. The main
 * socket effect's cleanup calls `offAll()`, wiping EVERY listener on the
 * socket. `connect()` itself is guarded by an `initialized` flag on the
 * singleton that never resets, so on the second mount pass it early-returns
 * and never re-registers "connect"/"disconnect". Every OTHER listener that
 * same effect registers (`roomJoined`, `roomUpdated`, `errorMessage`,
 * `kicked`) isn't gated by that flag at all, so each gets wiped once and
 * re-registered once on the second pass — coincidentally ending up correct.
 * "connect"/"disconnect" are the only ones that don't come back, and they're
 * gone after the VERY FIRST page load in dev, not just after some later
 * network blip.
 *
 * Scope, honestly: this proves the listeners are gone, which is the root
 * mechanical bug Steps.md describes and the exact thing its own verify
 * criterion checks. It does NOT independently prove a specific broken user
 * journey — the one journey tried by hand (an offline player missing another
 * player's departure) actually recovered fine via `roomUpdated`. The
 * practical blast radius is real but narrower than "returning players are
 * stuck", matching what Steps.md's own re-investigation concluded.
 */

import { test, expect } from '@playwright/test';

test.describe('socket listener lifecycle', () => {
  test(
    'keeps exactly one "connect" and one "disconnect" listener registered after the initial mount — FAILS: Steps.md #6',
    async ({ page }) => {
      await page.addInitScript(() => {
        window.sessionStorage.setItem('intro_played', 'true');
      });
      await page.goto('/');
      // Wait for the app to actually be up — same reasoning as every other
      // spec in this suite — before inspecting anything the socket effect
      // sets up during mount.
      await page.getByPlaceholder('Enter Alias...').waitFor();

      const counts = await page.evaluate(() => {
        const service = window.__socketService;
        return {
          connect: service?.socket.listeners('connect').length ?? -1,
          disconnect: service?.socket.listeners('disconnect').length ?? -1,
        };
      });

      // Asserting the DESIRED invariant — exactly one of each, surviving
      // React's dev-mode double mount — not the current broken count (0/0).
      // Same reasoning as every other Steps.md-exposing test in this
      // course: this fails today, for the reason described above, and flips
      // green the day Steps.md Step 5's actual fix (moving "connect"/
      // "disconnect" registration into the constructor, deleting the
      // `initialized` flag entirely) lands.
      expect(counts.connect).toBe(1);
      expect(counts.disconnect).toBe(1);
    },
  );
});
