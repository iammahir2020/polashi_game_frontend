// Player name and room code rules on the client. They match the server
// (palassy-backend game/validation.js), but here they only shape what the user
// types; the server is what enforces them.

export const NAME_MAX = 24;
export const ROOM_CODE_MAX = 12;

// Zero-width spaces and joiners, word joiner, BOM, soft hyphen, bidi
// embeddings/overrides/isolates, and every other control character. These can
// make two names look identical or make text render reversed.
// eslint-disable-next-line no-control-regex, no-misleading-character-class -- matching these characters is the point
const INVISIBLE_OR_BIDI = /[\u0000-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0]/g;

function clipCodePoints(value: string, max: number): string {
  const chars = Array.from(value);
  return chars.length > max ? chars.slice(0, max).join('') : value;
}

// Strips characters that can spoof or reorder text. Safe for any text shown
// to other players.
export function stripInvisible(value: string): string {
  return value.replace(INVISIBLE_OR_BIDI, '');
}

// While typing: drop invisible characters and stop at the length limit, but
// keep spaces where the user put them so "Mir Madan" can be typed normally.
export function cleanNameInput(value: string): string {
  return clipCodePoints(stripInvisible(value.normalize('NFKC')), NAME_MAX);
}

// On submit: the name exactly as the server will store it.
export function normalizeName(value: string): string {
  const cleaned = stripInvisible(value.normalize('NFKC')).replace(/\s+/g, ' ').trim();
  return clipCodePoints(cleaned, NAME_MAX).trim();
}

// Room codes are upper-case letters and digits.
export function cleanRoomCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_MAX);
}
