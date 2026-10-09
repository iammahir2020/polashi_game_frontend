import type { CharacterType } from '../types/game';
import type { Lang } from './core';

// The server's game data is in Bangla (character names and descriptions, the
// decoy names in Secret Intel) and its team and winner labels are fixed
// English strings that the game logic compares. None of that changes: these
// helpers only decide how it is SHOWN in the current language.

// Keyed by the Bangla name exactly as the server sends it (palassy-backend
// game/constants.js), not by id: a name we don't recognise (a renamed
// character, a test fixture) is then shown as it is rather than mislabelled.
const EN_CHARACTERS: Record<string, { name: string; description: string }> = {
  'মীর জাফর': { name: 'Mir Jafor', description: 'A cunning, wily strategist, infamous for his betrayal.' },
  'রায় দুর্লভ': { name: 'Rai Durlabh', description: 'A wealthy merchant, skilled at conspiracy and at spreading his influence.' },
  'ঘসেটি বেগম': { name: 'Ghaseti Begum', description: 'Power-hungry and influential, quietly backing the East India Company.' },
  'ওমিচাঁদ': { name: 'Omichand', description: 'A clever, money-hungry banker, secretly in league with the enemy.' },
  'নবাব সিরাজউদ্দৌলা': { name: 'Nawab Siraj-ud-Daulah', description: 'A brave and resolute ruler, determined to defend the motherland.' },
  'লুৎফুন্নিসা বেগম': { name: 'Lutfunnisa Begum', description: "The Nawab's faithful consort, influential in politics and decisions." },
  'সাঁ ফ্রাঁ': { name: 'Sinfray', description: 'A foreign military adviser, skilled and experienced in battle tactics.' },
  'মীর মদন': { name: 'Mir Madan', description: 'A brave commander loyal to the Nawab, indomitable in battle.' },
  'মোহনলাল': { name: 'Mohanlal', description: 'A trusted companion who plays a key part in shaping battle strategy.' },
  'দেবশী': { name: 'Debshi', description: 'A loyal courtier of the Nawab and an adviser to the royal court.' },
};

// Every Bangla name that can appear in Secret Intel: the characters, and the
// decoy names the server picks for characters who learn nothing.
const EN_NAMES: Record<string, string> = {
  ...Object.fromEntries(Object.entries(EN_CHARACTERS).map(([bangla, { name }]) => [bangla, name])),
  'জগত শেঠ': 'Jagat Seth',
  'উমিচাঁদ': 'Umichand',
  'খাজা ওয়াজিদ': 'Khwaja Wajid',
  'রাজবল্লভ': 'Rajballabh',
  'সিরাজুল ইসলাম': 'Sirajul Islam',
  'বদর আলী': 'Badar Ali',
  'শওকত জং': 'Shaukat Jang',
  'মুর্শিদ কুলি খান': 'Murshid Quli Khan',
};

const isNawabTeam = (team: string | undefined | null) => typeof team === 'string' && team.includes('Nawabs');

export function characterName(character: CharacterType | null | undefined, lang: Lang): string {
  if (!character) return '';
  if (lang === 'bn') return character.name;
  return EN_CHARACTERS[character.name]?.name ?? character.name;
}

export function characterDescription(character: CharacterType | null | undefined, lang: Lang): string {
  if (!character) return '';
  if (lang === 'bn') return character.description;
  return EN_CHARACTERS[character.name]?.description ?? character.description;
}

// "Nawabs" / "East India Company (EIC)". English keeps the server's label.
export function teamName(team: string | undefined | null, lang: Lang): string {
  if (lang === 'en') return team ?? '';
  return isNawabTeam(team) ? 'নবাব পক্ষ' : 'ইস্ট ইন্ডিয়া কোম্পানি';
}

// "Nawabs (Green)" / "East India Company (Red)". English keeps the server's label.
export function winnerName(winner: string | undefined | null, lang: Lang): string {
  if (lang === 'en') return winner ?? '';
  return winner?.includes('Green') || isNawabTeam(winner) ? 'নবাব পক্ষ (সবুজ)' : 'ইস্ট ইন্ডিয়া কোম্পানি (লাল)';
}

// One Secret Intel line. The server builds these as "<player> (EIC)",
// "<player> (EIC - <character>)", a bare player name, or a Bangla decoy name.
const WITH_CHARACTER = /^(.*) \(EIC - (.+)\)$/;
const EIC_ONLY = /^(.*) \(EIC\)$/;

export function intelLine(line: string, lang: Lang): string {
  const withCharacter = WITH_CHARACTER.exec(line);
  if (withCharacter) {
    const [, player, name] = withCharacter;
    return lang === 'bn' ? `${player} (কোম্পানি - ${name})` : `${player} (EIC - ${EN_NAMES[name] ?? name})`;
  }
  const eicOnly = EIC_ONLY.exec(line);
  if (eicOnly) return lang === 'bn' ? `${eicOnly[1]} (কোম্পানি)` : line;
  return lang === 'en' ? EN_NAMES[line] ?? line : line;
}
