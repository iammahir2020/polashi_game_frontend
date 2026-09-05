# Frontend Testing Course — Vitest, Playwright, GitHub Actions

A hands-on course using this repo as the material. Started 2026-09-05. Runs across many sessions.

**This file is the source of truth for where we are.** It is committed to the repo so that any
session — human or Claude — can pick the course up cold.

---

## ⚑ You are here

**Level 3 is done.** All five components (`GameHeader`, `RoundTracker`, `IdentityCard`,
`EnlistmentForm`, `ObserverScreen`) have full test coverage. **Working agreement changed mid-level**
(see "Working agreement" section above): from `IdentityCard` onward, Claude writes complete test
coverage directly — Mahir asked to switch from exercise-driven to worked-examples-only, since his goal
is understanding, not typing practice. `GameHeader` and `RoundTracker` predate that change and were
genuinely exercise-driven (see review notes for what went wrong and was fixed, across several rounds).

**Next action:** start **Level 4 — Mocks, timers, hooks**, the hardest level in the curriculum
(`useNetworkStatus`/`renderHook`, `useOverlayA11y`'s listener leak, two fake-timer races, `vi.mock` on
the socket service). Per the new working agreement, Claude writes this in full too.

Verify with `npm test && npm run typecheck` — 158 passing + 3 intentionally red (Steps.md #2, #3, #4 —
each pinned by its own test, all correctly asserting the DESIRED behavior so they'll flip green when
someone actually fixes the underlying bug), typecheck clean, lint unchanged (37 pre-existing).

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

**Changed 2026-09-05, mid-Level-3** (see session log). Levels 0–2 and the start of Level 3 were
exercise-driven: Mahir wrote every case, Claude wrote one worked example per level and stub tests with
hints for the rest. Mahir then explicitly asked to switch: **Claude now writes complete worked
examples for everything, for the rest of the course.** His stated reason: the goal is to *understand*
testing, not to build retention through writing his own attempts. This is a standing change, not a
one-off — don't drift back to stubs-and-hints without him asking again.

- Claude explains the concept, then writes **full, comprehensive, heavily-commented test coverage**
  for the file/feature at hand — every case worth showing, not one example plus `it.todo`s.
- Comments carry the teaching now, since Mahir isn't producing his own attempts to learn from. Explain
  *why* before *how* — the vocabulary is the hard part, not the syntax — same as before.
- Don't skip a level until the previous one's verify command passes.
- If Mahir writes something himself (exploring an idea, say), review it honestly.

Levels 0–2 and part of Level 3 remain genuinely exercise-driven history — don't rewrite what he already
wrote and got reviewed. This change applies going forward from here.

---

## Progress

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

```
[x] Step 0  Continuity scaffolding          verify: fresh session resumes correctly
[x] Level 0 Setup + first green test        verify: npm test
[x] Level 1 Table-driven tests              verify: npm test
[x] Level 2 Extract, then test              verify: npm test
[~] Level 3 Component testing (RTL)         verify: npm test
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
- [x] `src/components/VotingSystem/voteSelectors.ts` extracted — `hasPlayerVoted`, `votesCastCount`,
      `pendingVoters`, `voteTally`. Implements Steps.md Step 7.
- [x] `VotingState.votes` widened to `Record<string, "yes" | "no" | boolean>` (`src/types/game.ts`)
- [x] `tests/factories.ts` — `makeRoom()` / `makePlayer()` / `makeVotingState()` builders
- [x] **Worked example (Claude):** `votesCastCount` under both wire formats
      (`voteSelectors.test.ts`, 2 tests)
- [x] Exercise: `hasPlayerVoted` — 4 tests (plain vote, missing key, redacted `true`, redacted `false`)
- [x] Exercise: `pendingVoters` — 4 tests (needs `makePlayer`)
- [x] Exercise: `voteTally` — 3 tests
- [x] Exercise: edge cases — empty votes map, everyone voted (both covered, split across the
      relevant describe blocks rather than a separate section — fine, that's an organization choice)
- [x] Six `VotingSystem` call sites rewritten to use the selectors (`:34` hasVoted, `:38`/`:41`
      pendingTeamApprovalVoters/pendingSecretVoters via `selectPendingVoters`, `:144` progress via
      `votesCastCount`, `:263`/`:265` tallies via `voteTally`)

**Infra review notes (2026-09-05).** Two things worth a future session knowing:
1. Two of the six rewritten call sites were correctness fixes today, not just forward-compat —
   `!(p.id in currentVotes)` treated key *presence* as "voted", and the progress counter counted keys
   rather than votes. Both are silently wrong the day the backend starts sending
   `{playerId: false}` pre-populated entries; both are now correct under either wire format.
2. Added `tsconfig.test.json` (referenced from root `tsconfig.json`) because `tests/` was not
   included by `tsconfig.app.json` (`include: ["src"]`) or `tsconfig.node.json`
   (`include: ["vite.config.ts"]`) — `tests/factories.ts` would have silently never been typechecked,
   in CI either, the same class of gap as the `roundIndex` unused-parameter catch in Level 1 but at
   the project-config level instead of the code level. Verified with `tsc -b --listFiles` before and
   after.

### Level 3 — Component testing (React Testing Library)
- [x] RTL 16 + user-event 14 + jest-dom 6 + jsdom 25 installed
- [x] Vitest split into `test.projects`: `node` for `*.test.ts`, `jsdom` for `*.test.tsx` (both
      `extends: true` from shared root config); `e2e/**` still excluded. Used `projects`, not the
      simpler `environmentMatchGlobs`, because Vitest 3.2.7 deprecates the latter (confirmed via a
      run — it printed a deprecation warning) in favor of the former.
- [x] `tests/setupTests.ts` — jest-dom matchers (`@testing-library/jest-dom/vitest`) + RTL
      `cleanup()` in `afterEach`, wired via `test.setupFiles`
- [x] `src/vitest-matchers.d.ts` — re-states the jest-dom/vitest type reference from inside `src/` so
      `tsconfig.app.json` (which only includes `src`) can see the matcher types; without it,
      `.toBeInTheDocument()` etc. type-checked fine at the setup file but errored (TS2339) on every
      `.test.tsx` file, because a `declare module` augmentation is only visible within the same
      TS project/compilation as the file that declares it
- [x] **Worked example (Claude):** `GameHeader/index.test.tsx` (3 tests — the whole component, no
      exercises assigned here per the course plan) + `RoundTracker/index.test.tsx` first 2 cases
      (happy path; guard-clause "renders nothing" via `queryByText`/`toBeEmptyDOMElement`)
- [x] Exercise: `RoundTracker` — remaining player counts, `it.each` deriving expected badges from
      `MISSION_CONFIGS`, not hand-typed. **Written by Claude at Mahir's explicit request** after two
      review rounds — see notes below. Not free of the "he writes it" rule; flagged as an exception.
- [x] Exercise: `RoundTracker` — malformed `roundHistory` throws  *(exposes Steps.md #3, stays red
      on purpose)* — see review notes below; two review rounds, both bugs Mahir's own
- [x] `IdentityCard` — click and keyboard flip, `aria-pressed`, observer vs. assigned-player mode,
      secret-intel disabled/enabled  *(13 tests; exposes Steps.md #4, stays red on purpose — the real
      crash is one line earlier than Steps.md's citation, at `isNawab`'s `.includes` call, same root
      cause: `character` truthy doesn't guarantee `character.team` defined)*. **Written fully by
      Claude** — first file under the new working agreement.
- [x] `EnlistmentForm` — guard clause, typing, all disabled-state combinations (`it.each`), click
      spies, HQ-code-field lock while loading  *(21 tests)*. **Written fully by Claude.** Hit and
      corrected a real controlled-input testing pitfall — see review notes.
- [x] `ObserverScreen` — team-column split (including a genuine mixed-roster test, not just
      one-team-at-a-time), `activePlayerIds` filtering, live-vote message, embedded `RoundTracker`
      integration  *(8 tests; exposes Steps.md #2, stays red on purpose)*. **Written fully by Claude.**

**Infra review notes (2026-09-05).** `environmentMatchGlobs` (the option initially reached for, by
direct analogy to the docs comment already in `vite.config.ts` from Level 0) worked but printed
`"environmentMatchGlobs" is deprecated. Use test.projects instead` on every run — caught by actually
running the suite once, not just by it going green. Replaced with `test.projects`, which needed no
new dependency, just restructuring: two project entries, each `extends: true` off the shared
plugins/exclude/setupFiles. Test output now labels each file's project (`|node|` / `|jsdom|`),
confirming the split is real, not just configured. Separately, `src/vitest-matchers.d.ts` closed a
type-visibility gap of the same shape as Level 2's `tsconfig.test.json` fix: a global augmentation
declared inside a file that isn't part of a given TS project is invisible to that project, even
though the runtime behavior (the matcher actually existing on `expect`) is unaffected. Both gaps were
caught by explicitly running `npm run typecheck` rather than trusting `npm test` alone — the same
lesson from Level 1's `roundIndex` bug, now recurring at the tooling-config level twice in a row.

**Exercise review notes (2026-09-05) — `RoundTracker` player-count exercise.** Round 1: Mahir's own
hint (mine, in the stub comment) was itself wrong — it suggested importing `SUPPORTED_PLAYER_COUNTS`
from `constants.test.ts`, which silently re-ran that file's entire 81-test suite a second time inside
`RoundTracker`'s run (importing a module executes it; a test file's top-level `describe`/`it` calls
are side effects of that). Caught by noticing the file's own test count (90, not ~7). Also present:
`expect(getByText(...)).toBe('2P')` (element vs. string, can never pass) and a `getByText` call that
throws on a 5-player game because two rounds share a "2P" badge (`getByText` assumes uniqueness).
Mahir asked for a stronger hint, then explicitly asked Claude to write the fix. Claude did: moved
`SUPPORTED_PLAYER_COUNTS` into `tests/factories.ts` (a real module both test files import from, never
each other), replaced the per-mission `getByText`/`toBe` with a tallied `getAllByText`/`toHaveLength`
per distinct team size. 118 passing, 1 todo (the Steps.md #3 exercise), typecheck clean, lint clean.
Recorded in memory (`testing-course-working-agreement`): an explicit "write/fix it" request is
complied with directly, no further pushback — but the default for anything short of that stays
review-plus-hints.

**Exercise review notes (2026-09-05) — `RoundTracker` malformed-data exercise (Steps.md #3).** Also
exposed a bad hint of Claude's, this time about the *shape* of a test-before-fix, not just an import:
the hint said to assert `.toThrow()`, which describes the CURRENT buggy behavior and so passes today
— exactly backwards from the course's own stated rule ("write the test that fails because of the bug,
leave it red... then fix and watch it go green," CLAUDE.md/TESTING_COURSE.md). A green "it crashes"
test signals nothing in CI and would flip to a confusing red the day someone actually fixes the bug.
Corrected to `.not.toThrow()` — asserts the desired, post-fix behavior, genuinely fails today. Round 2:
Mahir's first attempted fix removed the malformed `roundHistory: undefined` override along with the
assertion flip, so the "fixed" test rendered a perfectly valid room — passed, but for the wrong
reason (nothing left to test). Round 3: both pieces restored together — malformed override + `as
unknown as Room` cast + `.not.toThrow()` — now fails with the real `TypeError` from Steps.md #3
(`Cannot read properties of undefined (reading '0')`), which is success at this stage: a red test
that stays red until someone actually adds the `?.` guard or normalizes the room upstream. Scope note
carried forward: this test only proves `RoundTracker` itself is fragile to a malformed prop; the
planned Steps.md fix normalizes the room one layer up in `GameDashboard`, so this specific test may or
may not flip green from that fix alone depending on whether `RoundTracker` also gets touched directly.
118 tests total, 117 passing + 1 intentionally red, typecheck clean, lint clean. **Level 3's
`RoundTracker` file is done** — `IdentityCard`, `EnlistmentForm`, `ObserverScreen` remain for this
level.

**Working agreement changed here (2026-09-05).** Mahir asked to stop writing exercises himself and
have Claude write full worked examples for everything remaining, stating his goal is understanding,
not retention through typing practice. Recorded in `CLAUDE.md`, this file's "Working agreement"
section, and memory (`testing-course-working-agreement`). Applies from `IdentityCard` onward.

**`IdentityCard`, `EnlistmentForm`, `ObserverScreen` — written fully by Claude, first files under the
new agreement.** Added `makeCharacter()` to `tests/factories.ts` (same reasoning as `makePlayer`/
`makeRoom` — a real character has 5 fields, most tests only care about `team`). All three follow the
same Steps.md pattern already established: a malformed-data test that asserts `.not.toThrow()` (the
DESIRED behavior), genuinely fails today, and will flip green once the real guard lands — not
`.toThrow()`, which would pass today for the wrong reason. Found and fixed one real bug in each of two
files before they were "done":
- **`IdentityCard`:** none in the test logic — clean on the first full run. One thing worth noting:
  Steps.md #4 cites `character?.team.toUpperCase()`, but the actual crash happens one line EARLIER, at
  `isNawab`'s `character.team.includes("Nawabs")` — `===` against `undefined` is safe, `.includes()`
  on it is not. Same root cause (`character` truthy doesn't imply `character.team` defined), different
  line than the one named in `Steps.md`.
- **`EnlistmentForm`:** a genuine, well-known controlled-input testing pitfall — the first draft typed
  into the name/HQ-code fields with a bare `vi.fn()` spy standing in for `setName`/`setRoomCode` and
  asserted the LAST call carried the full typed string ("Alice"). It didn't — React resets a
  controlled input's real DOM value back to its (unchanging, since the spy never updates real state)
  prop after every keystroke, so each `onChange` only ever reported the single most-recently-typed
  character. Confirmed by actually running it (failed with `"e"` where `"Alice"` was expected), not
  assumed. Fixed with a small stateful wrapper component (`ControlledHarness`) mirroring what the real
  parent (`GameDashboard`) does — the standard, necessary pattern for testing any controlled input.
  Kept one spy-only single-keystroke test alongside it, which also hit a dead end worth keeping as a
  comment: manually doing `input.value = 'A'; input.dispatchEvent(new Event('input'))` fires zero
  times, because assigning `.value` directly bypasses the tracked native setter React's change
  detection relies on — `user-event` goes through real key dispatch and does trigger it.
- **`ObserverScreen`:** none — clean on the first full run, including a deliberate "mixed roster, not
  one-team-at-a-time" test (proves the split is actually team-based, which two single-team tests can't
  distinguish from "first player here, second player there").

161 tests total, 158 passing + 3 intentionally red (Steps.md #2, #3, #4), typecheck clean, lint
unchanged (37 pre-existing, none new). **Level 3 is fully done.**

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
| 2026-09-05 | L2 infra | Extracted `voteSelectors.ts` (Steps.md #7), widened `VotingState.votes`, rewrote 6 call sites, added `tests/factories.ts` + `tsconfig.test.json` (closed a real typecheck coverage gap), worked example `votesCastCount` (2 green, 8 todo). 96 passing, typecheck clean, lint unchanged (8 pre-existing) | Mahir writes the 6 L2 exercises |
| 2026-09-05 | L2 done | All 10 exercises + 2 edge cases green, one review round (factory-fragility in `pendingVoters` fixed). 107 passing, typecheck clean, lint clean. Committed and pushed. | Start Level 3 |
| 2026-09-05 | L3 infra | RTL/user-event/jest-dom/jsdom installed; Vitest split into `test.projects` (node/jsdom) after `environmentMatchGlobs` proved deprecated; `tests/setupTests.ts` + `src/vitest-matchers.d.ts` (closed a type-visibility gap, same shape as L2's); worked examples `GameHeader` (3 tests) + `RoundTracker` first 2 cases. 112 passing, 2 todo, typecheck clean, lint unchanged (37 pre-existing) | Mahir writes the 2 `RoundTracker` exercises |
| 2026-09-05 | L3 partial | `RoundTracker` player-count exercise: Mahir's attempt exposed a bad hint from Claude (importing from `constants.test.ts` re-ran its whole suite) plus a `toBe`/`getByText` misuse; after one review round and a stronger hint, Mahir explicitly asked Claude to write the fix, which it did (tally + `getAllByText`). Malformed-`roundHistory` exercise (Steps.md #3) still open. 118 passing, 1 todo, typecheck clean, lint clean | Mahir writes the last `RoundTracker` exercise, then `IdentityCard`/`EnlistmentForm`/`ObserverScreen` |
| 2026-09-05 | L3 `RoundTracker` done | Steps.md #3 exercise: another bad Claude hint (`.toThrow()` — asserts current buggy behavior, passes today; should assert desired behavior via `.not.toThrow()`, red until fixed). Round 1 fix dropped the `as unknown as Room` cast (typecheck red). Round 2 fix dropped the malformed data along with fixing the assertion (passed for the wrong reason — nothing left to test). Round 3: all three pieces together — genuinely red now, with the real Steps.md #3 TypeError. `RoundTracker/index.test.tsx` fully done. 117 passing + 1 intentionally red, typecheck clean, lint clean | `IdentityCard`, `EnlistmentForm`, `ObserverScreen` — no worked example written yet |
| 2026-09-05 | **Working agreement changed** — L3 fully done | Mahir asked Claude to write full test coverage for everything remaining (understanding over retention). Wrote `IdentityCard` (13 tests, clean first pass, found the real crash is one line before Steps.md #4's citation), `EnlistmentForm` (21 tests; caught + fixed a real controlled-input pitfall — spy-only typing tests reported single characters, not the full string, because React resets an unchanging controlled value after every keystroke; fixed with a stateful harness), `ObserverScreen` (8 tests, clean first pass). Added `makeCharacter()` to `tests/factories.ts`. 161 tests total, 158 passing + 3 intentionally red (Steps.md #2/#3/#4), typecheck clean, lint unchanged | Start Level 4 — Claude writes it in full |

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
