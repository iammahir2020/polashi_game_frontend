# Frontend Testing Course — Vitest, Playwright, GitHub Actions

A hands-on course using this repo as the material. Started 2026-09-05. Runs across many sessions.

**This file is the source of truth for where we are.** It is committed to the repo so that any
session — human or Claude — can pick the course up cold.

---

## ⚑ You are here

**Level 5 is fully done.** All of it: infra (`@playwright/test`, `playwright.config.ts`,
`tsconfig.e2e.json`), the `VITE_SOCKET_URL` prerequisite, the worked example (`app.spec.ts`), SEO
(`seo.spec.ts`), create-room (`create-room.spec.ts`), reconnect exposing Steps.md #6
(`reconnect.spec.ts`, intentionally red), the 5-context capstone (`capstone.spec.ts`), and the
`--ui`/trace-viewer debugging walkthrough (done hands-on by Mahir against a temporary broken test
Claude set up and then deleted — not part of the real suite). 9/9 e2e tests (8 passing + 1
intentionally red).

**Deliberately NOT starting Level 6 yet** — Mahir has something else to do first. Whatever that turns
out to be, come back to this file to resume Level 6 (GitHub Actions) afterward: `6a hello.yml`, then
the worked example `ci.yml`.

Verify: `npm test && npm run typecheck` — 187 passing + 6 intentionally red (Steps.md #2, #3, #4, #5,
#7, #8), typecheck clean, lint unchanged (37 pre-existing). `npm run e2e` — 8 passed + 1 intentionally
red (Steps.md #6).

Last worked: 2026-09-06.

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
[x] Level 3 Component testing (RTL)         verify: npm test
[x] Level 4 Mocks, timers, hooks            verify: npm test
[x] Level 5 End-to-end (Playwright)         verify: npx playwright test
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
- [x] **`useNetworkStatus`** via `renderHook` — mount value, `online`/`offline` event flips (`act()`
      required around manual `dispatchEvent`, see review notes), add/remove listener spies including
      same-function-identity check  *(5 tests)*
- [x] **`useOverlayA11y`** — focus/listener add on activate, no-op while inactive, cleanup on unmount
      and across `isActive` toggles, Escape closes, Tab focus trap (wrap forward/backward, no-op in
      the middle, refocus container when nothing focusable)  *(13 tests)*. Proves the HOOK'S OWN
      contract; does NOT by itself pin Steps.md #5 — see next item and the file's own scope note.
- [x] **`GeneralReveal`** — renders the real conditional-early-return pattern Steps.md #5 describes,
      pins the leak directly by rendering the actual component through an open→close cycle and
      counting `document` add/remove calls  *(4 tests; the 2 leak tests expose Steps.md #5, stay red
      on purpose — one proves a single cycle leaks by exactly one listener, the other proves it
      compounds linearly rather than being a one-time off-by-one)*
- [x] **`tests/mockSocketService.ts`** — a comprehensive stand-in for the whole singleton (~30
      methods) so mounting the full `GameDashboard` doesn't throw "X is not a function" from one of
      its ~10 effects that a given test isn't otherwise testing
- [x] **`GameDashboard`** — all four remaining pieces in one file, `index.test.tsx` *(4 tests)*:
  - Two `vi.mock` scenarios: a simulated `"roomJoined"` event replaces the enlistment form with the
    room; a simulated `"error"` event shows the server's message. Both drive the mock by capturing
    the callback `GameDashboard` registered (`socketService.onRoomJoined.mock.calls.at(-1)`) and
    calling it directly, inside `act()` since it's a state update outside any React-recognized event.
  - The `loadingAction` race *(pins Steps.md #7, stays red on purpose)* — create fails at t=4000,
    join starts at t=4000, create's OWN stale 5s timer fires at t=5000 and wrongly clears the join
    that still has 4 seconds left on its own timeout. Reproduced entirely from the `room: null` lobby
    state — no need to enter the "in room" tree at all.
  - The `copiedStatus` race *(pins Steps.md #8, stays red on purpose)* — same shape, one component
    over: copy code at t=0, copy link at t=500, code's stale 2s timer fires at t=2000 and wrongly
    clears link's status 500ms before link's own window (due at t=2500) ends. This one DOES need
    `room` truthy (`OperativeDrawer`, where the copy buttons live, only renders inside `{room && ...}`)
    — rendered without any other child component crashing on the first real attempt. Needed a
    `navigator.clipboard` mock (jsdom has none) and `window.isSecureContext` forced `true` (jsdom's
    default test origin doesn't count as secure, which would silently divert `handleCopy` to its
    `execCommand` fallback path instead).

**Review notes (2026-09-05).**
1. **A real config bug, found writing `useNetworkStatus.test.ts`.** The Level 3 project split (by file
   EXTENSION: `.test.ts` → node, `.test.tsx` → jsdom) assumed no-JSX meant no-DOM-needed. A hook test
   using `renderHook` has no JSX (so it's a plain `.test.ts`) but still needs `window`/`document`/
   `navigator` — jsdom only. First run failed with `ReferenceError: document is not defined` under the
   `node` project. Fixed in `vite.config.ts`: inverted to an explicit `NODE_ONLY_TESTS` allowlist (4
   known pure-logic files), with `jsdom` as the default for everything else in `src/**` and
   `tests/**`. Chosen deliberately over the reverse: a file that doesn't need a DOM but gets one anyway
   just runs a little slower; a file that needs one and doesn't get it fails outright, which is exactly
   what happened. The allowlist is one array referenced from both projects' configs (include on one
   side, exclude on the other) so the two can't drift apart.
2. **`act()` is required around a manually-dispatched DOM event that triggers a React state update.**
   `window.dispatchEvent(new Event('online'))` called bare left `result.current` still `false` —
   confirmed by running it, not assumed. `render`/`fireEvent`/`user-event` all wrap themselves in
   `act()`; a raw dispatch you fire yourself does not, so the assertion can run before React has
   actually applied the update. Wrapping the dispatch in `act(() => { ... })` fixed it.
3. **`GeneralReveal`'s own props bug**, caught and fixed before the file was "done": the first draft of
   `openProps()` used `flipping: true`, which renders the "Consulting the Commanders..." spinner phase,
   not the name-reveal phase — so the "shows the general's name" test failed for a reason that had
   nothing to do with the component being broken, only the test's fixture being wrong. Fixed by using
   `flipping: false` (the reveal phase) as the shared "open" fixture.
4. **Confirmed real GeneralReveal lint errors (`react-hooks/rules-of-hooks` ×2) are pre-existing, not
   new** — whole-repo lint is still 37 problems after adding this test file; they were already counted
   in that baseline, just not previously visible because no one had scoped `eslint` to that one
   directory before. They're the exact bug being pinned, not a regression.
5. **`vi.mock`'s factory referencing an imported helper is safe** — no `vi.hoisted()` needed here,
   because `makeMockSocketService` is an IMPORTED binding, not a local `const`; ES modules hoist
   imports themselves, so there's no temporal-dead-zone risk the way there would be for a plain local
   variable. `vi.hoisted()` is only needed to share a *locally declared* value across the mock factory
   and the test body.
6. **`vi.mocked(...)` is a type-only cast, not a runtime operation** — needed because TypeScript
   resolves `socketService`'s type from the REAL `services/socket.ts` (it has no idea `vi.mock`
   swapped it at runtime), so `.mock.calls` doesn't exist on that type as far as the compiler's
   concerned without this cast.
7. **`fireEvent`, not `user-event`, for typing while fake timers are active.** `user-event`'s
   realistic per-keystroke simulation schedules its own small delays via REAL timers internally,
   which just hang forever once `vi.useFakeTimers()` is on. `fireEvent.change` fires one raw event
   synchronously — the right tool once timer control matters more than realistic key-by-key behavior.
8. **A debugging false alarm, worth remembering the shape of:** the first run of the `copiedStatus`
   test failed on the FINAL assertion, but scrollback truncation made it look like an EARLIER one
   (right after the second copy click) had failed instead. Added temporary `console.log`s to check —
   they showed the earlier assertion was fine; the failure really was the intended one, at the
   intended line. Removed the debug logs once confirmed. Moral: when a failure's location is
   ambiguous from truncated output, verify which assertion actually threw before treating it as a bug
   in the test — don't fix a step that was never broken.

161 tests at the end of Level 3 -> 187 now (5 `useNetworkStatus` + 13 `useOverlayA11y` + 4
`GeneralReveal` + 4 `GameDashboard` = 26 new). 181 passing + 6 intentionally red (Steps.md
#2/#3/#4/#5/#7/#8), typecheck clean, lint unchanged. **Level 4 is fully done.**

### Level 5 — End-to-end (Playwright)
- [x] **Prerequisite:** `VITE_SOCKET_URL` wired up  *(Steps.md Step 2)* — `socket.ts` now reads
      `import.meta.env.VITE_SOCKET_URL || "<old hardcoded URL>"` (`||` not `??`, so an empty var also
      falls back), the 3 commented-out LAN IPs deleted, `VITE_SOCKET_URL` added to `ImportMetaEnv` in
      `vite-env.d.ts`. `.env.local` already had the var set. Verified: typecheck clean, lint unchanged
      (37 pre-existing), all 187 tests unchanged (181 passing + 6 intentionally red).
- [x] `@playwright/test` 1.63.0 + `e2e/` + `playwright.config.ts` with `webServer` (`npm run dev` on
      `http://localhost:5173`, `reuseExistingServer` outside CI) + `tsconfig.e2e.json` (closed a
      typecheck-coverage gap of the same shape as Level 2/3's — `playwright.config.ts` and `e2e/`
      weren't included by any existing tsconfig project)
- [x] `page.addInitScript` / `context.addInitScript` seeds `sessionStorage.intro_played` to skip the
      splash — used directly in one worked-example test, and wrapped into `e2e/fixtures.ts` for reuse
- [x] **Worked example (Claude):** `e2e/app.spec.ts` — test 1 (splash skipped when seeded), test 2
      (splash shown + proceed button when not seeded, proving test 1's skip is really doing something),
      plus a fixture demo (two independent player contexts, proven independent by typing into one and
      checking the other's field is untouched)  *(3 tests, all passing against the real dev server, no
      backend needed — the join/create screen renders regardless of whether the socket connects)*
- [x] **`e2e/seo.spec.ts`** — title, canonical link shape, JSON-LD count + `@type` values  *(3 tests,
      all passing, no backend needed)*. Design note worth keeping: `index.html` already ships
      matching static title/description/OG tags (written by `scripts/generate-seo-files.mjs`-adjacent
      hand-maintained HTML, not by this test's target code) — so the title and canonical assertions
      would still pass even if `RouteSeoManager` were deleted from `App.tsx` entirely. The JSON-LD
      assertion is the one with real teeth: nothing in the static HTML matches
      `script[data-seo-jsonld]`, so it can only pass if `SeoHead`'s `useEffect` genuinely ran.
      Canonical asserted by SHAPE (`^https:\/\/.+\/$`), not the literal domain — the domain comes
      from `VITE_SITE_URL`, the same kind of environment-dependent value Level 0 warned against
      hardcoding. Title IS hardcoded, deliberately — `SITE_NAME`/`SITE_ALT_NAME` are app content, not
      environment config, so the risk category is different; also, directly importing `seoConfig.ts`
      into a Playwright spec isn't safe, since it reads `import.meta.env` at module load time, which
      Vite provides and plain Node does not.
- [x] **`e2e/create-room.spec.ts`** — the first test in the whole course where a real client talks to
      a real (local) server: creates a room, waits for the enlistment form to disappear, asserts a
      6-character room code appears (matched by SHAPE — `^[A-Z0-9]{6}$` — since the backend generates
      it randomly; there's no fixed value to assert against, same principle as the canonical-URL
      test). `playwright.config.ts`'s `webServer` now sets `VITE_SOCKET_URL=http://localhost:3000/`
      for the dev server it starts, overriding `.env.local`'s production URL just for this process —
      the actual payoff of Level 5's `VITE_SOCKET_URL` prerequisite. Confirmed the local backend's
      CORS (`origin: process.env.CLIENT_URL || "*"`) is wide open by default before relying on it.
      *(1 test, passed first run)*
- [x] **`e2e/reconnect.spec.ts`** — exposes Steps.md #6  *(1 test, stays red on purpose)*. Not via
      `context.setOffline` in the end — see review notes for what was actually tried, what didn't work
      and why, and what got built instead (a dev-only `window.__socketService` hook + a direct
      listener-count check).
- [x] **`e2e/capstone.spec.ts`** — 5 simulated players (new `fivePlayerPages` fixture in
      `e2e/fixtures.ts`) create a room, select characters, and play 3 mission rounds to completion,
      through the Mir Jafor assassination phase, to a genuine `"Game result"` dialog on all 5 pages
      *(1 test, ~36s, passed 3/3 consecutive runs against different random General/Mir Jafor
      assignments each time)*. Design note worth keeping — see review notes: every mission vote is
      SUCCESS, never SABOTAGE, and that's not a simplification, it's the only way to make the test
      deterministic at all, since character assignments are genuinely redacted per-player by the
      backend (confirmed by reading the real broadcast payload) and a Nawab clicking SABOTAGE silently
      submits "Yes" anyway.
- [x] Debug one deliberately broken test with `--ui` and the trace viewer — Claude set up a
      temporary `e2e/broken-example.spec.ts` (a copy of `app.spec.ts`'s first test with the alias
      placeholder text subtly wrong: `'Enter Your Alias...'` vs. the real `'Enter Alias...'`),
      confirmed it failed cleanly (not a hang) and that `--trace on` produced a real `trace.zip`
      before handing it off. Mahir found the mismatch via `--ui` mode's timeline/DOM-snapshot/locator
      picker and the trace viewer, fixed it, deleted the practice file. Not something to keep in the
      real suite — the exercise was the process, not a permanent test.

**Review notes (2026-09-06).**
1. **The cached chromium (`chromium-1234`) didn't match this Playwright version.** `@playwright/test`
   1.63.0 expects chromium revision 1243, not 1234 — the earlier environment note was recorded against
   an older/different Playwright install. `npx playwright install chromium` downloaded 1243 (~300MB);
   confirmed by simply running the tests rather than assuming the cached browser would work.
2. **A real ESLint config gap**, same *shape* as the tsconfig gaps in Levels 2/3/5 but a different
   tool: `react-hooks`/`react-refresh` were applied to every `.ts`/`.tsx` file in the repo with no
   scoping, so Playwright's own fixture convention — naming the second callback argument `use` — got
   flagged by `react-hooks/rules-of-hooks` as though it were React's `use()` hook, purely by name
   collision, in a file with no React import at all. Fixed by scoping those two plugins to
   `src/**/*.{ts,tsx}` only in `eslint.config.js`, leaving the base JS/TS rules for everywhere else.
   Whole-repo lint count unchanged at 37 after the fix, confirming nothing on `src/**` was lost.
3. **`tsconfig.e2e.json` needs the `DOM` lib**, unlike `tsconfig.test.json`/`tsconfig.node.json` — even
   though the `.spec.ts` files themselves run in Node, callbacks passed to `page.addInitScript` are
   serialized and executed INSIDE the real browser, referencing `window`/`sessionStorage`. Without
   `"DOM"` in `lib`, typecheck failed with `Cannot find name 'window'` inside those callbacks specifically.
4. Added `test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/` to `.gitignore` —
   none existed before Playwright was installed, all appear the first time a run finishes.

All 3 e2e tests passed on the first real run against the actual dev server — no reproduction-and-fix
cycle needed for the tests' own logic this time, only for the surrounding tooling (chromium version,
ESLint scope, tsconfig lib). `npm test` unchanged (187 total, 181 passing + 6 intentionally red),
typecheck clean, lint unchanged (37 pre-existing).

**Review notes (2026-09-06, continued) — the reconnect test (Steps.md #6), the most honest process of
the whole course so far.**

Backend confirmed reachable (`http://localhost:3000` — Mahir started `../palassy-backend` in a
separate window), CORS confirmed wide open by default (`origin: process.env.CLIENT_URL || "*"`, unset).
`playwright.config.ts`'s `webServer.env` now overrides `VITE_SOCKET_URL` to point the dev server it
starts at the local backend, without touching `.env.local`.

**First attempt genuinely failed to reproduce the bug, and that result was reported honestly rather
than papered over.** The obvious approach — two player contexts, one goes offline
(`context.setOffline(true)`) then back online, check the roster recovers — was actually run (not just
imagined), twice: once via a bare reload, once via a real two-context offline/online cycle with a
second player leaving mid-outage. **Both passed.** Steps.md's own verify criterion needs internal
socket state (`socketService.socket.listeners("roomUpdated").length`) unreachable from outside the
app — no `window` hook existed to check it. Rather than guess further or quietly ship a test that
"passed" without actually exercising the bug, this was stopped and put to Mahir directly via
`AskUserQuestion` — he chose to add a debug hook and test it properly.

**Added `window.__socketService`** in `socket.ts`, guarded by `import.meta.env.DEV` (Vite statically
replaces this with `false` in a production build, so the whole block is dead code there and gets
stripped — never ships). Typed via a new `e2e/global.d.ts` ambient declaration (a minimal LOCAL shape,
not an import of the app's real `SocketService` class — keeps `tsconfig.e2e.json` decoupled from the
app's internals). Confirmed lint/typecheck clean, whole-repo lint count unchanged (37).

**Then re-ran the ACTUAL experiment with the hook in place**, and the real mechanism turned out
narrower and more precise than either attempt had assumed: on a single, completely ordinary page load
(no offline/online cycling needed at all) — `roomJoined`/`roomUpdated`/`errorMessage`/`kicked` every
one ends up at count 1 (correct!), while `connect`/`disconnect` end up at count **0**. React's
StrictMode (`main.tsx`) double-invokes every effect once on mount (mount → cleanup → mount again). The
main socket effect's cleanup calls `offAll()`, wiping every listener on the socket. `connect()` itself
is guarded by an `initialized` flag on the singleton that never resets, so the second mount pass
early-returns and never re-registers "connect"/"disconnect" — but the REST of that same effect's body
(the other four `.on(...)` calls) isn't gated by that flag at all, so each gets wiped once and
re-registered once on the second pass, landing back at the correct count by coincidence. Confirmed via
a throwaway diagnostic script run directly against the dev server (deleted once its purpose was
served) before writing the real spec — the actual numbers, not a guess.

`e2e/reconnect.spec.ts` (1 test) asserts the desired invariant (`connect`/`disconnect` count === 1
each) — fails today with the exact predicted 0/0, will flip green once Steps.md Step 5's real fix
(move "connect"/"disconnect" registration into the constructor, delete `initialized` entirely) lands.
Scope is stated honestly in the file's own header comment: this proves the listeners are gone, which
is the root mechanical bug and exactly what Steps.md's own verify criterion checks — it does NOT
independently prove a broken user journey, since the one journey actually tried by hand recovered fine
via the surviving `roomUpdated` listener.

8/8 e2e tests total (7 passing + 1 intentionally red), 187 Vitest unchanged, typecheck clean, lint
unchanged (37 pre-existing).

**Review notes (2026-09-06, continued) — the 5-context capstone.**

Read the actual game rules and backend handlers first (`startGame`, `assignGeneral`, `castVote`'s
resolution logic, `attemptAssassination`) before writing anything — this is the first test needing a
real, multi-step game state machine, not just one or two socket events.

**One assumption caught and corrected before it caused a wrong test:** initially assumed Mir Jafor
(character id 1) was team Nawabs and Mir Madan (id 8) was team EIC. The backend's actual
`CharacterList` has it the other way around — Mir Jafor is EIC, Mir Madan is Nawabs (a deliberate
game-design choice reflecting historical allegiance over nationality). Checked the real data before
writing the character-selection step rather than trusting the assumption — the NET selection count
needed (2 more Nawab clicks, 1 more EIC click) turned out unchanged either way, but hardcoding specific
character names under the wrong assumption would have broken the test outright.

**The real design constraint, confirmed by reading the server's broadcast logic, not assumed:**
`broadcastRoomUpdate` redacts every OTHER player's `character` field per recipient — a client only ever
sees its own role until `gameStatus === "OVER"`. That means a script driving these 5 clients has
exactly the same information a real player would: no way to know who's secretly EIC vs. Nawab mid-game.
Combined with the frontend's rule that a Nawab clicking SABOTAGE silently submits "Yes" anyway, this
means "have everyone attempt sabotage" is NOT deterministic — the actual fail count would depend on the
random character shuffle. "Have everyone always vote SUCCESS" sidesteps this entirely, since SUCCESS
resolves to "Yes" regardless of team. Chose this deliberately, documented why in the spec file itself,
rather than silently picking whichever produced a working test.

**Built incrementally against the real, running backend**, verifying actual DOM/behavior at each
stage via throwaway diagnostic scripts (deleted once each stage was confirmed and folded into the real
spec) rather than writing all ~200 lines blind:
- Confirmed `PlayerRoster`'s pre-game auto-active-selection (`GameDashboard` syncs `selectedActiveIds`
  to every joined player automatically, confirmed via source) meant no manual roster-clicking step was
  needed at all.
- Found a real locator ambiguity: `BattalionSelector`'s team-proposal buttons and `PlayerRoster`'s
  plain (non-interactive) roster rows can show the SAME player name simultaneously on the General's
  own screen — `getByText(name)` matched both; `getByRole('button', { name, exact: true })` correctly
  matches only the clickable one, since `PlayerRoster`'s rows are plain unlabeled `<div>`s (no
  accessible role at all — a real, minor accessibility gap, noted but out of scope to fix here) while
  `BattalionSelector`'s really are `<button>` elements.
- Confirmed which of the 5 clients is "General" and which is "Mir Jafor" are both determined by
  POLLING all 5 pages for whichever one shows the relevant UI text, never assumed or tracked — both
  are assigned randomly server-side, confirmed by running the flow 3 times and seeing a different
  assignment each time, all 3 passing.
- Confirmed `attemptAssassination`'s backend handler reaches a genuine `"OVER"` state regardless of
  which player is targeted (only WHO wins differs) — so the test clicks whichever assassination-target
  button is first, without needing to identify the actual "Mir Madan" character among the other 4.

Added `fivePlayerPages` to `e2e/fixtures.ts` (same one-`browser.newContext()`-per-player pattern as the
existing two-player fixture, scaled up). 1 test, ~36s runtime, **3/3 consecutive passes** with a
different random General/Mir Jafor assignment each run — checked deliberately, since a capstone this
size is exactly where a test could pass once by luck and be flaky in practice.

9/9 e2e tests total (8 passing + 1 intentionally red), 187 Vitest unchanged, typecheck clean, lint
unchanged (37 pre-existing).

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
| 2026-09-05 | L4 hooks done | `useNetworkStatus` (5 tests; found `act()` is required around a manual `dispatchEvent` — bare `window.dispatchEvent` left state stale), `useOverlayA11y` (13 tests, clean first pass — proves the hook's own contract, not Steps.md #5 itself, see file's scope note), `GeneralReveal` (4 tests; actually pins Steps.md #5 by rendering the real conditional-hooks pattern; fixed one fixture bug of Claude's own — wrong `flipping` value hid the name behind the wrong UI phase). Along the way, fixed a real Level 3 config bug: the node/jsdom project split was by file extension, which a hook test with no JSX but real DOM needs broke immediately — inverted to an explicit node-only allowlist. 183 tests total, 179 passing + 4 intentionally red (Steps.md #2/#3/#4/#5), typecheck clean, lint unchanged | Check in with Mahir before the `GameDashboard`-heavy half: `copiedStatus`/`loadingAction` fake-timer races + two `vi.mock` scenarios |
| 2026-09-05 | L4 fully done | Explained the new concepts first (`vi.mock` whole-module mocking, driving a mock via a captured callback, fake timers, race conditions vs. missing-guard bugs, mocking browser APIs jsdom lacks) before writing anything, at Mahir's request. Then `tests/mockSocketService.ts` (~30-method stand-in) + `GameDashboard/index.test.tsx` (4 tests): two `vi.mock` scenarios (roomJoined populates the room, error shows the toast) and both fake-timer races (`loadingAction` from the lobby state alone, `copiedStatus` needing `room` truthy + a clipboard mock) — both races genuinely red, confirmed for the right reason after a debugging false alarm (see review notes). 187 tests total, 181 passing + 6 intentionally red (Steps.md #2/#3/#4/#5/#7/#8), typecheck clean, lint unchanged (37 pre-existing) | Start Level 5 — Playwright. Prerequisite: wire up `VITE_SOCKET_URL` (Steps.md Step 2) |
| 2026-09-06 | L5 prerequisite done | `socket.ts` reads `VITE_SOCKET_URL` with the old hardcoded URL as a byte-identical fallback; 3 commented LAN IPs deleted; `vite-env.d.ts` updated. All 187 tests, typecheck, and lint unchanged | Install Playwright, scaffold `e2e/`, write the worked example |
| 2026-09-06 | L5 infra + worked example done | Installed `@playwright/test` 1.63.0; found the cached chromium-1234 didn't match (needed 1243, `npx playwright install chromium` fixed it). `playwright.config.ts` + `tsconfig.e2e.json` (closed another typecheck gap) + `e2e/fixtures.ts` (two-player contexts) + `e2e/app.spec.ts` (3 tests: splash-skip, splash-shown-then-proceed, fixture independence proof) — all 3 passed against the real dev server on the first run. Found and fixed a real ESLint gap along the way: `react-hooks` rules applied repo-wide flagged Playwright's `use` fixture parameter as React's `use()` hook; scoped those rules to `src/**` only. Also corrected a stale row in this file's own "Order of work" table (Step 5 was mis-assigned to L4). 187 Vitest tests unchanged, typecheck clean, lint unchanged (37) | SEO tags, create-room (needs backend), reconnect (`context.setOffline`), 5-context capstone, `--ui` debug walkthrough |
| 2026-09-06 | L5 SEO test done | `e2e/seo.spec.ts` (3 tests, all passing first run, no backend needed): title (hardcoded deliberately — app content, not environment config, and `seoConfig.ts` isn't safely importable into a Playwright spec since it reads `import.meta.env` at module load), canonical link asserted by shape not literal domain (the domain IS environment config, same Level 0 lesson), JSON-LD count + `@type` order (the one assertion here that's actually impossible to pass by accident, since nothing in the static `index.html` matches that selector). 6/6 e2e passing total, 187 Vitest unchanged, typecheck clean, lint unchanged (37) | The three backend-dependent exercises: create-room, reconnect, 5-context capstone |
| 2026-09-06 | L5 create-room + reconnect done | Backend confirmed running + CORS open; `webServer.env` in `playwright.config.ts` points the dev server at `localhost:3000`. `e2e/create-room.spec.ts` (1 test) passed first run — the first real client-to-real-server test in the course. `e2e/reconnect.spec.ts`: first attempt (two contexts, `context.setOffline`) genuinely tried twice and genuinely passed both times — reported honestly rather than treated as done, since Steps.md's own verify criterion needs internal socket state with no way to reach it. Asked Mahir how to proceed; he chose adding a debug hook. Added dev-only `window.__socketService` in `socket.ts` (stripped from prod via `import.meta.env.DEV`) + `e2e/global.d.ts` for its type. Re-ran the real experiment: on an ordinary page load (StrictMode's double-invoke), `connect`/`disconnect` listeners end up at 0 while every other listener that same effect registers coincidentally ends up correct at 1 — confirmed with a throwaway diagnostic script before writing the real spec. 1 test, genuinely red for the confirmed reason. 8/8 e2e total (7 passing + 1 red), 187 Vitest unchanged, typecheck clean, lint unchanged (37) | 5-context capstone, then the `--ui` debugging walkthrough |
| 2026-09-06 | L5 capstone done | Read the real game rules (startGame, assignGeneral, castVote resolution, attemptAssassination) before writing anything. Caught and corrected a wrong assumption (Mir Jafor/Mir Madan team assignments were backwards from what I assumed) by checking the actual backend data. Confirmed characters are genuinely redacted per-player server-side, meaning "always vote SUCCESS" is the only deterministic strategy (SABOTAGE's outcome depends on hidden team data). Built incrementally against the real backend with throwaway diagnostic scripts at each stage (room creation, character picker DOM, team proposal, voting, round repeat, Mir Jafor phase), catching a real locator ambiguity (BattalionSelector buttons vs. PlayerRoster's unlabeled spans) along the way. Added `fivePlayerPages` fixture. 1 test (~36s), verified 3/3 consecutive passes with different random assignments each run. 9/9 e2e total (8 passing + 1 intentionally red), 187 Vitest unchanged, typecheck clean, lint unchanged (37) | Debug one deliberately broken test with `--ui` and the trace viewer — the last Level 5 item |
| 2026-09-06 | **Level 5 fully done** | Set up temporary `e2e/broken-example.spec.ts` (subtle placeholder-text typo, confirmed it failed cleanly not hung, confirmed `--trace on` produces a real `trace.zip`) and handed the actual debugging off — `--ui` mode and the trace viewer are interactive GUI tools, not something to fake through text. Mahir found the mismatch and fixed it himself, deleted the practice file. Also fixed a stale progress-table bug while closing out: the top-of-file summary table still showed Level 3 as `[~]` and Level 4 as `[ ]` despite both being long done in the detailed sections — corrected all three (3, 4, 5) to `[x]`. Deliberately not starting Level 6 — Mahir has something else to do first | Whatever Mahir needs next; resume at Level 6 (GitHub Actions) afterward |

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
| L5 | 5 — socket listener lifecycle *(corrected 2026-09-06 — this row said L4, but the detailed Level 5
      checklist has always correctly put it there: "reconnect via `context.setOffline`". Not pinned by
      anything in the actual Level 4 work; the mismatch was in this summary table, not in what got built)* |
| L4 | 6 — overlay hook order |
| L2 | 7 — vote selectors |
| L5 | 10 — smoke run |

### Environment facts (updated 2026-09-06)
- Node v20.20.2, npm 10.8.2
- Playwright Chromium cached at `~/.cache/ms-playwright/chromium-1243` (`@playwright/test` 1.63.0).
  *(The chromium-1234 note from 2026-09-05 was stale by the time Playwright was actually installed —
  1234 belonged to a different Playwright version. Confirmed by running the tests, not assumed;
  `npx playwright install chromium` fixed it.)*
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
