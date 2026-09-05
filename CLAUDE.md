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

Mahir is **learning** to write tests. The learning happens when he writes them.

- Explain the concept, write **one** fully-commented worked example, then leave the remaining cases
  as **stub tests with hints**.
- **Do NOT fill in his exercises.** Not to be helpful, not to save time, not even when the exercise
  looks trivial. If he asks for a review, review it — say what's wrong and why; don't paste the
  solution unless he explicitly asks for it.
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
