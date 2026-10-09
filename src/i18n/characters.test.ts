/**
 * How the server's game data is SHOWN in each language.
 *
 * The server keeps character names in Bangla and team/winner labels as fixed
 * English strings that the game logic compares ("Nawabs (Green)"). The client
 * must never change that data; it only picks what to display. So every test
 * here checks the same two things: the right label in each language, and an
 * unknown value passed through untouched rather than mislabelled.
 */
import { describe, expect, it } from 'vitest';
import { characterDescription, characterName, intelLine, teamName, winnerName } from './characters';
import type { CharacterType } from '../types/game';

const mirJafor: CharacterType = {
  id: 1,
  name: 'মীর জাফর',
  description: 'চতুর ও ধূর্ত কৌশলবিদ, বিশ্বাসঘাতকতার জন্য কুখ্যাত।',
  color: 'Red',
  team: 'East India Company (EIC)',
};

describe('characterName / characterDescription', () => {
  it('shows the server’s Bangla in Bangla and English in English', () => {
    expect(characterName(mirJafor, 'bn')).toBe('মীর জাফর');
    expect(characterName(mirJafor, 'en')).toBe('Mir Jafor');
    expect(characterDescription(mirJafor, 'bn')).toBe(mirJafor.description);
    expect(characterDescription(mirJafor, 'en')).toMatch(/infamous for his betrayal/);
  });

  it('passes through a name it does not know, whatever its id', () => {
    // Keyed by name, not id: if the server renamed character 1, showing
    // "Mir Jafor" for it would be wrong. Showing the server's text is not.
    const renamed = { ...mirJafor, name: 'The Company Man', description: 'Shady.' };
    expect(characterName(renamed, 'en')).toBe('The Company Man');
    expect(characterDescription(renamed, 'en')).toBe('Shady.');
  });

  it('copes with no character at all', () => {
    expect(characterName(null, 'en')).toBe('');
  });
});

describe('teamName / winnerName', () => {
  it('keeps the server labels in English and translates them in Bangla', () => {
    expect(teamName('Nawabs', 'en')).toBe('Nawabs');
    expect(teamName('Nawabs', 'bn')).toBe('নবাব পক্ষ');
    expect(teamName('East India Company (EIC)', 'bn')).toBe('ইস্ট ইন্ডিয়া কোম্পানি');
    expect(winnerName('Nawabs (Green)', 'en')).toBe('Nawabs (Green)');
    expect(winnerName('Nawabs (Green)', 'bn')).toBe('নবাব পক্ষ (সবুজ)');
    expect(winnerName('East India Company (Red)', 'bn')).toBe('ইস্ট ইন্ডিয়া কোম্পানি (লাল)');
  });
});

describe('intelLine', () => {
  // The four shapes of a Secret Intel line, as built in palassy-backend game/room.js.
  it('labels a Company member', () => {
    expect(intelLine('Asha (EIC)', 'en')).toBe('Asha (EIC)');
    expect(intelLine('Asha (EIC)', 'bn')).toBe('Asha (কোম্পানি)');
  });

  it('names Omichand in the reader’s language', () => {
    expect(intelLine('Asha (EIC - ওমিচাঁদ)', 'en')).toBe('Asha (EIC - Omichand)');
    expect(intelLine('Asha (EIC - ওমিচাঁদ)', 'bn')).toBe('Asha (কোম্পানি - ওমিচাঁদ)');
  });

  it('translates a decoy name in English and leaves a plain player name alone', () => {
    expect(intelLine('জগত শেঠ', 'en')).toBe('Jagat Seth');
    expect(intelLine('জগত শেঠ', 'bn')).toBe('জগত শেঠ');
    expect(intelLine('Bilal', 'en')).toBe('Bilal');
    expect(intelLine('Bilal', 'bn')).toBe('Bilal');
  });

  it('does not mistake a player named like a label for the label', () => {
    // A player can call themselves anything. "(EIC)" inside a longer name that
    // doesn't END the line is not a server label and must pass through.
    expect(intelLine('Mr (EIC) Smith', 'bn')).toBe('Mr (EIC) Smith');
  });
});
