/**
 * phaseMessage — the one-line "what's happening now" in the war room's
 * campaign panel.
 *
 * It's a pure function (room state in, sentence out), the easiest kind of
 * code to test: no rendering, no mocks, just call it and compare. Each test
 * builds the smallest room that puts the game into one phase, then checks the
 * sentence. The order of the tests follows the order of the checks inside
 * `phaseMessage`, because the first matching phase wins (a vote in progress
 * outranks "waiting for a General", and so on).
 */

import { describe, it, expect } from 'vitest';

import { phaseMessage, type PhaseInput } from './phase';
import { makePlayer, makeRoom, makeVotingState } from '../../../tests/factories';

const siraj = makePlayer({ name: 'Siraj', isGameMaster: true });
const clive = makePlayer({ name: 'Clive' });
const players = [siraj, clive, makePlayer(), makePlayer(), makePlayer()];

// A baseline: a 5-player game in round 1, no General yet, seen by Clive (not
// the host). Each test overrides only what its phase needs.
function input(overrides: Partial<PhaseInput> = {}): PhaseInput {
  return {
    room: makeRoom({ players, activePlayerIds: players.map((p) => p.id), gameStarted: true }),
    me: clive,
    currentGeneral: null,
    isGameMaster: false,
    awaitingNewGeneral: false,
    isTurnComplete: false,
    ...overrides,
  };
}

describe('phaseMessage', () => {
  it('announces the end of the campaign, with the winner', () => {
    const room = makeRoom({ gameStatus: 'OVER', winner: 'Nawabs (Green)' });
    expect(phaseMessage(input({ room }))).toBe('The campaign is over. Nawabs (Green) prevail.');
  });

  it("describes Mir Jafor's final betrayal phase", () => {
    const room = makeRoom({ gameStatus: 'MIR_JAFOR_TURN' });
    expect(phaseMessage(input({ room }))).toMatch(/Mir Jafor is choosing a target/);
  });

  it('distinguishes the open council vote from the secret mission vote', () => {
    const council = makeRoom({ voting: makeVotingState({ active: true, type: 'teamApproval' }) });
    const mission = makeRoom({ voting: makeVotingState({ active: true, type: 'missionOutcome' }) });

    expect(phaseMessage(input({ room: council }))).toMatch(/council is voting/);
    // The secret vote's line must not hint at anyone's choice, only that it's under way.
    expect(phaseMessage(input({ room: mission }))).toMatch(/on its mission/);
  });

  it('says the verdict is in once a vote has closed but is still on screen', () => {
    const room = makeRoom({ voting: makeVotingState({ active: false, result: 'Yes' }) });
    expect(phaseMessage(input({ room }))).toBe('The verdict is in.');
  });

  it('reuses the phone layout\'s wording while a new General is awaited', () => {
    // These two strings are copied from the phone layout's banner on purpose:
    // the same situation reads the same on every device.
    expect(phaseMessage(input({ awaitingNewGeneral: true }))).toBe('Waiting for new general');
    expect(phaseMessage(input({ awaitingNewGeneral: true, isTurnComplete: true })))
      .toBe('Your turn is done, waiting for new general');
  });

  it('tells the host to appoint a General, and everyone else to wait for it', () => {
    expect(phaseMessage(input({ isGameMaster: true, me: siraj }))).toBe('Appoint a General to lead this mission.');
    expect(phaseMessage(input())).toBe('Waiting for the host to appoint a General.');
  });

  it('names the General and the battalion size for this round', () => {
    // MISSION_CONFIGS[5][0].players is 2: round 1 of a 5-player game sends 2.
    expect(phaseMessage(input({ currentGeneral: siraj }))).toBe('Siraj is choosing a battalion of 2.');
  });

  it('addresses the General directly', () => {
    expect(phaseMessage(input({ currentGeneral: clive, me: clive }))).toBe('You are the General. Choose your battalion.');
  });
});
