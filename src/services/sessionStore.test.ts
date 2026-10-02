/**
 * sessionStore.ts — the seat a player can rejoin after a reload.
 *
 * The reconnect token is the secret that proves "this browser owns this
 * seat". Two things matter: it is forgotten whenever the seat is (leave,
 * kick, room closed), and it is never carried over to a different seat.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearSession, loadSession, saveSession } from './sessionStore';

beforeEach(() => {
  localStorage.clear();
});

describe('sessionStore', () => {
  it('starts empty', () => {
    expect(loadSession()).toEqual({ roomCode: null, playerId: null, reconnectToken: null });
  });

  it('saves and loads a seat with its token', () => {
    saveSession('AB12CD', 'p1', 'secret');
    expect(loadSession()).toEqual({ roomCode: 'AB12CD', playerId: 'p1', reconnectToken: 'secret' });
  });

  it('clearSession forgets the token too', () => {
    saveSession('AB12CD', 'p1', 'secret');
    clearSession();
    expect(loadSession()).toEqual({ roomCode: null, playerId: null, reconnectToken: null });
  });

  it('keeps the token when an older server re-confirms the same seat without one', () => {
    saveSession('AB12CD', 'p1', 'secret');
    saveSession('AB12CD', 'p1');
    expect(loadSession().reconnectToken).toBe('secret');
  });

  it('never carries a token over to a different seat', () => {
    saveSession('AB12CD', 'p1', 'secret');
    saveSession('ZZ99ZZ', 'p2');
    expect(loadSession()).toEqual({ roomCode: 'ZZ99ZZ', playerId: 'p2', reconnectToken: null });
  });

  it('keeps the game working when storage is blocked', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveSession('AB12CD', 'p1', 'secret')).not.toThrow();
    expect(loadSession()).toEqual({ roomCode: null, playerId: null, reconnectToken: null });
    spy.mockRestore();
    setSpy.mockRestore();
  });
});
