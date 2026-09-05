/**
 * FACTORIES — builders for test data.
 *
 * `Room` has ~20 fields. A test that only cares about `voting.votes` still has
 * to construct a full, type-valid `Room` to call a function that takes one —
 * TypeScript won't let you pass a partial object where a `Room` is expected.
 * Two bad ways to cope: paste a 20-field object literal into every test (when
 * `Room` gains a field, every one of those literals needs an edit), or weaken
 * the type to make the compiler stop complaining (now nothing catches a typo'd
 * field name).
 *
 * A factory is a function that returns a *valid default* object, and takes an
 * optional partial override for the one or two fields the test actually cares
 * about. Add a field to `Room` and exactly one place — here — needs to know
 * its default. Every test stays focused on what it's actually testing.
 *
 * Usage:
 *   makePlayer()                      // a valid, boring default player
 *   makePlayer({ id: 'p1' })          // same, but with a chosen id
 *   makeRoom({ voting: makeVotingState({ votes: { p1: 'yes' } }) })
 */

import type { Player, Room, VotingState } from '../src/types/game';

let playerCounter = 0;

/**
 * A valid default `Player`. Each call gets a fresh, distinct id/name unless
 * overridden — so two `makePlayer()` calls in the same test never collide.
 */
export function makePlayer(overrides: Partial<Player> = {}): Player {
  playerCounter += 1;
  return {
    id: `player_${playerCounter}`,
    name: `Player ${playerCounter}`,
    online: true,
    ...overrides,
  };
}

/**
 * A valid default `VotingState`: an active team-approval vote with no votes
 * cast yet. Override `votes`, `type`, etc. per test.
 */
export function makeVotingState(overrides: Partial<VotingState> = {}): VotingState {
  return {
    active: true,
    votes: {},
    result: null,
    type: 'teamApproval',
    ...overrides,
  };
}

/**
 * A valid default `Room`: a fresh, in-progress 5-player game, round 1, no
 * votes, nobody proposed yet. Override only what your test needs.
 *
 * `players` defaults to none — most selector tests build their own small
 * roster via `makePlayer()` and pass it explicitly, since the players and the
 * assertions about them usually need to line up by id.
 */
export function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    roomCode: 'TEST01',
    players: [],
    turnIndex: 0,
    currentRound: 1,
    scoreGreen: 0,
    scoreRed: 0,
    roundHistory: [],
    gameStatus: 'ACTIVE',
    guptochorId: null,
    nextGuptochorId: null,
    guptochorUsed: false,
    activePlayerIds: [],
    ...overrides,
  };
}
