/**
 * names.ts — the rules for what can be typed as a player name or room code.
 *
 * These only shape the input; the server applies the same rules and is the
 * one that enforces them. The point of testing them here is that typing must
 * still feel normal (spaces between words, Bangla script, lower-case codes)
 * while the characters used to impersonate someone are removed.
 */

import { describe, it, expect } from 'vitest';
import { cleanNameInput, cleanRoomCode, NAME_MAX, normalizeName, stripInvisible } from './names';

describe('cleanNameInput (while typing)', () => {
  it('keeps spaces where the user typed them, so multi-word names work', () => {
    expect(cleanNameInput('Mir ')).toBe('Mir ');
    expect(cleanNameInput('Mir Madan')).toBe('Mir Madan');
  });

  it.each([
    ['zero-width space', 'Si\u200Braj'],
    ['zero-width joiner', 'Si\u200Draj'],
    ['right-to-left override', 'Siraj\u202E'],
    ['byte-order mark', '\uFEFFSiraj'],
  ])('removes a %s, which would let two names look identical', (_label, typed) => {
    expect(cleanNameInput(typed)).toBe('Siraj');
  });

  it('stops at the length limit, counting characters rather than UTF-16 units', () => {
    expect(Array.from(cleanNameInput('x'.repeat(100))).length).toBe(NAME_MAX);
    expect(cleanNameInput('পলাশী')).toBe('পলাশী');
  });
});

describe('normalizeName (on submit)', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeName('  Mir    Madan  ')).toBe('Mir Madan');
  });

  it('turns a name of only invisible characters into an empty one', () => {
    expect(normalizeName('\u200B \u200D \u2060')).toBe('');
  });

  it('folds look-alike full-width letters into normal ones', () => {
    expect(normalizeName('ｓｉｒａｊ')).toBe('siraj');
  });
});

describe('cleanRoomCode', () => {
  it('upper-cases and keeps only letters and digits', () => {
    expect(cleanRoomCode('ab-12 cd')).toBe('AB12CD');
  });

  it('caps the length', () => {
    expect(cleanRoomCode('A'.repeat(50)).length).toBe(12);
  });
});

describe('stripInvisible', () => {
  it('leaves ordinary text, emoji and Bangla alone', () => {
    expect(stripInvisible('Hello 🟢 পলাশী')).toBe('Hello 🟢 পলাশী');
  });
});
