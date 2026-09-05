# CLAUDE.md

## The project

**The Great Palassy Game** (পলাশী) — a real-time social-deduction web game themed on the Battle of
Plassey. Mechanically it is *The Resistance: Avalon*: hidden teams (Nawabs vs East India Company),
five missions, a rotating General who proposes a team, a council vote, then a secret success/sabotage
vote, ending in a Mir Jafor assassination phase.

React 19 + TypeScript + Vite, `socket.io-client`, PWA. **Frontend only** — the backend is a separate
repo at `../palassy-backend` (Express + socket.io, rooms held in memory).

Key files:
- `src/components/GameDashboard/index.tsx` — 906 lines, holds essentially all app state
- `src/services/socket.ts` — singleton wrapper over every socket event
- `src/constants.ts` — mission configs and team distributions (the game rules)
- `src/types/game.ts` — the `Room` / `Player` / `VotingState` shapes

## ⚠️ A testing course is in progress

**Before doing anything test-related, read `TESTING_COURSE.md`.** It tracks where we are and what
comes next. Update its "You are here" section and session log at the end of each session.

### The working agreement — do not violate this

**Changed 2026-09-05, mid-Level-3.** Through Level 2 and part of Level 3, Mahir wrote every exercise
himself (exercise-driven, stub tests with hints, Claude never filling them in). He then explicitly
asked to switch: Claude now writes **full worked examples covering everything worth learning**, for
every remaining level — no more stub exercises, no more waiting on him to write code. His stated goal
is to *understand* testing, not to build typing/retention muscle memory. Do not revert to the old
stub-and-hint pattern without him asking again.

- Explain the concept, then write **complete, fully-commented test coverage** for the file/feature —
  not just one example case with the rest left as `it.todo`. Comment generously: the comments are the
  actual teaching content now, since he isn't producing his own attempts to learn from.
- If he asks for a review of something *he* wrote (this still happens occasionally, e.g. exploring an
  idea), review it honestly — say what's wrong and why.
- Don't advance a level until the previous level's verify command passes.
- Explain *why* before *how*.

## Related docs

- `TESTING_COURSE.md` — the course, progress tracker, session log
- `TESTING.md` — testing vocabulary and conventions *(created in Level 0)*
- `Steps.md` on branch `fix/frontend-defects` — catalogue of known real bugs. Tests are written
  **before** these fixes, so a failing test proves the bug and then proves the fix.

## Conventions

- Unit/component tests colocated as `*.test.ts(x)` next to their source
- Playwright specs in `e2e/`, excluded from Vitest
- Prefer the `tests/factories.ts` builders over inline `Room` fixtures
- Query the DOM by accessible role/text, never by CSS class
- Styling in this repo is inline style objects — there are no CSS classes to query anyway
