/**
 * LEVEL 1 — WORKED EXAMPLE: TABLE-DRIVEN TESTS
 *
 * WHY THIS LEVEL EXISTS
 * Level 0 tested *examples*: "given '/rules', return SITE_URL + '/rules'". Fine
 * for a function with three branches. But `constants.ts` is not a function — it
 * is the rulebook of the game, six player counts wide, and the things worth
 * asserting about it are *rules*, not examples:
 *
 *     "every supported player count has exactly five missions"
 *     "the two teams always add up to the number of players"
 *
 * A rule holds for every row. Writing it out six times is repetitive, and worse,
 * repetition invites copy-paste errors — a test suite with a bug in it is a
 * liability, because you trust it.
 *
 * `it.each` lets you write the rule once and run it against a table of inputs.
 */

import { describe, it, expect } from 'vitest';

import { MISSION_CONFIGS, TEAM_DISTRIBUTIONS } from './constants';

/**
 * THE TABLE ITSELF IS A DECISION — and it is the whole lesson of this level.
 *
 * There are two ways to get the list of player counts, and they test different
 * things:
 *
 *   (a) DERIVE it from the data:  Object.keys(MISSION_CONFIGS)
 *       "every entry that exists is well-formed."
 *       If someone deletes the `7:` block entirely, this table silently shrinks
 *       from six rows to five, every remaining row passes, and the suite stays
 *       green while seven-player games are broken. The test can only ever
 *       confirm what is already there.
 *
 *   (b) HARDCODE it:  [5, 6, 7, 8, 9, 10]
 *       "these exact player counts are supported, and each is well-formed."
 *       Deleting the `7:` block now fails a test whose name contains a 7.
 *
 * Rule of thumb: when the test is about *completeness*, never derive the table
 * from the thing you are checking for completeness. You end up asking the
 * suspect to write its own alibi.
 *
 * The cost is that this list must be maintained by hand — if the game ever
 * supports 11 players, this line has to change. That is the point: adding a
 * player count *should* be a deliberate edit in two places, not a silent one.
 */
const SUPPORTED_PLAYER_COUNTS = [5, 6, 7, 8, 9, 10];

describe('MISSION_CONFIGS', () => {
  // `it.each(table)(name, fn)` generates ONE TEST PER ROW.
  //
  // That is the difference between this and a `for` loop inside a single `it`.
  // With a loop you get one test called "mission configs are valid", it stops at
  // the first failing count, and the failure message doesn't tell you which one
  // broke. With `it.each` you get six independently-named tests, all six run,
  // and the output names the culprit. When you see three of them red you learn
  // something a loop would have hidden.
  //
  // The `%i` in the name is a printf placeholder filled in from the row — so
  // these report as "supports exactly 5 missions for 5 players", and so on.
  // (`%s` string, `%i` integer, `%o` object, `%%` a literal percent.)
  it.each(SUPPORTED_PLAYER_COUNTS)(
    'defines exactly 5 missions for %i players',
    (playerCount) => {
      const missions = MISSION_CONFIGS[playerCount];

      // Guard the lookup BEFORE asserting on its contents.
      //
      // This line looks redundant and is not. `MissionConfigs` is typed
      // `Record<number, MissionRequirement[]>`, which tells TypeScript that
      // *every* number is a valid key — so `MISSION_CONFIGS[999]` type-checks
      // happily and returns `undefined` at runtime. The type is lying to us.
      // Without this line, a missing entry fails on
      // "Cannot read properties of undefined (reading 'length')", which sends
      // you hunting through a stack trace instead of reading a clear message.
      //
      // Assert the precondition, then assert the thing you care about.
      expect(missions).toBeDefined();
      expect(missions).toHaveLength(5);
    },
  );

  // A second form of the same idea. When rows have more than one value, pass an
  // array of arrays and destructure the parameters in order:
  it.each([
    [5, 0, 2], // 5 players, round 1 (index 0), 2 on the team
    [7, 3, 4], // 7 players, round 4 (index 3), 4 on the team
    [10, 4, 5], // 10 players, round 5 (index 4), 5 on the team
  ])(
    'sends %i-player round %i on a team of %i',
    (playerCount, roundIndex, expectedTeamSize) => {
      expect(MISSION_CONFIGS[playerCount][roundIndex].players).toBe(
        expectedTeamSize,
      );
    },
  );

  // Those three rows are *spot checks*, not a rule — they're transcribed from
  // the rulebook, so they'd catch a typo in the data. Both kinds of table are
  // legitimate. Know which one you are writing: a rule that must hold for every
  // row, or a handful of known-good values copied from an external source.
  //
  // (A third form exists and reads nicely for wide tables — objects plus `$key`
  // placeholders: it.each([{ players: 5, missions: 5 }])('$players → $missions')
  // Use whichever keeps the row readable.)
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * YOUR EXERCISES
 *
 * Three rules about the game data. Each one should be a single `it.each` over a
 * table — if you find yourself writing the same `expect` twice, the table is
 * doing too little work.
 *
 * Before writing each one, say out loud what rule you are encoding. If you can't
 * say it in one sentence, the test will be muddled too.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe('TEAM_DISTRIBUTIONS', () => {
  // EXERCISE 1
  // The rule: the two factions always account for every player at the table —
  // no one is left without a side, no phantom players.
  //
  // HINT: reuse SUPPORTED_PLAYER_COUNTS. Same completeness argument as above —
  // deriving the table from TEAM_DISTRIBUTIONS would let a deleted entry hide.
  // Guard the lookup with toBeDefined() first, for the same reason.
  it.each(SUPPORTED_PLAYER_COUNTS)(
    'splits every player into exactly one of the two factions, for %i players',
  (playerCount)=>{
    const distribution = TEAM_DISTRIBUTIONS[playerCount]
    expect(distribution).toBeDefined()
    const totalPlayers = distribution.eic + distribution.nawabs
    expect(totalPlayers).toBe(playerCount)
  });

  // EXERCISE 2
  // The rule: the East India Company is always the minority faction. Look at the
  // data and confirm that's actually true before you assert it — a test that
  // encodes a rule the data doesn't follow is just a broken test.
  //
  // HINT: `toBeLessThan`. There are more matchers than `toBe`; skim
  // https://vitest.dev/api/expect once, it pays for itself.
  it.each(SUPPORTED_PLAYER_COUNTS)(
    'always gives the EIC fewer players than the Nawabs, team size %i',
    (playerCount)=>{
      const distribution = TEAM_DISTRIBUTIONS[playerCount]
      expect(distribution).toBeDefined()
      const nawabs = distribution.nawabs
      const eic = distribution.eic
      expect(eic).toBeLessThan(nawabs)
    });
});

describe('MISSION_CONFIGS team sizes', () => {
  // EXERCISE 3
  // The rule: you can never be asked to send more people on a mission than are
  // sitting at the table.
  //
  // This one needs a table with a row PER MISSION, not per player count — 30
  // rows, and you should not type them by hand. Build it:
  // Note we ARE deriving from MISSION_CONFIGS here, and that's correct — this
  // rule is about the missions that exist, not about which ones should exist.
  // Exercise 1 above already guards completeness. Different question, different
  // table. That distinction is the thing to take from this level.
  //
  // HINT: `toBeLessThanOrEqual`. Include the round number in the test name so a
  // failure tells you which mission is wrong.

  const rows = SUPPORTED_PLAYER_COUNTS.flatMap((totalPlayerCount) =>
    MISSION_CONFIGS[totalPlayerCount].map((mission, roundNumber) => [ totalPlayerCount,roundNumber+1, mission.players ]),
  );

  it.each(rows)(
    'never sends more players on a mission than are in the game, for %i players, round %i',
    (totalPlayerCount, _roundNumber, playersInTeam)=>{
      expect(playersInTeam).toBeLessThanOrEqual(totalPlayerCount)
    }
  );
});

describe('MISSION_CONFIGS failsRequired', () => {
  // EXERCISE 4 — the hardest, and the most valuable.
  //
  // The rule, in one sentence: a mission needs two sabotages to fail if and only
  // if it is round 4 AND the game has 7 or more players. Every other mission
  // needs exactly one.
  //
  // Note the "if and only if". It is easy to write a test that proves round 4 of
  // a 7-player game needs 2 — and that test would still pass if EVERY mission
  // required 2. A rule with "only" in it needs both halves asserted:
  //   - the cases that should be 2 are 2
  //   - the cases that should be 1 are 1
  //
  // HINT: build the same 30-row flatMap table as exercise 3, and compute the
  // expected value in the test body from the row:

  const rows = SUPPORTED_PLAYER_COUNTS.flatMap((totalPlayers)=>
    MISSION_CONFIGS[totalPlayers].map((mission,roundNumber)=>[totalPlayers,roundNumber+1, mission.failsRequired])
  )

  //     const expected = (roundNumber === 3 && playerCount >= 7) ? 2 : 1;
  // One `it.each`, one expectation, thirty rows, whole rule pinned.
  //
  // WATCH OUT: `roundNumber === 3` is round FOUR. The source comments say
  // "Round 4"; the array is 0-indexed. Off-by-one here gives you a test that
  // passes for the wrong reason.
  it.each(rows)(
    'requires 2 sabotages only on round 4 of a 7+ player game, totalPlayers %i -> round-> %i',
  (totalPlayers,roundNumber, failsRequired)=>{
    const expectedFails = roundNumber===4 && totalPlayers>= 7 ? 2 : 1

    expect(failsRequired).toBe(expectedFails)
  });
});
