/**
 * CAPSTONE: five simulated players create a room and play a full game to
 * completion.
 *
 * REQUIRES THE REAL BACKEND RUNNING — same as `create-room.spec.ts` and
 * `reconnect.spec.ts`.
 *
 * WHY "ALWAYS VOTE SUCCESS", NOT A MIX OF SUCCESS AND SABOTAGE
 * The backend redacts character assignments per player — `broadcastRoomUpdate`
 * only reveals a player's OWN character to them; everyone else's is hidden
 * until the game ends. That's not a limitation of this test, it's the actual
 * game working as designed (verified by reading the real socket payload, not
 * assumed) — a script driving these clients genuinely cannot know who's
 * secretly on which team, exactly like a real player couldn't.
 *
 * That matters because the frontend has a rule: a Nawab-team player who
 * clicks SABOTAGE has their vote silently submitted as "Yes" anyway (see
 * `VotingSystem/index.tsx` — sabotage only works for a real EIC player). So
 * scripting "everyone clicks SABOTAGE" would produce an outcome that depends
 * on the random character shuffle every single run — not a flaky test, a
 * genuinely non-deterministic one. Scripting "everyone clicks SUCCESS"
 * sidesteps the whole problem: SUCCESS resolves to "Yes" regardless of team,
 * so team assignment never affects the outcome. Every mission succeeds,
 * every time, in exactly 3 rounds — which triggers the Mir Jafor
 * assassination phase (`Steps.md`'s "MIR_JAFOR_TURN") rather than an outright
 * EIC win, so this test's real job is handling THAT phase to reach a true
 * "OVER" state, which `attemptAssassination` reaches regardless of who's
 * targeted (confirmed by reading the backend handler).
 *
 * WHY WHO'S "GENERAL" AND WHO'S "MIR JAFOR" ARE DISCOVERED, NOT ASSUMED
 * Both are assigned randomly server-side. The test doesn't guess — it polls
 * all five pages for whichever one is currently showing the relevant UI
 * ("Assemble Your Battalion" for the General; "Identify **Mir Madan**" for
 * Mir Jafor) and acts through that page specifically. This is the same
 * "discover, don't assume" principle Level 4's `GameDashboard` tests used for
 * captured socket callbacks, applied to a UI signal instead.
 *
 * This was built by running the real flow against a real backend, dumping
 * real DOM state at each step (character names, button roles, ambiguous
 * locators), not written from reading the source alone — several of the
 * exact locators below (`getByRole('button', ...)` instead of `getByText`,
 * to disambiguate `BattalionSelector`'s buttons from `PlayerRoster`'s plain
 * spans showing the same names) only became obvious that way.
 */

import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// This genuinely takes a while — five real browser contexts, a real
// multi-round game, dozens of real network round trips. Playwright's
// default 30s-per-test timeout isn't enough.
test.setTimeout(120_000);

const PLAYER_NAMES = ['Siraj', 'Clive', 'Watts', 'Amichand', 'Jagat'];

/** Polls all five pages for whichever one currently shows `text`, and returns it. */
async function findPageWithText(
  pages: Page[],
  names: string[],
  text: string | RegExp,
): Promise<{ page: Page; name: string } | null> {
  for (let i = 0; i < pages.length; i++) {
    const visible = await pages[i]
      .getByText(text)
      .isVisible()
      .catch(() => false);
    if (visible) return { page: pages[i], name: names[i] };
  }
  return null;
}

test('five players create a room, start a game, and reach a final result', async ({
  fivePlayerPages,
}) => {
  const [gm, ...others] = fivePlayerPages;

  // --- Create the room, everyone else joins ---
  await gm.goto('/');
  await gm.getByPlaceholder('Enter Alias...').fill(PLAYER_NAMES[0]);
  await gm.getByRole('button', { name: 'Establish New HQ' }).click();
  await gm.getByText(/^[A-Z0-9]{6}$/).waitFor();
  const roomCode = await gm.getByText(/^[A-Z0-9]{6}$/).innerText();

  for (let i = 0; i < others.length; i++) {
    const page = others[i];
    await page.goto('/');
    await page.getByPlaceholder('Enter Alias...').fill(PLAYER_NAMES[i + 1]);
    await page.getByPlaceholder('Enter HQ Code').fill(roomCode);
    await page.getByRole('button', { name: 'Infiltrate Existing HQ' }).click();
    await page.getByText(/^[A-Z0-9]{6}$/).waitFor();
  }

  // GameDashboard auto-marks every joined player "active" pre-game (as long
  // as the room has 10 or fewer players) — no manual roster clicking needed.
  await gm.getByText(/5 Active|Battalion ready: 5/).first().waitFor({ timeout: 10_000 });
  await gm.getByRole('button', { name: 'Begin Campaign' }).click();

  // --- Character selection ---
  // Mir Jafor (id 1, team EIC) and Mir Madan (id 8, team Nawabs) are
  // mandatory and pre-selected — that's 1 EIC + 1 Nawab already. A 5-player
  // game needs 3 Nawabs / 2 EIC total (`TEAM_DISTRIBUTIONS[5]`), so exactly
  // 2 more Nawab clicks and 1 more EIC click complete the selection. These
  // specific names are the actual roster content (verified by inspecting the
  // real modal), not a guess — any other non-mandatory names from each
  // column would do exactly as well.
  await gm.getByRole('button', { name: 'রায় দুর্লভ' }).click(); // EIC
  await gm.getByRole('button', { name: 'নবাব সিরাজউদ্দৌলা' }).click(); // Nawab
  await gm.getByRole('button', { name: 'লুৎফুন্নিসা বেগম' }).click(); // Nawab
  await gm.getByRole('button', { name: 'START GAME' }).click();
  await gm.getByRole('button', { name: 'Appoint General' }).waitFor({ timeout: 10_000 });

  /** Appoints a new General, dismisses the reveal overlay everywhere, and returns their page. */
  async function appointGeneral() {
    await gm.getByRole('button', { name: 'Appoint General' }).click();

    // The reveal overlay (`GeneralReveal`) shows on all five pages at once;
    // dismissing it is just a click anywhere on its overlay (`onClick={onClose}`
    // in the source — no confirmation needed).
    await gm.waitForTimeout(500);
    for (const page of fivePlayerPages) {
      const dialog = page.getByRole('dialog', { name: 'General assigned' });
      if (await dialog.isVisible().catch(() => false)) await dialog.click();
    }

    const found = await findPageWithText(fivePlayerPages, PLAYER_NAMES, 'Assemble Your Battalion');
    if (!found) throw new Error('No page shows the General\'s team-proposal UI after appointment');
    return found;
  }

  /** Plays one mission round of the given team size, asserting it succeeds. */
  async function playMissionRound(teamSize: number) {
    const { page: generalPage, name: generalName } = await appointGeneral();

    // Proposing a team is General-only, so this never includes the General's
    // OWN name — `getByRole('button', ...)`, not `getByText`, is what
    // disambiguates BattalionSelector's clickable team-proposal buttons from
    // PlayerRoster's plain (non-interactive) `<span>` showing the same name.
    const teammates = PLAYER_NAMES.filter((n) => n !== generalName).slice(0, teamSize);
    for (const teammate of teammates) {
      await generalPage.getByRole('button', { name: teammate, exact: true }).click();
    }
    await generalPage.getByRole('button', { name: 'Initiate Council Vote' }).click();

    // Team-approval vote: everyone active gets a vote, majority yes needed.
    // Approving unanimously guarantees it passes on the first attempt, every
    // time — no retry logic to script.
    await generalPage.waitForTimeout(500);
    for (const page of fivePlayerPages) {
      const approveBtn = page.getByRole('button', { name: 'APPROVE' });
      if (await approveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await approveBtn.click();
      }
    }

    // GM manually starts the secret vote once the team is approved.
    await gm.waitForTimeout(600);
    await gm.getByRole('button', { name: 'Take Secret Vote' }).click();

    // Only the proposed team gets a mission vote. SUCCESS needs a second
    // confirming click (the "Confirm Your Choice" modal) — SABOTAGE would
    // too, but isn't used here (see the file header for why).
    await gm.waitForTimeout(500);
    for (const teammate of teammates) {
      const page = fivePlayerPages[PLAYER_NAMES.indexOf(teammate)];
      const successBtn = page.getByRole('button', { name: 'SUCCESS' });
      if (await successBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await successBtn.click();
        await page.getByRole('button', { name: 'CONFIRM' }).click();
      }
    }

    await gm.waitForTimeout(600);
    await expect(gm.getByText('MISSION SUCCESS')).toBeVisible();

    // Dismissing clears `room.voting`, which is what lets BattalionSelector
    // (and the next round's team-size requirement) reappear.
    await gm.getByRole('button', { name: 'Dismiss' }).click();
    await gm.waitForTimeout(500);
  }

  // --- Play to 3 wins ---
  // MISSION_CONFIGS[5]'s team sizes are [2, 3, 2, 3, 3] — only the first
  // three rounds are needed, since every round here is guaranteed to succeed.
  await playMissionRound(2);
  await playMissionRound(3);
  await playMissionRound(2);

  // --- The Final Betrayal ---
  // Whoever's character is Mir Jafor sees a list of the other four players'
  // names; anyone else sees a "searching..." holding message. Which one that
  // is was never tracked — it's discovered here, the same as the General was.
  const mirJafor = await findPageWithText(
    fivePlayerPages,
    PLAYER_NAMES,
    /Identify \*\*Mir Madan\*\*/,
  );
  expect(mirJafor, 'exactly one page should show the assassination target picker').not.toBeNull();

  const targetButtons = mirJafor!.page
    .getByRole('dialog', { name: 'Final betrayal phase' })
    .getByRole('button');
  // `attemptAssassination` (the backend handler) reaches a genuine "OVER"
  // state regardless of who's targeted — WHICH target is picked doesn't
  // matter for this test, only that the game concludes.
  await targetButtons.first().click();

  // --- Every player should see the game conclude ---
  for (const page of fivePlayerPages) {
    await expect(page.getByRole('dialog', { name: 'Game result' })).toBeVisible({
      timeout: 10_000,
    });
  }
});
