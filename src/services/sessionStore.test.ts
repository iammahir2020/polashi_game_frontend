/**
 * sessionStore.ts — the seat a player can rejoin after a reload.
 *
 * The reconnect token is the secret that proves "this browser owns this
 * seat". Two things matter: it is forgotten whenever the seat is (leave,
 * kick, room closed), and it is never carried over to a different seat.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearSession, getPlayerKey, loadSession, saveSession } from './sessionStore';

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

/**
 * getPlayerKey — a random id for this device, sent with createRoom and
 * joinRoom so the server's game logs can group one player's games. Unlike the
 * seat, it must survive leaving a room, and it must always be a UUID, because
 * the server quietly drops anything else.
 */
describe('getPlayerKey', () => {
  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('makes a UUID once and returns the same one afterwards', () => {
    const key = getPlayerKey();
    expect(key).toMatch(UUID_V4);
    expect(getPlayerKey()).toBe(key);
    // Stored, so it survives a reload.
    expect(localStorage.getItem('playerKey')).toBe(key);
  });

  it('survives clearSession: leaving a room does not make you a new player', () => {
    const key = getPlayerKey();
    saveSession('AB12CD', 'p1', 'secret');
    clearSession();
    expect(getPlayerKey()).toBe(key);
  });

  it('replaces a stored value that is not a UUID', () => {
    localStorage.setItem('playerKey', 'garbage');
    const key = getPlayerKey();
    expect(key).toMatch(UUID_V4);
    expect(localStorage.getItem('playerKey')).toBe(key);
  });

  it('builds a valid UUID where crypto.randomUUID is missing (plain http)', () => {
    localStorage.clear();
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      expect(getPlayerKey()).toMatch(UUID_V4);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });

  it('keeps one key for the page when storage is blocked', () => {
    const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const key = getPlayerKey();
    expect(key).toMatch(UUID_V4);
    expect(getPlayerKey()).toBe(key);
    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});
