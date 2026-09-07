/**
 * LEVEL 2 — WORKED EXAMPLE: EXTRACT, THEN TEST
 *
 * WHY THIS LEVEL EXISTS
 * Before this file existed, "how many votes have been cast" was a one-liner
 * buried inside 400 lines of JSX in VotingSystem/index.tsx:
 *
 *     Object.keys(room.voting.votes).length
 *
 * You cannot import a line of JSX and call it. To test that logic at all, you'd
 * have to render the whole component in a fake browser (jsdom), find the right
 * DOM node, and read a number back out of text — for one line of arithmetic.
 * That is Level 3's tool (React Testing Library), and it is the wrong tool
 * here: heavy, slow, and it tests the rendering *along with* the logic, so a
 * failure doesn't tell you which one broke.
 *
 * The fix is not a testing trick, it's a design change: `votesCastCount` now
 * lives in `voteSelectors.ts` as a plain function of its inputs, and the
 * component just calls it. Untestable code is very often a sign the logic
 * hasn't been separated from the rendering yet — pull it out, and it becomes
 * as easy to test as `toAbsoluteUrl` was in Level 0.
 *
 * THE BUG THIS CAUGHT
 * The one-liner above counts *keys*. Read the comment on `VotingState.votes` in
 * `types/game.ts` — the backend is about to start sending `{ playerId: false }`
 * for players who have NOT voted yet, so that it can pre-populate the roster
 * before anyone acts. Under that shape, every player is a key from the start,
 * so `Object.keys(...).length` would always equal the player count, whether or
 * not anyone had voted. `votesCastCount` fixes this by reading the *value*, not
 * the key. This test pins that fix down.
 */

import { describe, it, expect } from 'vitest';

import { hasPlayerVoted, pendingVoters, votesCastCount, voteTally } from './voteSelectors';
import type { Player } from '../../types/game';
import {makePlayer} from '../../../tests/factories'

describe('votesCastCount', () => {
  // Two tests, same rule, two different shapes of input. This is NOT the
  // table-driven `it.each` from Level 1 — that was one rule holding across many
  // rows of the *same* shape (six player counts). Here the interesting variable
  // is the *shape of the data itself* (today's wire format vs. tomorrow's), so
  // each shape earns its own named test. Reach for `it.each` when rows differ
  // only in value; write separate `it`s when they differ in shape or meaning.

  it('counts revealed votes under the current "yes"/"no" wire format', () => {
    // ARRANGE — no factory needed here. `votesCastCount` takes the votes map
    // directly, not a whole Room, so a small inline object is clearer than
    // building one through makeRoom() and reaching into it.
    const votes = { alice: 'yes', bob: 'no' } as const;

    // ACT
    const result = votesCastCount(votes);

    // ASSERT
    expect(result).toBe(2);
  });

  it('counts redacted votes under the future boolean wire format', () => {
    // This is the case that did not exist before this level. `true` means
    // "voted, choice hidden"; `false` means "explicitly has not voted" (as
    // opposed to being absent from the map). Only the `true` should count.
    const votes = { alice: true, bob: false, carol: true };

    const result = votesCastCount(votes);

    // Two `true`s, one `false`. If `votesCastCount` were still counting keys
    // (the original bug) this would wrongly return 3.
    expect(result).toBe(2);
  });
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * YOUR EXERCISES
 *
 * Same file, same idea, three more selectors. `voteSelectors.ts` is short —
 * read the whole file before writing these; the doc comment above each
 * function tells you what it's supposed to do and why the boolean case exists.
 * ─────────────────────────────────────────────────────────────────────────────
 */

describe('hasPlayerVoted', () => {
  // EXERCISE 1
  // The rule under today's format: a player who voted "yes" or "no" has voted;
  // a player with no entry in the map has not.
  //
  // HINT: same inline-object style as the worked example above — no factory.
  
  const votes = { alice: 'yes', bob: 'no' } as const;
  
  it('is true for a player with a "yes" or "no" vote',()=>{
    const result = hasPlayerVoted(votes,"bob")
    expect(result).toBe(true)
  });

  it('is false for a player missing from the votes map',()=>{
    const result = hasPlayerVoted(votes,"coc")
    expect(result).toBe(false)
  });

  // EXERCISE 2 — the one the type widening exists for.
  // HINT: this is the direct unit test of the redaction case. `true` should
  // read as voted; `false` should read as NOT voted, even though the key IS
  // present in the map. That "present but false" case is exactly what
  // `playerId in votes` would get wrong, and exactly why `hasPlayerVoted`
  // checks the value.
  it('is true for a player redacted as `true` (voted, hidden)',()=>{
    const votes = { alice: 'yes', bob: true } as const;
    const result = hasPlayerVoted(votes,"bob")
    expect(result).toBe(true)
  });
  it('is false for a player redacted as `false` (explicitly not voted)',()=>{
    const votes = { alice: 'yes', bob: false } as const;
    const result = hasPlayerVoted(votes,"bob")
    expect(result).toBe(false)
  });
});

describe('pendingVoters', () => {
  // EXERCISE 3
  // The rule: pendingVoters returns whichever of `eligiblePlayerIds` have not
  // voted — nobody outside that list, regardless of the votes map.
  //
  // HINT: this is the first place in this level you'll want `makePlayer` from
  // `../../../tests/factories.ts`. Build 3 players, cast a vote for one of
  // them, and pass all 3 ids as `eligiblePlayerIds`. Assert on the RESULT'S
  // `id`s (e.g. with `.map(p => p.id)`), not on the whole player objects —
  // asserting identity/equality on objects built by a factory is fragile
  // because the factory can add fields you don't care about.

  const players:Player[] = []
  for (let i=0; i<3; i++){
    players.push(makePlayer())
  }

  it('returns eligible players who have not voted, and excludes voters',()=>{
    const votes = { [players[0].id]: 'yes', [players[1].id]: true } as const;
    const eligiblePlayerIds = players.map((p)=>p.id)

    const result = pendingVoters(players, votes, eligiblePlayerIds)
    expect(result.map((p) => p.id)).toEqual([players[2].id]);
  });

  // EXERCISE 4
  // HINT: a player NOT in `eligiblePlayerIds` should never appear in the
  // result, even if they haven't voted — think of the secret-vote case, where
  // players off the proposed team are eligible for nothing.
  it('excludes players who have not voted but are not eligible to',()=>{
    const votes = { [players[0].id]: 'yes'} as const;
    const eligiblePlayerIds = players.map((p)=>p.id).filter((p)=>p!=players[2].id)

    const result = pendingVoters(players, votes, eligiblePlayerIds)
    expect(result.map((p)=>p.id)).toEqual([players[1].id])
  });


  it('returns all eligible players who have not voted, when no votes casted',()=>{
    const votes = { } as const;
    const eligiblePlayerIds = players.map((p)=>p.id)

    const result = pendingVoters(players, votes, eligiblePlayerIds)
    expect(result).toEqual(players)
  });

    it('returns [], when all eligible players have voted',()=>{
    const votes = { [players[0].id]: 'yes', [players[1].id]: true, [players[2].id]: 'yes' } as const;
    const eligiblePlayerIds = players.map((p)=>p.id)

    const result = pendingVoters(players, votes, eligiblePlayerIds)
    expect(result).toHaveLength(0);
  });

});

describe('voteTally', () => {
  // EXERCISE 5
  // HINT: build a small votes map with a mix of "yes"/"no"/redacted-boolean
  // entries and check `{ yes, no }` both land right. Remember from the doc
  // comment: a redacted `true` carries no yes/no information, so it should be
  // in neither count. Assert with `toEqual`, not `toBe` — you're comparing an
  // object's shape, and this is exactly the case the Level 0 table in
  // TESTING.md was warning you about.
  it('tallies revealed "yes" and "no" votes separately',()=>{
    const votes = { player_1: "yes", player_2: "yes", player_3: "no" } as const;
    const result = voteTally(votes)
    expect(result).toEqual({ yes: 2, no: 1 })
  });
  
  it('does not count a redacted `true` toward either tally',()=>{
    const votes = { player_1: "yes", player_2: "no", player_3: "no", player_4: true } as const;
    const result = voteTally(votes)
    expect(result).toEqual({ yes: 1, no: 2 })
  });

  it('tally should be zero for no votes casted',()=>{
    const votes = { } as const;
    const result = voteTally(votes)
    expect(result).toEqual({ yes: 0, no: 0 })
  });

});

/**
 * EXERCISE 6 — edge cases, across all three functions above.
 * The rule so far has always been tested against "some votes, some not". The
 * edges are where off-by-one bugs actually live:
 *   - an EMPTY votes map — nobody has voted yet. `votesCastCount` should be 0,
 *     `pendingVoters` should return everyone eligible, `voteTally` should be
 *     `{ yes: 0, no: 0 }`.
 *   - EVERYONE has voted — `pendingVoters` should return an empty array, not
 *     `undefined` and not throw.
 * Two tests minimum, wherever they fit best above.
 */
