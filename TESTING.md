# Testing in this repo

The vocabulary first, the conventions second. If a word in a test file confuses you, it should be
defined here — if it isn't, add it.

---

## The vocabulary

**Test runner** — the program that finds your test files, runs them, and reports pass/fail. Ours is
**Vitest**. It reuses `vite.config.ts`, so tests see the same aliases, plugins and `import.meta.env`
the app does. (Jest is the older, more common runner; the API is near-identical, so Jest examples on
the internet mostly translate line for line.)

**Assertion** — one claim about a value: `expect(result).toBe('/play')`. A test is a handful of
assertions with setup around them.

**Matcher** — the part after `expect(...)`: `toBe`, `toEqual`, `toContain`, `toHaveBeenCalledWith`.
The two you will confuse:

| Matcher | Compares | Use for |
|---|---|---|
| `toBe` | identity (`Object.is`) | strings, numbers, booleans, "same object" |
| `toEqual` | structure, recursively | objects, arrays |

`expect({ a: 1 }).toBe({ a: 1 })` **fails** — two different objects. `toEqual` passes.

**Arrange–Act–Assert (AAA)** — the shape of a test. Set up inputs, call the thing once, check the
result. Keep the three parts visually separated; when a test fails you want to see instantly which
third is suspect.

**Unit test** — one function or module in isolation. Fast (milliseconds), and when it fails you know
exactly where the bug is.

**Component test** — a React component rendered into a fake DOM (jsdom), driven the way a user would
drive it. Slower than a unit test, but it tests the thing users actually touch. *(Level 3.)*

**End-to-end (E2E) test** — a real browser, the real app, the real backend. Slowest and flakiest, but
the only kind that proves the whole system is wired together. *(Level 5, Playwright.)*

The three form a **testing pyramid**: many unit tests, fewer component tests, a handful of E2E tests.
Inverting it gives you a suite that takes 20 minutes and fails randomly.

**Pure function** — same input always gives the same output, and it touches nothing else: no network,
no DOM, no clock, no module-level mutable state. Trivial to test. Much of Level 2 is about *making*
code pure so it becomes testable — untestable code is usually a design problem, not a testing problem.

**Fixture** — a canned piece of test data (a `Room`, a `Player`). **Factory** — a function that builds
one with sensible defaults so each test overrides only the field it cares about. We prefer factories;
they live in `tests/factories.ts`. *(Level 2.)*

**Spy** — a fake function that records how it was called: `vi.fn()`. **Mock** — replacing a whole
module with a fake: `vi.mock('../services/socket')`. **Stub** — a fake that just returns a canned
value. In practice people say "mock" for all three. *(Level 4.)*

**Fake timers** — `vi.useFakeTimers()` hands you the clock, so a `setTimeout(..., 3000)` can be
advanced instantly instead of actually waiting three seconds. *(Level 4.)*

**Flaky test** — passes and fails without the code changing. Usually a real timing bug in the test or
the code. Never fix one by re-running it; find the race.

**Regression test** — written to pin a bug you just fixed, so it can't come back. Write the test
*first*, watch it fail for the right reason, then fix — a test you never saw fail proves nothing.

**Coverage** — the percentage of lines/branches executed by the suite. Useful for finding code no test
touches at all. Useless as a target: 100% coverage with no meaningful assertions is 0% confidence.
*(Level 7.)*

**Test double / SUT** — jargon you'll meet elsewhere. "Test double" is the umbrella term for
spies/mocks/stubs; "SUT" is the system under test, i.e. the thing you're testing.

---

## Commands

| Command | What it does |
|---|---|
| `npm test` | Run everything once. This is what CI runs. |
| `npm run test:watch` | Re-run on save. **This is the one you develop with.** |
| `npm run test:ui` | Browser UI for the suite. Needs `@vitest/ui` (not installed yet). |
| `npm run coverage` | Coverage report. Needs `@vitest/coverage-v8` (Level 7). |
| `npm run typecheck` | `tsc -b --noEmit` — types only, no tests. |

Run a single file: `npx vitest run src/seo/seoConfig.test.ts`
Run tests whose name matches: `npx vitest run -t 'leading slash'`

---

## Conventions

- Unit and component tests are **colocated**: `seoConfig.ts` → `seoConfig.test.ts` beside it. You see
  the test when you open the folder, so it's harder to forget to update it.
- Playwright specs live in `e2e/` and are **excluded** from Vitest in `vite.config.ts`. The two
  runners both define a global called `test`; letting them meet is a bad afternoon.
- Import `describe`/`it`/`expect` from `vitest` explicitly. No magic globals.
- Query the DOM by **accessible role or text**, never by CSS class. Styling here is inline style
  objects, so there are no classes to query anyway — but the real reason is that a test which finds a
  button by `getByRole('button', { name: 'Vote yes' })` fails when the button stops being reachable by
  a screen reader, and a test that finds it by class does not. *(Level 3.)*
- A component test is a `*.test.tsx` file. `vite.config.ts` splits Vitest into two `projects`: `.ts`
  files run under `environment: 'node'` (fast, no DOM); `.tsx` files run under `jsdom` (a full DOM
  implementation in plain JS — the only way `render(<Component />)` has anywhere to render into).
  `tests/setupTests.ts` runs before every file in both projects: it registers jest-dom's matchers
  (`toBeInTheDocument`, `toBeEmptyDOMElement`, …) and calls RTL's `cleanup()` after each test so one
  test's rendered DOM doesn't leak into the next. *(Level 3.)*
- `getByX` throws if its query matches zero or more-than-one elements — right when you're asserting
  something is present. `queryByX` returns `null` instead of throwing — right when you're asserting
  something is *absent* (`getByX` would just throw before your assertion runs). `getAllByX` /
  `queryAllByX` are the plural forms for when more than one match is expected. `findByX` is async and
  waits for something to appear — Level 4. *(Level 3.)*
- Prefer the builders in `tests/factories.ts` over inline `Room` literals. *(Level 2.)*
- Test names are sentences that complete "it …". `it('works')` is not a test name.
- Never hardcode a value that comes from the environment (e.g. `SITE_URL` from `.env.local`). Import
  the constant instead, or the test passes on your machine and fails in CI.

---

## What not to test

- Third-party libraries. React works; socket.io works. Test *your* use of them.
- Implementation details — internal state names, private helpers, call order that doesn't matter.
  Tests that know too much about the inside break on every refactor and teach you to distrust them.
- Exact styling. Colours and pixel values change constantly and are better verified by eye.

The question to ask of any test before you keep it: **what change to the source would this catch?**
If the answer is "none" or "only a rename", delete it.
