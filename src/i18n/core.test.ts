/**
 * i18n core — the pure functions under the English/Bangla toggle.
 *
 * WHAT IS WORTH TESTING IN A TRANSLATION LAYER
 * Not the translations themselves (a test can't tell good Bangla from bad),
 * but the CONTRACT between the two dictionaries and the code that uses them:
 *  - every English key has a Bangla one (TypeScript checks this at build time,
 *    but a test also catches an EMPTY string, which the type allows),
 *  - each Bangla string uses exactly the same `{placeholders}` as its English
 *    one. This is the classic translation bug: a translator renames `{name}`
 *    to `{নাম}` and the player sees a literal "{নাম}" on screen. No type
 *    system catches it; only a test that compares the two does,
 *  - `**bold**` markers are balanced, or half a sentence turns bold.
 * Then the mechanics: placeholders get filled, numbers become Bengali digits
 * (but text values such as room codes don't), and server codes map to keys
 * with a safe fallback to the server's English text.
 *
 * These are all plain functions with no DOM, so the tests are plain calls.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { en, type TKey } from './en';
import { bn } from './bn';
import {
  isServerError,
  loadLang,
  localizeDigits,
  saveLang,
  serverMessage,
  translate,
  translateMessage,
} from './core';

const KEYS = Object.keys(en) as TKey[];
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('the two dictionaries agree', () => {
  it('has a non-empty Bangla string for every English key', () => {
    // `toEqual([])` rather than a loop of expects: on failure it prints the
    // whole list of offending keys at once, which is what you want to fix them.
    expect(KEYS.filter((key) => !bn[key]?.trim())).toEqual([]);
  });

  it('uses the same placeholders in both languages', () => {
    const mismatched = KEYS.filter((key) => placeholders(en[key]).join() !== placeholders(bn[key]).join());
    expect(mismatched).toEqual([]);
  });

  it('closes every **bold** marker it opens, in both languages', () => {
    const unbalanced = KEYS.filter((key) => en[key].split('**').length % 2 === 0 || bn[key].split('**').length % 2 === 0);
    expect(unbalanced).toEqual([]);
  });
});

describe('translate', () => {
  it('fills placeholders, converting numbers to the language’s digits', () => {
    expect(translate('en', 'launcher.ready', { count: 7 })).toBe('Battalion ready: 7');
    expect(translate('bn', 'launcher.ready', { count: 7 })).toBe('বাহিনী প্রস্তুত: ৭ জন');
  });

  it('leaves text values alone, so a room code stays typeable', () => {
    // `text` is a string here, not a number: "AB12CD" must not become "AB১২CD".
    expect(translate('bn', 'toast.copyFailed', { text: 'AB12CD' })).toContain('AB12CD');
  });

  it('translates a value that is itself a key', () => {
    // How "Someone is spying on you" works when the spy's name is unknown:
    // the name slot holds another key, translated in the same language.
    const vars = { name: { key: 'intel.someone' as const } };
    expect(translate('en', 'intel.targetedYou', vars)).toContain('Someone has deployed');
    expect(translate('bn', 'intel.targetedYou', vars)).toContain('কেউ একজন');
  });

  it('leaves a placeholder visible when its value is missing, rather than inventing one', () => {
    expect(translate('en', 'dialog.investigate.body')).toBe('Deploy your informant to investigate {name}?');
  });

  it('translates a stored message, or shows raw server text as it is', () => {
    expect(translateMessage('bn', { key: 'common.ok' })).toBe('ঠিক আছে');
    expect(translateMessage('bn', { raw: 'Some old server text' })).toBe('Some old server text');
  });
});

describe('localizeDigits', () => {
  it('maps 0-9 to Bengali digits in Bangla and changes nothing in English', () => {
    expect(localizeDigits(1757, 'bn')).toBe('১৭৫৭');
    expect(localizeDigits(1757, 'en')).toBe('1757');
  });
});

describe('serverMessage', () => {
  it('turns a known code into its key, keeping the values to fill in', () => {
    expect(serverMessage('server', 'ROOM_FULL', undefined, 'Room full')).toEqual({ key: 'server.ROOM_FULL' });
    expect(serverMessage('notify', 'GUPTOCHOR_DEPLOYED', { requester: 'A', target: 'B' }, 'x')).toEqual({
      key: 'notify.GUPTOCHOR_DEPLOYED',
      vars: { requester: 'A', target: 'B' },
    });
  });

  it('falls back to the English text from an older server (no code) or an unknown code', () => {
    expect(serverMessage('server', undefined, undefined, 'Room full')).toEqual({ raw: 'Room full' });
    expect(serverMessage('server', 'SOMETHING_NEW', undefined, 'Brand new error')).toEqual({ raw: 'Brand new error' });
  });

  it('falls back when a value the message needs is missing, instead of showing "{target}"', () => {
    expect(serverMessage('notify', 'GUPTOCHOR_DEPLOYED', { requester: 'A' }, 'English text')).toEqual({
      raw: 'English text',
    });
  });
});

describe('isServerError', () => {
  // The dashboard and the "Fortress Fortified" alert act on WHICH error came
  // in. That used to be `msg.includes("locked")` on English text, which would
  // break the moment the text is shown in Bangla. Now it's the code, with the
  // old text check kept for servers that don't send one.
  it('matches by code', () => {
    expect(isServerError({ key: 'server.ROOM_LOCKED' }, 'ROOM_LOCKED', 'locked')).toBe(true);
    expect(isServerError({ key: 'server.ROOM_FULL' }, 'ROOM_LOCKED', 'locked')).toBe(false);
    expect(isServerError({ key: 'server.PLAYER_NOT_FOUND' }, ['ROOM_NOT_FOUND', 'PLAYER_NOT_FOUND'], 'not found')).toBe(true);
  });

  it('matches an older server’s English text', () => {
    expect(isServerError({ raw: 'Room is locked' }, 'ROOM_LOCKED', 'locked')).toBe(true);
    expect(isServerError({ raw: 'Room not found' }, 'ROOM_NOT_FOUND', 'not found')).toBe(true);
  });
});

describe('the remembered language', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults to English, and to Bangla for a browser set to Bangla', () => {
    expect(loadLang()).toBe('en');
    // `vi.spyOn(..., 'get')` swaps a read-only getter for the length of one test.
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('bn-BD');
    expect(loadLang()).toBe('bn');
  });

  it('prefers the saved choice over the browser language', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('bn-BD');
    saveLang('en');
    expect(loadLang()).toBe('en');
  });

  it('ignores junk in storage', () => {
    localStorage.setItem('lang', 'fr');
    expect(loadLang()).toBe('en');
  });
});
