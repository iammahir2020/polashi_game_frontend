/**
 * payloads.ts — cleaning what the server sends before React renders it.
 *
 * WHY THIS MATTERS
 * Part of every room update is chosen by other players: their names, for one.
 * A name that arrives as an object instead of a string, rendered as `{p.name}`,
 * throws "Objects are not valid as a React child", and without a guard that
 * blanks the page for every player in the room. These tests pin down the two
 * halves of the contract:
 *   1. a normal payload comes through with the same meaning it had before, and
 *   2. a hostile or broken one is either repaired or dropped (null), never
 *      passed through.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeCharacterList,
  sanitizeErrorMessage,
  sanitizeRoomDissolved,
  sanitizeServerUpdating,
  sanitizeGeneralAnimation,
  sanitizeGuptochorResult,
  sanitizeNotification,
  sanitizePlayer,
  sanitizeRoom,
  sanitizeRoomJoined,
  sanitizeServerTextDetail,
} from './payloads';
import { makeCharacter, makePlayer, makeRoom, makeVotingState } from '../../tests/factories';

describe('sanitizeRoom: well-formed rooms keep their meaning', () => {
  it('passes a typical in-game room through unchanged', () => {
    const me = makePlayer({ character: makeCharacter(), isGameMaster: true, isGeneral: true });
    const other = makePlayer({ character: null, isObserver: false });
    const room = makeRoom({
      players: [me, other],
      activePlayerIds: [me.id, other.id],
      proposedTeam: [me.id],
      gameStarted: true,
      gameStatus: 'ACTIVE',
      currentRound: 2,
      scoreGreen: 1,
      scoreRed: 0,
      roundHistory: ['Green'],
      voting: makeVotingState({ active: true, votes: { [me.id]: true } }),
      secretIntel: ['Someone (EIC)'],
    });

    const clean = sanitizeRoom(room);

    expect(clean).not.toBeNull();
    expect(clean!.players).toEqual([me, other]);
    expect(clean!.activePlayerIds).toEqual(room.activePlayerIds);
    expect(clean!.proposedTeam).toEqual([me.id]);
    expect(clean!.voting).toEqual(room.voting);
    expect(clean!.currentRound).toBe(2);
    expect(clean!.gameStatus).toBe('ACTIVE');
    expect(clean!.secretIntel).toEqual(['Someone (EIC)']);
  });

  it('keeps lobby rooms lobby-shaped: absent numbers and status stay absent', () => {
    // Before a game starts the server sends no currentRound or gameStatus.
    // Inventing defaults (round 1, "ACTIVE") would change what the UI shows.
    const clean = sanitizeRoom({ players: [makePlayer()], activePlayerIds: [], locked: false, gameStarted: false });
    expect(clean).not.toBeNull();
    expect('currentRound' in clean!).toBe(false);
    expect('gameStatus' in clean!).toBe(false);
    expect(clean!.roundHistory).toEqual([]);
    expect(clean!.voting).toBeNull();
  });

  it('never keeps fields the client must not hold, such as socket ids', () => {
    const clean = sanitizeRoom({ players: [{ ...makePlayer(), socketId: 'abc', reconnectToken: 'secret' }] });
    expect(clean!.players[0]).not.toHaveProperty('socketId');
    expect(clean!.players[0]).not.toHaveProperty('reconnectToken');
  });
});

describe('sanitizeRoom: hostile and broken input', () => {
  it.each([
    ['null', null],
    ['a string', 'room'],
    ['an array', []],
    ['an object without players', { gameStarted: true }],
    ['players that is not an array', { players: 'everyone' }],
  ])('rejects %s', (_label, raw) => {
    expect(sanitizeRoom(raw)).toBeNull();
  });

  it('repairs a player name that is an object, not a string', () => {
    const clean = sanitizeRoom({ players: [{ id: 'p1', name: { toString: 'boom' } }] });
    expect(clean!.players[0].name).toBe('Unknown');
  });

  it('clips a very long name and strips invisible and bidi characters', () => {
    const clean = sanitizeRoom({ players: [{ id: 'p1', name: `Si\u200Braj\u202E${'x'.repeat(10_000)}` }] });
    const name = clean!.players[0].name;
    expect(name.startsWith('Siraj')).toBe(true);
    expect(name.length).toBeLessThanOrEqual(40);
    expect(name).not.toMatch(/[\u200B\u202E]/);
  });

  it('drops players without a usable id instead of rendering them', () => {
    const clean = sanitizeRoom({ players: [{ name: 'no id' }, { id: 42, name: 'numeric id' }, { id: 'ok', name: 'Ok' }] });
    expect(clean!.players.map((p) => p.id)).toEqual(['ok']);
  });

  it('caps huge arrays so one update cannot flood the page', () => {
    const players = Array.from({ length: 5_000 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    const clean = sanitizeRoom({ players, activePlayerIds: players.map((p) => p.id) });
    expect(clean!.players.length).toBe(50);
    expect(clean!.activePlayerIds.length).toBe(50);
  });

  it('falls back to empty lists when list fields have the wrong type (Steps.md #2 and #3)', () => {
    const clean = sanitizeRoom({ players: [], activePlayerIds: 'all', roundHistory: { 0: 'Green' }, proposedTeam: null });
    expect(clean!.activePlayerIds).toEqual([]);
    expect(clean!.roundHistory).toEqual([]);
    expect(clean!.proposedTeam).toEqual([]);
  });

  it('drops a malformed character rather than passing it to IdentityCard (Steps.md #4)', () => {
    const player = sanitizePlayer({ id: 'p1', name: 'A', character: { name: 'no id' } });
    expect(player!.character).toBeNull();
    const withTeamMissing = sanitizePlayer({ id: 'p1', name: 'A', character: { id: 5, name: 'X' } });
    expect(withTeamMissing!.character!.team).toBe('');
  });

  it('keeps only real vote values', () => {
    const clean = sanitizeRoom({
      players: [],
      voting: { active: true, type: 'missionOutcome', result: null, votes: { a: 'yes', b: true, c: 'maybe', d: { x: 1 } } },
    });
    expect(clean!.voting!.votes).toEqual({ a: 'yes', b: true });
    expect(sanitizeRoom({ players: [], voting: { type: 'coup', votes: {} } })!.voting).toBeNull();
  });
});

describe('which message the server sent (code and values)', () => {
  // Newer servers send { code, params } with an error, and code/params on a
  // notification, so the client can show them in Bangla. Like everything from
  // the server, it is cleaned first: params are player names that another
  // player chose.
  it('keeps a well-formed code and its string values', () => {
    expect(sanitizeServerTextDetail({ code: 'ROOM_FULL' })).toEqual({ code: 'ROOM_FULL' });
    expect(sanitizeServerTextDetail({ code: 'GUPTOCHOR_DEPLOYED', params: { requester: 'Asha', target: 'Bilal' } }))
      .toEqual({ code: 'GUPTOCHOR_DEPLOYED', params: { requester: 'Asha', target: 'Bilal' } });
  });

  it('is empty for an older server, or for junk', () => {
    expect(sanitizeServerTextDetail(undefined)).toEqual({});
    expect(sanitizeServerTextDetail('ROOM_FULL')).toEqual({});
    expect(sanitizeServerTextDetail({ code: 'not a code!' })).toEqual({});
  });

  it('drops values that are not text, strips invisible characters and clips long names', () => {
    const detail = sanitizeServerTextDetail({
      code: 'MIR_JAFOR_TURN',
      params: { name: 'Cl‮ive' + 'x'.repeat(100), weird: { nested: true }, 'bad key!': 'x' },
    });
    expect(detail.params).toEqual({ name: ('Clive' + 'x'.repeat(100)).slice(0, 40) });
  });

  it('reaches a notification too, next to its English message', () => {
    const note = sanitizeNotification({ message: 'Alert!', code: 'MIR_JAFOR_TURN', params: { name: 'Clive' } });
    expect(note).toMatchObject({ message: 'Alert!', code: 'MIR_JAFOR_TURN', params: { name: 'Clive' } });
  });
});

describe('the smaller events', () => {
  it('roomJoined needs a room code, a player id and a usable room', () => {
    const room = makeRoom({ players: [makePlayer({ id: 'me' })] });
    const ok = sanitizeRoomJoined({ roomCode: 'ab12cd', playerId: 'me', room, reconnectToken: 'tok' });
    expect(ok).toMatchObject({ roomCode: 'AB12CD', playerId: 'me', reconnectToken: 'tok' });
    expect(sanitizeRoomJoined({ roomCode: 'AB12CD', room })).toBeNull();
    expect(sanitizeRoomJoined({ roomCode: 'AB12CD', playerId: 'me', room: 'nope' })).toBeNull();
  });

  it('roomJoined from an older server without a token still works', () => {
    const room = makeRoom({ players: [makePlayer({ id: 'me' })] });
    const ok = sanitizeRoomJoined({ roomCode: 'AB12CD', playerId: 'me', room });
    expect(ok).not.toBeNull();
    expect(ok!.reconnectToken).toBeUndefined();
  });

  it('error messages are always strings', () => {
    expect(sanitizeErrorMessage('Room not found')).toBe('Room not found');
    expect(sanitizeErrorMessage({ message: 'x' })).toBe('Something went wrong.');
    expect(sanitizeErrorMessage('x'.repeat(5_000)).length).toBe(300);
  });

  it('"serverUpdating" always yields a usable wait, clamped to between 0.5 and 10 seconds', () => {
    // The client sleeps for this long and then asks again, so a broken value
    // must neither hammer the server (0, negative) nor strand the player (an
    // hour). A missing or junk field falls back to the server's usual 2 s.
    expect(sanitizeServerUpdating({ retryInMs: 2000 })).toEqual({ retryInMs: 2000 });
    expect(sanitizeServerUpdating({ retryInMs: 0 })).toEqual({ retryInMs: 500 });
    expect(sanitizeServerUpdating({ retryInMs: -5 })).toEqual({ retryInMs: 500 });
    expect(sanitizeServerUpdating({ retryInMs: 3_600_000 })).toEqual({ retryInMs: 10_000 });
    expect(sanitizeServerUpdating({ retryInMs: '2000' })).toEqual({ retryInMs: 2000 });
    expect(sanitizeServerUpdating({ retryInMs: NaN })).toEqual({ retryInMs: 2000 });
    expect(sanitizeServerUpdating(null)).toEqual({ retryInMs: 2000 });
  });

  it('"roomDissolved" says whether the host closed the room; anything else counts as gone', () => {
    // Only the exact reason earns the "the Game Master closed it" wording. An
    // older server sends no payload at all, and junk is treated the same way.
    expect(sanitizeRoomDissolved({ reason: 'closed_by_host' })).toEqual({ reason: 'closed_by_host' });
    expect(sanitizeRoomDissolved({ reason: 'room_gone' })).toEqual({ reason: 'room_gone' });
    expect(sanitizeRoomDissolved(undefined)).toEqual({ reason: 'room_gone' });
    expect(sanitizeRoomDissolved({ reason: 'something new' })).toEqual({ reason: 'room_gone' });
  });

  it('a Guptochor result needs a name and an alliance', () => {
    expect(sanitizeGuptochorResult({ targetName: 'A', alliance: 'Nawabs' })).toEqual({ targetName: 'A', alliance: 'Nawabs' });
    expect(sanitizeGuptochorResult({ targetName: 'A', alliance: 7 })).toBeNull();
  });

  it('notifications keep their filtering ids and drop junk', () => {
    expect(sanitizeNotification({ message: 'Hi', type: 'info', requesterId: 'a', targetId: 'b' })).toEqual({
      message: 'Hi', type: 'info', requesterId: 'a', targetId: 'b',
    });
    expect(sanitizeNotification({ message: '', type: 'info' })).toBeNull();
    expect(sanitizeNotification(null)).toBeNull();
  });

  it('the General animation needs a name', () => {
    expect(sanitizeGeneralAnimation({ name: 'Clive' })).toEqual({ name: 'Clive' });
    expect(sanitizeGeneralAnimation({ name: ['Clive'] })).toBeNull();
  });

  it('the character list drops entries without an id', () => {
    const list = sanitizeCharacterList([makeCharacter({ id: 1 }), { name: 'ghost' }]);
    expect(list!.map((c) => c.id)).toEqual([1]);
    expect(sanitizeCharacterList('all')).toBeNull();
  });
});
