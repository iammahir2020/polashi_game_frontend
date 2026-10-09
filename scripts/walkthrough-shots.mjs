// Takes the screenshots for the walkthrough on the How to play page by playing
// a real six-player game in Chromium, on a phone-sized screen and on a desktop
// one, in English and in Bangla. Each shot is taken from the screen of the
// player who acts at that step, with the control to press outlined in gold.
//
// Needs the game running locally, with no DATABASE_URL so nothing is logged:
//   backend:  DATABASE_URL= CLIENT_URL=http://localhost:5173 MAX_ROOMS_PER_IP=0 npm start   (port 3000)
//   frontend: VITE_SOCKET_URL=http://localhost:3000/ npm run dev       (port 5173)
// then:
//   npm run walkthrough:shots                 both sizes, both languages
//   npm run walkthrough:shots -- phone        one size
//   npm run walkthrough:shots -- bn desktop   one language, one size
//
// Writes public/walkthrough/<slide id>-<phone|desktop>.webp (English) and
// public/walkthrough/bn/... (Bangla). The slide ids and captions live in
// src/pages/HowToPlay/walkthroughSteps.ts; a unit test checks that every slide
// has both images in both languages. Buttons are found by the game's own labels,
// read from src/i18n through Vite, so the script follows any change of wording.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { createServer } from 'vite';

const BASE = process.env.WALKTHROUGH_URL || 'http://localhost:5173';
const LANGS = ['en', 'bn'];
const outDir = (lang) => path.join(process.cwd(), 'public', 'walkthrough', ...(lang === 'bn' ? ['bn'] : []));
const PLAYER_NAMES = {
  en: ['Asha', 'Bilal', 'Chandra', 'Dipa', 'Emon', 'Farhan'],
  bn: ['আশা', 'বিলাল', 'চন্দ্রা', 'দীপা', 'ইমন', 'ফারহান'],
};
// Character names as the server sends them (in Bangla); shown via the i18n helpers.
// Mir Jafor and Mir Madan are always in; these complete 4 Nawabs and 2 EIC for six players.
const EXTRA_CHARACTERS = ['রায় দুর্লভ', 'নবাব সিরাজউদ্দৌলা', 'লুৎফুন্নিসা বেগম', 'মোহনলাল'];
const MIR_JAFOR = 'মীর জাফর';
const MIR_MADAN = 'মীর মদন';
const TEAM_SIZES = [2, 3, 4]; // MISSION_CONFIGS[6], rounds 1-3
// The five round circles (RoundTracker has no label to find it by).
const trackerSelector = (one, five) =>
  `div:has(> div > div > span:text-is("${one}")):has(> div > div > span:text-is("${five}"))`;

// The game's own wording in one language, loaded from src/i18n the way the
// build's prerender step loads app code.
async function loadI18n(lang) {
  const vite = await createServer({
    configFile: false,
    root: process.cwd(),
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const core = await vite.ssrLoadModule('/src/i18n/core.ts');
    const characters = await vite.ssrLoadModule('/src/i18n/characters.ts');
    return {
      t: (key, vars) => core.translate(lang, key, vars),
      num: (n) => core.localizeDigits(n, lang),
      character: (bangla) => characters.characterName({ id: 0, name: bangla, description: '', color: '', team: 'Nawabs' }, lang),
    };
  } finally {
    await vite.close();
  }
}

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

async function run(profileName, lang) {
  const profile = PROFILES[profileName];
  const { t, num, character } = await loadI18n(lang);
  const NAMES = PLAYER_NAMES[lang];
  const OUT = outDir(lang);
  const button = (page, key, vars) => page.getByRole('button', { name: t(key, vars), exact: true });
  const browser = await chromium.launch();
  const taken = [];
  try {
    const pages = [];
    for (let i = 0; i < NAMES.length; i++) {
      const context = await browser.newContext(profile.context);
      await context.addInitScript((language) => {
        sessionStorage.setItem('intro_played', 'true');
        localStorage.setItem('lang', language);
      }, lang);
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
      const toggle = button(page, 'drawer.toggle');
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
    await host.getByPlaceholder(t('enlist.alias')).waitFor({ timeout: 90_000 });
    await host.getByPlaceholder(t('enlist.alias')).fill(NAMES[0]);
    await shoot('create-room', host, [button(host, 'enlist.create')]);
    await button(host, 'enlist.create').click();
    const codeText = host.getByText(/^[A-Z0-9]{6}$/);
    await codeText.waitFor();
    const roomCode = await codeText.innerText();
    const closeDrawer = await openDrawer(host);
    await shoot('share-code', host, [button(host, 'invite.button'), host.getByText(roomCode, { exact: true })]);
    await closeDrawer();

    // --- Everyone else joins ---
    for (let i = 1; i < pages.length; i++) {
      const page = pages[i];
      await page.goto(BASE);
      await page.getByPlaceholder(t('enlist.alias')).waitFor({ timeout: 90_000 });
      await page.getByPlaceholder(t('enlist.alias')).fill(NAMES[i]);
      await page.getByPlaceholder(t('enlist.code')).fill(roomCode);
      if (page === bilal) {
        await shoot('join-room', page, [
          button(page, 'enlist.join'),
          page.getByPlaceholder(t('enlist.code')),
        ]);
      }
      await button(page, 'enlist.join').click();
      await page.getByText(/^[A-Z0-9]{6}$/).waitFor();
    }

    // --- Lobby and characters ---
    await host.getByText(t('launcher.ready', { count: 6 })).waitFor({ timeout: 10_000 });
    await shoot('lobby', host, [button(host, 'launcher.begin')]);
    await button(host, 'launcher.begin').click();
    for (const name of EXTRA_CHARACTERS) await host.getByRole('button', { name: character(name) }).click();
    await shoot('choose-characters', host, [button(host, 'picker.start')]);
    await button(host, 'picker.start').click();
    await button(host, 'launcher.appoint').waitFor({ timeout: 10_000 });

    // --- Everyone reads their card; the script notes who is who ---
    const roles = new Map();
    for (let i = 0; i < pages.length; i++) {
      const card = button(pages[i], 'identity.toggle');
      await card.click();
      await pages[i].waitForTimeout(300);
      roles.set(NAMES[i], (await card.locator('h1').innerText()).trim());
      if (pages[i] === bilal) await shoot('identity', bilal, [card]);
      await card.click();
    }
    const nameOfRole = (role) => [...roles].find(([, r]) => r === role)[0];

    // --- Three rounds, all successful ---
    for (let round = 1; round <= 3; round++) {
      if (round === 1) await shoot('appoint-general', host, [button(host, 'launcher.appoint')]);
      await button(host, 'launcher.appoint').click();
      await host.waitForTimeout(2500); // the announcement animation
      for (const page of pages) {
        const dialog = page.getByRole('dialog', { name: t('general.aria') });
        if (await dialog.isVisible().catch(() => false)) await dialog.click();
      }

      const generalPage = await findPage(t('battalion.title'));
      const general = NAMES[pages.indexOf(generalPage)];
      const team = NAMES.filter((n) => n !== general).slice(0, TEAM_SIZES[round - 1]);
      for (const name of team) await generalPage.getByRole('button', { name, exact: true }).click();
      const callVote = button(generalPage, 'battalion.startVote');
      if (round === 1) {
        await shoot('pick-team', generalPage, [callVote, ...team.map((name) => generalPage.getByRole('button', { name, exact: true }))]);
      }
      await callVote.click();

      const voter = pages.find((p) => p !== generalPage && p !== host);
      const approve = voter.getByText(t('vote.approve'), { exact: true });
      await approve.waitFor();
      if (round === 1) {
        await shoot('council-vote', voter, [approve.locator('..'), voter.getByText(t('vote.reject'), { exact: true }).locator('..')]);
      }
      for (const page of pages) {
        const approveButton = button(page, 'vote.approve');
        if (await approveButton.isVisible().catch(() => false)) await approveButton.click();
      }

      const secretVote = button(host, 'vote.takeSecret');
      await secretVote.waitFor();
      if (round === 1) await shoot('verdict', host, [secretVote]);
      await secretVote.click();

      let first = true;
      for (const name of team) {
        const page = byName(name);
        const success = button(page, 'vote.success');
        await success.waitFor({ timeout: 5_000 });
        if (round === 1 && first) {
          await shoot('mission-vote', page, [success, button(page, 'vote.sabotage')]);
        }
        await success.click();
        const confirm = button(page, 'vote.confirm');
        if (round === 1 && first) await shoot('confirm-vote', page, [confirm]);
        await confirm.click();
        first = false;
      }

      await host.getByText(t('vote.missionSuccess')).waitFor();
      const dismiss = button(host, 'vote.dismiss');
      if (round === 1) await shoot('mission-result', host, [dismiss]);
      await dismiss.click();
      await host.waitForTimeout(600);

      if (round === 2) {
        // The round 2 General now holds the Guptochor.
        const spyPage = generalPage;
        const watcher = pages.find((p) => p !== spyPage && p !== host);
        await shoot('round-tracker', watcher, [watcher.locator(trackerSelector(num(1), num(5)))]);
        // The SPY buttons sit next to each name in the player list, which starts collapsed.
        const spy = spyPage.getByRole('button', { name: t('roster.spy') }).first();
        const roster = spyPage.getByRole('button', { name: t('roster.marshalled').trim() });
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
    const mirJafor = byName(nameOfRole(character(MIR_JAFOR)));
    const strike = mirJafor.getByRole('dialog', { name: t('mir.aria') });
    await strike.waitFor({ timeout: 10_000 });
    const wrongGuess = NAMES.find((n) => n !== nameOfRole(character(MIR_JAFOR)) && n !== nameOfRole(character(MIR_MADAN)));
    await shoot('mir-jafor', mirJafor, [strike.getByRole('button', { name: wrongGuess, exact: true })]);
    await strike.getByRole('button', { name: wrongGuess, exact: true }).click();

    const result = host.getByRole('dialog', { name: t('result.aria') });
    await result.waitFor({ timeout: 10_000 });
    await shoot('game-over', host, [button(result, 'result.newCampaign')]);

    // Close the room so repeated runs don't pile up rooms on the local server.
    await button(result, 'result.closeAria').click().catch(() => {});
    await button(host, 'console.close').click({ timeout: 5_000 }).catch(() => {
      console.warn('  (could not close the room; the local server sweeps it later)');
    });
    return taken;
  } finally {
    await browser.close();
  }
}

const args = process.argv.slice(2);
for (const arg of args) {
  if (!PROFILES[arg] && !LANGS.includes(arg)) throw new Error(`Unknown option "${arg}"; use phone, desktop, en or bn`);
}
const profiles = args.filter((a) => PROFILES[a]).length ? args.filter((a) => PROFILES[a]) : Object.keys(PROFILES);
const langs = args.filter((a) => LANGS.includes(a)).length ? args.filter((a) => LANGS.includes(a)) : LANGS;

await checkServers();
for (const lang of langs) {
  fs.mkdirSync(outDir(lang), { recursive: true });
  for (const name of profiles) {
    console.log(`${lang} ${name}:`);
    const taken = await run(name, lang);
    console.log(`  ${taken.length} screenshots`);
  }
}
