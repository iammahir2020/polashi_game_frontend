/**
 * LEVEL 0 — WORKED EXAMPLE
 *
 * Read this file top to bottom before writing your own tests. Everything you
 * need for the exercises at the bottom is demonstrated here.
 *
 * WHY WE START HERE
 * `toAbsoluteUrl` is a *pure function*: same input, same output, no network, no
 * DOM, no clock, no global state. Pure functions are the easiest thing in any
 * codebase to test, because a test is just "call it and check what came back".
 * Most of this course is about dragging harder code back toward this shape.
 */

// `describe`, `it` and `expect` are imported explicitly rather than being magic
// globals. Vitest can inject them globally (`globals: true` in the config), but
// importing them means TypeScript and ESLint can see where they come from, and
// anyone reading the file knows which test runner this is.
import { describe, it, expect } from 'vitest';

import { DEFAULT_IMAGE, SITE_URL, toAbsoluteImage, toAbsoluteUrl } from './seoConfig';

// `describe` groups related tests. The string is a *subject* — usually the name
// of the unit under test. Groups can nest; the names are joined with " > " in
// the output, so keep them short.
describe('toAbsoluteUrl', () => {
  // `it` declares one test. Read the whole line aloud:
  //   "it prefixes a rooted path with the site URL"
  // If that sentence isn't a true statement about the code, the name is wrong.
  // A good name says what the code *should do*, not what the test *does*, so
  // never write `it('works')` or `it('test 1')` — when it fails at 2am the name
  // is the only thing you get to read first.
  it('prefixes a rooted path with the site URL', () => {
    // ARRANGE — set up the inputs.
    //
    // Note what we are careful NOT to do here: hardcode the literal string
    // "https://the-great-polashi-game.vercel.app". That value comes from
    // VITE_SITE_URL in .env.local, so it differs between your machine and CI.
    // A test that hardcodes it passes for you and fails for everyone else.
    // Depending on the same constant the code depends on keeps the test honest
    // about what it is actually asserting: the *joining rule*, not the domain.
    const path = '/how-to-play';

    // ACT — call the thing under test, exactly once, and keep the result.
    const result = toAbsoluteUrl(path);

    // ASSERT — compare against the expected value.
    //
    // `toBe` is Object.is: right for strings, numbers, booleans and identity.
    // For objects and arrays you want `toEqual`, which compares structurally —
    // `expect({ a: 1 }).toBe({ a: 1 })` fails, `toEqual` passes. Reaching for
    // `toBe` on an object is the single most common beginner failure.
    expect(result).toBe(`${SITE_URL}/how-to-play`);
  });

  // This trio — Arrange, Act, Assert — is the shape of nearly every test you
  // will write. Keeping them visually separate is worth the blank lines: when a
  // test fails you want to see at a glance which third of it you mistrust.

  it('adds a leading slash to a bare path', () => {
    // The interesting behaviour: callers may pass "rules" rather than "/rules",
    // and the function is supposed to normalise that. Without this test, someone
    // could delete the `startsWith('/')` branch and every other test would still
    // pass — which is the real question to ask of any test you write:
    // "what change to the source would this catch?"
    const result = toAbsoluteUrl('rules');

    expect(result).toBe(`${SITE_URL}/rules`);
  });

  it('falls back to the site root when called with no argument', () => {
    // Default parameters are behaviour too, and they are easy to break by
    // accident — `path = '/'` is one character away from being deleted.
    // Calling with no argument is the only way to exercise that line.
    const result = toAbsoluteUrl();

    expect(result).toBe(`${SITE_URL}/`);
  });

  it('does not double up the slash on an already-rooted path', () => {
    // A regression test for a bug that does not exist yet. It pins the current
    // behaviour so that a future "fix" to the slash handling can't silently
    // produce "https://site.com//play".
    expect(toAbsoluteUrl('/play')).not.toContain('//play');
  });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * YOUR EXERCISES
 *
 * `toAbsoluteImage` sits directly below `toAbsoluteUrl` in seoConfig.ts. Go and
 * read it first — notice it has one branch `toAbsoluteUrl` doesn't.
 *
 * Turn each `it.todo` into a real `it(name, () => { ... })`. `it.todo` is a
 * legitimate tool, not just a course device: it reports as "todo" in the output,
 * so a test you know you need but haven't written yet stays visible instead of
 * being forgotten in a notebook.
 *
 * Run `npm run test:watch` in a second terminal while you work. It re-runs on
 * every save, which turns the feedback loop from minutes into about a second —
 * that loop is most of the value of having tests at all.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe('toAbsoluteImage', () => {
  // EXERCISE 1
  // HINT: this is the branch `toAbsoluteUrl` doesn't have. An image URL that is
  // already absolute (an og:image on a CDN, say) must come back completely
  // untouched — SITE_URL must not appear in the result at all. Pick an input
  // starting with "http" and assert the output is identical to the input.
  it('returns an absolute http URL unchanged', ()=>{
    const url = 'https://cdn.example.com/og.png'
    const result = toAbsoluteImage(url)
    expect(result).toBe(url)
  });

  // EXERCISE 2
  // HINT: same normalisation rule as `toAbsoluteUrl`, and you have already seen
  // the pattern above. Do not hardcode the domain.
  it('adds a leading slash to a bare image path', ()=>{
    const result = toAbsoluteImage('og-card.png')
    expect(result).toBe(`${SITE_URL}/og-card.png`)
  });

  // EXERCISE 3
  // HINT: the default here is not '/', it is the DEFAULT_IMAGE constant — which
  // seoConfig.ts exports, so you can import it alongside SITE_URL. Call the
  // function bare and assert you get the absolute form of that constant.
  it('uses DEFAULT_IMAGE when called with no argument', ()=>{
    expect(toAbsoluteImage()).toBe(`${SITE_URL}${DEFAULT_IMAGE}`)
  });

  // EXERCISE 4 — not a test, an experiment. Do it last, and do not commit it.
  // Make one of your passing assertions wrong on purpose (change an expected
  // string), save, and READ the failure output carefully. Find in it:
  //   - which file and line number failed
  //   - the "expected" vs "received" diff, and which side is which
  //   - the test name you wrote, and whether it told you anything useful
  // Then put it back. Knowing how to read a red test is the actual skill; a
  // test suite you can't debug is worse than no test suite.
});
