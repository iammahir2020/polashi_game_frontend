/**
 * LEVEL 3 — WORKED EXAMPLE (continued): RoundTracker
 *
 * GameHeader was prop-only: no dependency on game data, no guard clause, no
 * way to get it wrong by feeding it bad data. RoundTracker is the harder,
 * more typical case — it takes a whole `Room` and has an early return
 * (`if (!room || !room.gameStarted) return null`), which is exactly where
 * `tests/factories.ts` (built in Level 2) starts earning its keep: building a
 * type-valid `Room` by hand for every test here would be 20 fields of noise.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import RoundTracker from './index';
import { makePlayer, makeRoom, SUPPORTED_PLAYER_COUNTS } from '../../../tests/factories';
import { MISSION_CONFIGS } from '../../constants';
import type { Player, Room } from '../../types/game';

describe('RoundTracker', () => {
  it('shows one circle per round, each labelled with its round number', () => {
    // ARRANGE — five players, game started, nobody's finished a round yet.
    // `makeRoom` gives us a valid Room with one line of overrides instead of
    // 20 fields; `activePlayerIds` needs 5 real ids because RoundTracker reads
    // its LENGTH to decide which MISSION_CONFIGS entry applies.
    const players = [makePlayer(), makePlayer(), makePlayer(), makePlayer(), makePlayer()];
    const room = makeRoom({
      gameStarted: true,
      activePlayerIds: players.map((p) => p.id),
      currentRound: 1,
      roundHistory: [],
    });

    // ACT
    render(<RoundTracker room={room} />);

    // ASSERT — five rounds, labelled 1 through 5. `getByText` with an exact
    // string ('2', not '2P') matters here: the component also renders a "2P"
    // team-size badge right next to the round number, in a separate element.
    // If we matched loosely we'd risk this test passing by accidentally
    // finding the wrong element — exact text keeps the two apart.
    for (const roundNum of [1, 2, 3, 4, 5]) {
      expect(screen.getByText(String(roundNum))).toBeInTheDocument();
    }

    // A second assertion, reusing what Level 1 already proved about the data:
    // MISSION_CONFIGS[5] is [2, 3, 2, 3, 3] players per round — two rounds
    // need a team of 2, three need a team of 3. `getAllByText` (not
    // `getByText`) is for exactly this: multiple elements are EXPECTED to
    // match, and you want the count, not just "at least one exists."
    expect(screen.getAllByText('2P')).toHaveLength(2);
    expect(screen.getAllByText('3P')).toHaveLength(3);
  });

  it('renders nothing before the game has started', () => {
    // The early return: `if (!room || !room.gameStarted) return null`.
    // `render` still succeeds — returning null from a component is not an
    // error — so the assertion is about ABSENCE, and that's a different
    // query family. `getByText` THROWS when nothing matches, which is wrong
    // here: we're not confused about whether the text is there, we're
    // certain it shouldn't be. `queryByText` returns `null` instead of
    // throwing, so `toBeNull()` reads as "and I confirmed that."
    // (There's a third family, `findBy*`, which is async — Level 4.)
    const room = makeRoom({ gameStarted: false });

    const { container } = render(<RoundTracker room={room} />);

    expect(screen.queryByText('1')).toBeNull();
    // `toBeEmptyDOMElement` is a jest-dom matcher: the container RTL renders
    // into has no children at all, which is the more direct way to say
    // "this component rendered null" than checking for one absent label.
    expect(container).toBeEmptyDOMElement();
  });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * YOUR EXERCISES
 * ─────────────────────────────────────────────────────────────────────────────
 */

describe('RoundTracker across player counts', () => {
  // EXERCISE 1 — solved by Claude at Mahir's explicit request (see
  // TESTING_COURSE.md session log for 2026-09-05).
  //
  // The rule from Level 1, now proven by rendering instead of by reading
  // `constants.ts` directly: EVERY player count shows exactly 5 rounds, and
  // each round's "NP" badge matches that count's MISSION_CONFIGS entry.
  //
  // WHY THE EARLIER ATTEMPTS FAILED, in order:
  //   1. Importing `SUPPORTED_PLAYER_COUNTS` from `constants.test.ts` re-ran
  //      that whole file's 81 tests every time this file ran too — importing
  //      a module executes it, and a test file's top-level `describe`/`it`
  //      calls are side effects of that execution. Fixed by moving the array
  //      into `tests/factories.ts`, a real (non-test) module both files can
  //      safely import — same reason that file exists at all.
  //   2. `expect(getByText(...)).toBe('2P')` compares a DOM ELEMENT to a
  //      STRING via `Object.is` — can never pass. `getByText` throwing (or
  //      not) IS the presence check; `toBeInTheDocument()` is how you word
  //      that as an assertion, same as the worked example above.
  //   3. Even with that fixed, `getByText('2P')` for a 5-player game throws
  //      "found multiple elements" — MISSION_CONFIGS[5] is [2,3,2,3,3], so
  //      TWO rounds need a team of 2. `getByText` assumes its match is
  //      unique; it isn't, once you stop hand-picking rows. The fix below
  //      tallies how many times each team size appears, then uses
  //      `getAllByText` — which expects and counts multiple matches — once
  //      per DISTINCT size, instead of `getByText` once per mission.
  it.each(SUPPORTED_PLAYER_COUNTS)(
    'shows exactly 5 rounds with the right team-size badges, for %i players',
    (totalPlayers) => {
      const players: Player[] = [];
      for (let i = 0; i < totalPlayers; i++) {
        players.push(makePlayer());
      }
      const room = makeRoom({
        gameStarted: true,
        activePlayerIds: players.map((p) => p.id),
        currentRound: 1,
        roundHistory: [],
      });

      render(<RoundTracker room={room} />);

      // Every round number 1..5 appears exactly once, regardless of player
      // count — this is the "5 rounds always" half of the rule.
      for (const roundNum of [1, 2, 3, 4, 5]) {
        expect(screen.getByText(String(roundNum))).toBeInTheDocument();
      }

      // The "right badges" half: tally how many missions need each team
      // size (e.g. 5 players -> { 2: 2, 3: 3 }), DERIVED from
      // MISSION_CONFIGS rather than hand-typed per player count, then check
      // that many "NP" badges actually rendered for each size.
      const missions = MISSION_CONFIGS[totalPlayers];
      const teamSizeCounts: Record<number, number> = {};
      for (const mission of missions) {
        teamSizeCounts[mission.players] = (teamSizeCounts[mission.players] ?? 0) + 1;
      }

      for (const [teamSize, expectedCount] of Object.entries(teamSizeCounts)) {
        expect(screen.getAllByText(`${teamSize}P`)).toHaveLength(expectedCount);
      }
    },
  );
});

describe('RoundTracker with malformed data', () => {
  // EXERCISE 2 — this is Steps.md #3, and it should FAIL until that gets fixed.
  //
  // Read the source: `const result = room.roundHistory[index];` — no `?.`.
  // `Room.roundHistory` is TYPED as a required array, so TypeScript won't let
  // you build one through `makeRoom()` without it. That mismatch — the type
  // promises something the real network payload doesn't always deliver — is
  // exactly what Steps.md Step 3 is about (an unvalidated `room` from a
  // socket event, cast to `Room`, can still be missing fields at runtime).
  //
  // To reproduce that here, you have to deliberately lie to the compiler:
  //     const room = { ...makeRoom({ gameStarted: true, ... }), roundHistory: undefined } as unknown as Room;
  // `as unknown as Room` is a real escape hatch, not a typo — it's the only
  // way to construct a value TypeScript would normally refuse, which is
  // precisely the situation an unvalidated network payload puts you in.
  //
  // HINT: `expect(() => render(<RoundTracker room={room} />)).toThrow()`.
  // Note the arrow function wrapping the render call — `expect(render(...))`
  // would already have thrown before `expect` ever got a value to check;
  // wrapping it defers the call so `.toThrow()` can catch it.
  //
  // Leave this test RED with a comment noting it — `// FAILS: Steps.md #3` —
  // per the course convention: the test proves the bug before anyone fixes it.
  it('throws when room.roundHistory is missing at runtime — FAILS: Steps.md #3',
    () => {

      const players: Player[] = [];
      for (let i = 0; i < 5; i++) {
        players.push(makePlayer());
      }
      const room = {
        ...makeRoom({
          gameStarted: true,
          activePlayerIds: players.map((p) => p.id),
          currentRound: 1,
          roundHistory: [],
        }), roundHistory: undefined
      } as unknown as Room

     expect(() => render(<RoundTracker room={room} />)).not.toThrow();
    }
  );
});
