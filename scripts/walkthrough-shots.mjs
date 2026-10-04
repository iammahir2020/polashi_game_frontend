// Takes the screenshots for the walkthrough on the How to play page by playing
// a real six-player game in Chromium, once on a phone-sized screen and once on
// a desktop one. Each shot is taken from the screen of the player who acts at
// that step, with the control to press outlined in gold.
//
// Needs the game running locally, with no DATABASE_URL so nothing is logged:
//   backend:  DATABASE_URL= CLIENT_URL=http://localhost:5173 MAX_ROOMS_PER_IP=0 npm start   (port 3000)
//   frontend: VITE_SOCKET_URL=http://localhost:3000/ npm run dev       (port 5173)
// then:
//   npm run walkthrough:shots              both sizes
//   npm run walkthrough:shots -- phone     one size
//
// Writes public/walkthrough/<slide id>-<phone|desktop>.webp. The slide ids and
// captions live in src/pages/HowToPlay/walkthroughSteps.ts; a unit test checks that
// every slide has both images.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const BASE = process.env.WALKTHROUGH_URL || 'http://localhost:5173';
const OUT = path.join(process.cwd(), 'public', 'walkthrough');
const NAMES = ['Asha', 'Bilal', 'Chandra', 'Dipa', 'Emon', 'Farhan'];
// Mir Jafor and Mir Madan are always in; these complete 4 Nawabs and 2 EIC for six players.
const EXTRA_CHARACTERS = ['রায় দুর্লভ', 'নবাব সিরাজউদ্দৌলা', 'লুৎফুন্নিসা বেগম', 'মোহনলাল'];
const MIR_JAFOR = 'মীর জাফর';
const MIR_MADAN = 'মীর মদন';
const TEAM_SIZES = [2, 3, 4]; // MISSION_CONFIGS[6], rounds 1-3
// The five round circles (RoundTracker has no label to find it by).
const TRACKER = 'div:has(> div > div > span:text-is("1")):has(> div > div > span:text-is("5"))';

const PROFILES = {
  phone: {
    context: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    width: 600,
  },
  desktop: {
    context: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    width: 1440,
  },
};

const GLOW_CSS = `
  .wt-glow {
    outline: 3px solid #ffd54a !important;
    outline-offset: 4px !important;
    box-shadow: 0 0 0 7px rgba(255, 213, 74, 0.28), 0 0 26px 8px rgba(255, 213, 74, 0.65) !important;
  }`;

async function checkServers() {
  for (const [name, url] of [['frontend', BASE], ['backend', 'http://localhost:3000/']]) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      throw new Error(`The ${name} isn't reachable at ${url} (${err.message}). See the top of this file.`);
    }
  }
}

async function run(profileName) {
  const profile = PROFILES[profileName];
  const browser = await chromium.launch();
  const taken = [];
  try {
    const pages = [];
    for (let i = 0; i < NAMES.length; i++) {
      const context = await browser.newContext(profile.context);
      await context.addInitScript(() => sessionStorage.setItem('intro_played', 'true'));
      pages.push(await context.newPage());
    }
    const [host, bilal] = pages;
    const byName = (name) => pages[NAMES.indexOf(name)];

    // Outlines `targets`, scrolls the first one into view, and saves the screen.
    async function shoot(id, page, targets = []) {
      await page.addStyleTag({ content: GLOW_CSS });
      for (const target of targets) {
        await target.first().evaluate((el) => el.classList.add('wt-glow'));
      }
      if (targets.length) {
        // Scroll only when the control is off screen or hugging an edge, so screens
        // that fit stay as players see them.
        await targets[0].first().evaluate((el) => {
          const r = el.getBoundingClientRect();
          const margin = window.innerHeight * 0.08;
          if (r.top < margin || r.bottom > window.innerHeight - margin) el.scrollIntoView({ block: 'center' });
        });
      }
      await page.waitForTimeout(400);
      const png = await page.screenshot({ animations: 'disabled' });
      for (const target of targets) {
        await target.first().evaluate((el) => el.classList.remove('wt-glow')).catch(() => {});
      }
      const file = path.join(OUT, `${id}-${profileName}.webp`);
      await sharp(png).resize({ width: profile.width }).webp({ quality: 72 }).toFile(file);
      taken.push(id);
      console.log(`  ${id}`);
    }

    // On a phone the room code sits in a drawer; on a desktop it is always shown.
    async function openDrawer(page) {
      const toggle = page.getByRole('button', { name: 'Toggle operative drawer' });
      if (!(await toggle.isVisible().catch(() => false))) return async () => {};
      await toggle.click();
      await page.waitForTimeout(400);
      return () => toggle.click();
    }

    // Returns the page currently showing `text`.
    async function findPage(text) {
      for (let attempt = 0; attempt < 20; attempt++) {
        for (const page of pages) {
          if (await page.getByText(text).first().isVisible().catch(() => false)) return page;
        }
        await host.waitForTimeout(250);
      }
      throw new Error(`No player's screen shows ${text}`);
    }

    // --- Create a room and share it ---
    await host.goto(BASE);
    await host.getByPlaceholder('Enter Alias...').waitFor({ timeout: 90_000 });
    await host.getByPlaceholder('Enter Alias...').fill(NAMES[0]);
    await shoot('create-room', host, [host.getByRole('button', { name: 'Establish New HQ' })]);
    await host.getByRole('button', { name: 'Establish New HQ' }).click();
    const codeText = host.getByText(/^[A-Z0-9]{6}$/);
    await codeText.waitFor();
    const roomCode = await codeText.innerText();
    const closeDrawer = await openDrawer(host);
    await shoot('share-code', host, [host.getByRole('button', { name: 'INVITE ALLIES' }), host.getByText(roomCode, { exact: true })]);
    await closeDrawer();

    // --- Everyone else joins ---
    for (let i = 1; i < pages.length; i++) {
      const page = pages[i];
      await page.goto(BASE);
      await page.getByPlaceholder('Enter Alias...').waitFor({ timeout: 90_000 });
      await page.getByPlaceholder('Enter Alias...').fill(NAMES[i]);
      await page.getByPlaceholder('Enter HQ Code').fill(roomCode);
      if (page === bilal) {
        await shoot('join-room', page, [
          page.getByRole('button', { name: 'Infiltrate Existing HQ' }),
          page.getByPlaceholder('Enter HQ Code'),
        ]);
      }
      await page.getByRole('button', { name: 'Infiltrate Existing HQ' }).click();
      await page.getByText(/^[A-Z0-9]{6}$/).waitFor();
    }

    // --- Lobby and characters ---
    await host.getByText(/Battalion ready: 6/).waitFor({ timeout: 10_000 });
    await shoot('lobby', host, [host.getByRole('button', { name: 'Begin Campaign' })]);
    await host.getByRole('button', { name: 'Begin Campaign' }).click();
    for (const name of EXTRA_CHARACTERS) await host.getByRole('button', { name }).click();
    await shoot('choose-characters', host, [host.getByRole('button', { name: 'START GAME' })]);
    await host.getByRole('button', { name: 'START GAME' }).click();
    await host.getByRole('button', { name: 'Appoint General' }).waitFor({ timeout: 10_000 });

    // --- Everyone reads their card; the script notes who is who ---
    const roles = new Map();
    for (let i = 0; i < pages.length; i++) {
      const card = pages[i].getByRole('button', { name: 'Toggle identity card' });
      await card.click();
      await pages[i].waitForTimeout(300);
      roles.set(NAMES[i], (await card.locator('h1').innerText()).trim());
      if (pages[i] === bilal) await shoot('identity', bilal, [card]);
      await card.click();
    }
    const nameOfRole = (role) => [...roles].find(([, r]) => r === role)[0];

    // --- Three rounds, all successful ---
    for (let round = 1; round <= 3; round++) {
      if (round === 1) await shoot('appoint-general', host, [host.getByRole('button', { name: 'Appoint General' })]);
      await host.getByRole('button', { name: 'Appoint General' }).click();
      await host.waitForTimeout(2500); // the announcement animation
      for (const page of pages) {
        const dialog = page.getByRole('dialog', { name: 'General assigned' });
        if (await dialog.isVisible().catch(() => false)) await dialog.click();
      }

      const generalPage = await findPage('Assemble Your Battalion');
      const general = NAMES[pages.indexOf(generalPage)];
      const team = NAMES.filter((n) => n !== general).slice(0, TEAM_SIZES[round - 1]);
      for (const name of team) await generalPage.getByRole('button', { name, exact: true }).click();
      const callVote = generalPage.getByRole('button', { name: /Initiate Council Vote/i });
      if (round === 1) {
        await shoot('pick-team', generalPage, [callVote, ...team.map((name) => generalPage.getByRole('button', { name, exact: true }))]);
      }
      await callVote.click();

      const voter = pages.find((p) => p !== generalPage && p !== host);
      const approve = voter.getByText('APPROVE', { exact: true });
      await approve.waitFor();
      if (round === 1) {
        await shoot('council-vote', voter, [approve.locator('..'), voter.getByText('REJECT', { exact: true }).locator('..')]);
      }
      for (const page of pages) {
        const button = page.getByRole('button', { name: 'APPROVE' });
        if (await button.isVisible().catch(() => false)) await button.click();
      }

      const secretVote = host.getByRole('button', { name: 'Take Secret Vote' });
      await secretVote.waitFor();
      if (round === 1) await shoot('verdict', host, [secretVote]);
      await secretVote.click();

      let first = true;
      for (const name of team) {
        const page = byName(name);
        const success = page.getByRole('button', { name: 'SUCCESS' });
        await success.waitFor({ timeout: 5_000 });
        if (round === 1 && first) {
          await shoot('mission-vote', page, [success, page.getByRole('button', { name: 'SABOTAGE' })]);
        }
        await success.click();
        const confirm = page.getByRole('button', { name: 'CONFIRM' });
        if (round === 1 && first) await shoot('confirm-vote', page, [confirm]);
        await confirm.click();
        first = false;
      }

      await host.getByText('MISSION SUCCESS').waitFor();
      const dismiss = host.getByRole('button', { name: 'Dismiss' });
      if (round === 1) await shoot('mission-result', host, [dismiss]);
      await dismiss.click();
      await host.waitForTimeout(600);

      if (round === 2) {
        // The round 2 General now holds the Guptochor.
        const spyPage = generalPage;
        const watcher = pages.find((p) => p !== spyPage && p !== host);
        await shoot('round-tracker', watcher, [watcher.locator(TRACKER)]);
        // The SPY buttons sit next to each name in the player list, which starts collapsed.
        const spy = spyPage.getByRole('button', { name: /SPY/i }).first();
        const roster = spyPage.getByRole('button', { name: /MARSHALLED/i });
        // Collapsed lists still count as "visible" to Playwright, so read the ▼ on the toggle.
        const collapsed = (await roster.isVisible().catch(() => false)) && (await roster.innerText()).includes('▼');
        if (collapsed) {
          await roster.click();
          await spyPage.waitForTimeout(900); // let the list finish opening
        }
        await shoot('guptochor', spyPage, [spy]);
        if (collapsed) await roster.click();
      }
    }

    // --- Mir Jafor's final strike: he guesses wrong, so the Nawabs win ---
    const mirJafor = byName(nameOfRole(MIR_JAFOR));
    const strike = mirJafor.getByRole('dialog', { name: 'Final betrayal phase' });
    await strike.waitFor({ timeout: 10_000 });
    const wrongGuess = NAMES.find((n) => n !== nameOfRole(MIR_JAFOR) && n !== nameOfRole(MIR_MADAN));
    await shoot('mir-jafor', mirJafor, [strike.getByRole('button', { name: wrongGuess, exact: true })]);
    await strike.getByRole('button', { name: wrongGuess, exact: true }).click();

    const result = host.getByRole('dialog', { name: 'Game result' });
    await result.waitFor({ timeout: 10_000 });
    await shoot('game-over', host, [result.getByRole('button', { name: 'PREPARE NEW CAMPAIGN' })]);

    // Close the room so repeated runs don't pile up rooms on the local server.
    await result.getByRole('button', { name: 'Close result' }).click().catch(() => {});
    await host.getByRole('button', { name: /close hq/i }).click({ timeout: 5_000 }).catch(() => {
      console.warn('  (could not close the room; the local server sweeps it later)');
    });
    return taken;
  } finally {
    await browser.close();
  }
}

const requested = process.argv[2];
const profiles = requested ? [requested] : Object.keys(PROFILES);
for (const name of profiles) if (!PROFILES[name]) throw new Error(`Unknown size "${name}"; use phone or desktop`);

await checkServers();
fs.mkdirSync(OUT, { recursive: true });
for (const name of profiles) {
  console.log(`${name}:`);
  const taken = await run(name);
  console.log(`  ${taken.length} screenshots`);
}
