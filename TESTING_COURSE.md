# Frontend Testing Course — Vitest, Playwright, GitHub Actions

A hands-on course using this repo as the material. Started 2026-09-05. Runs across many sessions.

**This file is the source of truth for where we are.** It is committed to the repo so that any
session — human or Claude — can pick the course up cold.

---

## ⚑ You are here

**Level 1 is done.** 94 tests passing, 0 todo, `npm run typecheck` clean, lint clean. All four
`constants.test.ts` exercises plus `routeSeo.test.ts` 5a/5b reviewed and correct.

**Next action:** start **Level 2 — Extract, then test** — the most important level. Read the
Working agreement's Level 2 checklist below before writing anything: it starts with extracting
`src/components/VotingSystem/voteSelectors.ts` out of the component (the "untestable code is a
design problem" idea), then widening `VotingState.votes` to accept both wire formats, then
`tests/factories.ts` builders, then the worked example on `votesCastCount`.

Last worked: 2026-09-05.

---

## How to resume (read this first, Claude)

1. Read this whole file.
2. **Trust the verify commands over the checkboxes.** Checkboxes drift. Run the verify command for
   the last level marked done; if it fails, that level is not actually done.
3. Pick up at "You are here".
4. At the end of the session, update "You are here" and append a row to the Session log.

---

## Working agreement — important

This is a **course**, not a delivery. The learning happens when Mahir writes the tests.

- Claude explains the concept, writes **one** fully-commented worked example, then leaves the
  remaining cases as **stub tests with hints** (`it.todo` or a failing stub + a comment).
- **Claude does NOT fill in Mahir's exercises.** Not to be "helpful", not to save time, not even
  when the exercise looks trivial. If asked to review, review — point at what is wrong and why,
  don't paste the answer unless Mahir explicitly asks for the solution.
- Don't skip a level until the previous one's verify command passes.
- Explain *why* before *how*. The vocabulary is the hard part, not the syntax.

Exception: at Level 5 we agreed to reassess — Claude may write the 5-player E2E capstone, since it
teaches Playwright orchestration rather than testing fundamentals.

---

## Progress

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

```
[x] Step 0  Continuity scaffolding          verify: fresh session resumes correctly
[x] Level 0 Setup + first green test        verify: npm test
[x] Level 1 Table-driven tests              verify: npm test
[~] Level 2 Extract, then test              verify: npm test
[ ] Level 3 Component testing (RTL)         verify: npm test
[ ] Level 4 Mocks, timers, hooks            verify: npm test
[ ] Level 5 End-to-end (Playwright)         verify: npx playwright test
[ ] Level 6 GitHub Actions                  verify: green run in the Actions tab
[ ] Level 7 Polish                          verify: npm run lint && npm run build
```

### Step 0 — Continuity scaffolding
- [x] `TESTING_COURSE.md` (this file)
- [x] `CLAUDE.md` pointing here
- [x] Memory note pointing here
- [x] Verified: a cold session resumes correctly *(2026-09-05)*

### Level 0 — Setup + first green test
- [x] `TESTING.md` vocabulary primer
- [x] Vitest 3.2.7 installed + `test` block added to `vite.config.ts` (node env, `e2e/**` excluded)
- [x] Scripts: `test`, `test:watch`, `test:ui`, `coverage`, `typecheck`
      *(`test:ui` needs `@vitest/ui`, `coverage` needs `@vitest/coverage-v8` — installed when used)*
- [x] **Worked example (Claude):** `toAbsoluteUrl` in `src/seo/seoConfig.test.ts` — 4 tests
- [x] Exercise: `toAbsoluteImage` — absolute `http` URL passes through untouched
- [x] Exercise: `toAbsoluteImage` — path without leading slash gets one
- [x] Exercise: `toAbsoluteImage` — default argument used when called bare
- [x] Exercise: break an assertion on purpose, read the failure output

**Review notes (2026-09-05).** All three correct, lint-clean, `DEFAULT_IMAGE` imported rather than
hardcoded. Raised: (1) ex 3 exercises the *rooted-path* branch incidentally, because `DEFAULT_IMAGE`
starts with `/` — so a slash-handling break would fail a test named after the default argument, and
mislead. Coverage by accident still catches bugs but lies about where they are. A separate rooted-path
case would fail alongside it with an honest name. (2) Test data should be short and obviously fake —
`https://cdn.example.com/og.png`, not a real Pinterest URL with a 32-char hash. (3) Style: missing
semicolons / space after comma, inconsistent with the rest of the file. Ex 4 takeaway landed: a red
test means test and code *disagree*, not that the code is broken — his was a wrong expectation.

### Level 1 — Table-driven tests
- [x] **Worked example (Claude):** `src/constants.test.ts` — `it.each` over `SUPPORTED_PLAYER_COUNTS`
      (5 missions each), plus a 3-row spot-check table. Teaches: one test per row vs. a `for` loop;
      derived vs. hardcoded tables; `%i` name placeholders; guarding the lookup because
      `Record<number, T>` lets TS accept any key.
- [x] Exercise 1: `TEAM_DISTRIBUTIONS[n].nawabs + .eic === n` for counts 5–10
- [x] Exercise 2: EIC is always the minority faction
- [x] Exercise 3: mission team size never exceeds the player count *(30-row `flatMap` table)*
- [x] Exercise 4: `failsRequired` is 2 **iff** round 4 and 7+ players — both halves
- [x] Exercise 5a/5b: `resolveRouteSeo` fallback + known-path lookup *(`src/seo/routeSeo.test.ts`)*

**Review notes (2026-09-05).** First pass at exercise 1 used `Object.keys(distribution)` (an array)
then `for...in` over it — iterates the array's *indices* ("0","1"), not the object's keys, so
`distribution[item]` was `undefined` and the assertion failed with `NaN`. Caught by running the
suite, not by TypeScript — but a standalone probe confirmed `tsc --strict` does flag the underlying
pattern (`TS7053`, string-indexing a `{nawabs, eic}`), which esbuild-transpiled Vitest doesn't check.
Lesson landed: don't reimplement traversal logic inside a test; name the two fields directly instead
of summing "whatever's on the object" — reads as the spec, survives renames, can't have a loop bug.
Second pass (all 4 exercises + 5a/5b): correct, all prior naming issues fixed (`roundIndex` renamed to
`roundNumber` once shifted into 1-based space; `_roundNumber`/`playersInTeam`/`totalPlayerCount`
disambiguated). `npm run typecheck` clean, lint clean, 94 passing. One conceptual note carried
forward, not a defect: verified by hand (mutant test) that 5b doesn't yet discriminate a
"looks up the path" implementation from one that ignores its argument and always returns root —
true only because `ROUTE_SEO` has a single entry today, as the exercise comment itself predicts.
No action needed; becomes a real test the day a second route is added.

### Level 2 — Extract, then test  ← the most important level
- [ ] `src/components/VotingSystem/voteSelectors.ts` extracted
- [ ] `VotingState.votes` widened to `Record<string, "yes" | "no" | boolean>`
- [ ] `tests/factories.ts` — `makeRoom()` / `makePlayer()` builders
- [ ] **Worked example (Claude):** `votesCastCount` under both wire formats
- [ ] Exercise: `hasPlayerVoted`
- [ ] Exercise: `pendingVoters`
- [ ] Exercise: `voteTally`
- [ ] Exercise: edge cases — no votes cast, everyone voted
- [ ] Six `VotingSystem` call sites rewritten to use the selectors

### Level 3 — Component testing (React Testing Library)
- [ ] RTL + user-event + jest-dom + jsdom installed
- [ ] Vitest environments split (node for logic, jsdom for components); `e2e/**` excluded
- [ ] **Worked example (Claude):** `GameHeader`, plus the first `RoundTracker` case
- [ ] Exercise: `RoundTracker` — remaining player counts  *(exposes Steps.md #3)*
- [ ] Exercise: `IdentityCard` — click and keyboard flip, `aria-pressed`  *(exposes #4)*
- [ ] Exercise: `EnlistmentForm` — typing, disabled states, `vi.fn()` spies
- [ ] Exercise: `ObserverScreen`  *(exposes #2)*

### Level 4 — Mocks, timers, hooks  ← hardest level
- [ ] **Worked example (Claude):** `useNetworkStatus` via `renderHook`; `addEventListener` spy setup
- [ ] Exercise: `useOverlayA11y` proves the keydown listener leak  *(pins Steps.md #5)*
- [ ] Exercise: fake timers for the `copiedStatus` race  *(pins #8)*
- [ ] Exercise: fake timers for the `loadingAction` timeout  *(pins #7)*
- [ ] Exercise: two `GameDashboard` scenarios with `vi.mock` on the socket service

### Level 5 — End-to-end (Playwright)
- [ ] **Prerequisite:** `VITE_SOCKET_URL` wired up  *(Steps.md Step 2)*
- [ ] `@playwright/test` + `e2e/` + config with `webServer`
- [ ] `page.addInitScript` seeds `sessionStorage.intro_played` to skip the splash
- [ ] **Worked example (Claude):** tests 1 & 2, plus the two-context fixture
- [ ] Exercise: SEO — title, canonical, JSON-LD injected
- [ ] Exercise: create room → HQ code appears  *(backend required)*
- [ ] Exercise: capstone — 5 contexts play a full game  *(may be handed to Claude, see agreement)*
- [ ] Exercise: reconnect via `context.setOffline`  *(pins Steps.md #6 / Step 5)*
- [ ] Debug one deliberately broken test with `--ui` and the trace viewer

### Level 6 — GitHub Actions
- [ ] 6a `hello.yml` — smallest workflow that runs, then delete it
- [ ] 6b **Worked example (Claude):** `ci.yml` — checkout, setup-node w/ cache, `npm ci`, lint, typecheck, test, build
- [ ] 6c Exercise: matrix over Node 20 and 22
- [ ] 6d Exercise: Playwright job with `needs:`, browser cache, artifacts on `if: failure()`
- [ ] 6e Exercise: split fast (backend-free) vs full (dispatch + nightly) E2E workflows
- [ ] 6f Exercise: `concurrency`, PR triggers, branch protection, README badge
- [ ] Verified: a PR with a broken test goes red and is blocked

### Level 7 — Polish
- [ ] `vitest --coverage` configured; report read and discussed
- [ ] `README.md` rewritten (still the Vite template today)
- [ ] `TESTING.md` conventions section

---

## Session log

| Date | Level | What landed | Next |
|------|-------|-------------|------|
| 2026-09-05 | Step 0 | Course planned; scaffolding created | Finish Step 0, start Level 0 |
| 2026-09-05 | L0 | Cold resume confirmed. Vitest installed + configured; scripts added; `TESTING.md` written; `toAbsoluteUrl` worked example (4 green, 3 todo) | Mahir writes the 3 `toAbsoluteImage` tests |
| 2026-09-05 | L0 done, L1 | Mahir's 3 exercises green + reviewed (7 passing). L1 worked example written: `constants.test.ts` 9 green / 4 todo, `routeSeo.test.ts` 2 todo | Mahir writes the 6 L1 exercises |
| 2026-09-05 | L1 done | All 6 L1 exercises green + reviewed twice (typecheck bug found + fixed mid-review). 94 passing, 0 todo, typecheck clean, lint clean | Start Level 2 — extract `voteSelectors.ts` |

---

## Curriculum reference

Full detail on each level, kept here so this file stands alone.

### Why this repo works for learning
It has a natural difficulty ladder: pure functions (`src/seo/seoConfig.ts`) → pure data
(`src/constants.ts`) → prop-only components (`GameHeader`) → interactive components (`IdentityCard`,
`EnlistmentForm`) → hooks (`useNetworkStatus`, `useOverlayA11y`) → a 906-line stateful container
(`GameDashboard`) → a real socket.io backend for E2E.

It also has **real documented bugs** in `Steps.md` (on branch `fix/frontend-defects`), so tests here
catch genuine defects rather than hypothetical ones.

### Level goals in one line each
- **L0** — What a test is: `describe`/`it`/`expect`, Arrange-Act-Assert, the watch loop.
- **L1** — `it.each`; a test can encode a *rule*, not just an example.
- **L2** — Untestable code is a *design* problem. Extract logic out of JSX so it can be tested.
- **L3** — Query the DOM the way a user or screen reader does. Never by CSS class.
- **L4** — Control the world around the code: spies, module mocks, fake timers.
- **L5** — A real browser, real sockets, multiple simultaneous players.
- **L6** — Tests nobody runs are worthless. Make them run themselves.
- **L7** — Coverage honestly, docs, conventions.

### Order of work vs. the bug fixes
Tests come **before** the `Steps.md` fixes. Write the test that fails because of the bug, leave it
red with a `// FAILS: Steps.md #N` marker, then fix and watch it go green.

| Level | Steps.md step |
|---|---|
| L5 prereq | 2 — configurable socket URL |
| L3 | 3 — error boundary + guards |
| L4 | 4 — timer lifecycle |
| L4 | 5 — socket listener lifecycle |
| L4 | 6 — overlay hook order |
| L2 | 7 — vote selectors |
| L5 | 10 — smoke run |

### Environment facts (verified 2026-09-05)
- Node v20.20.2, npm 10.8.2
- Playwright Chromium already cached at `~/.cache/ms-playwright/chromium-1234`
- Backend: `/home/mahir/Repositories/palassy-game/palassy-backend` — `npm start`, port 3000.
  Rooms are in-memory; the Mongo connection failure is caught at `server.js:30-32`, so it boots
  without a database.
- GitHub: `iammahir2020/polashi_game_frontend` and `.../polashi_game_backend`; `gh` CLI authenticated.
- Course branch: `frontend-tests`.
- `npm run lint` is **already red on main**: 28 errors / 9 warnings, all pre-existing. Notably
  `src/components/VotingSystem/index.tsx` trips `react-hooks/rules-of-hooks` four times (hooks called
  after an early return) — that is Steps.md #6, and Levels 2/4 land on it. Don't treat this red as
  something the course broke.

### Time budget
~31–42 h total in the exercise-driven format; ~20–25 h on the agreed fast path (Claude takes the
Level 5 capstone, `Steps.md` fixes deferred). Levels 3–4 are deliberately *not* compressed.
