// The player's seat in a room, kept across reloads so they can rejoin.
// `reconnectToken` is the secret the server requires to reclaim the seat; it
// is sent only to this player and never shown or logged.

const KEYS = {
  roomCode: 'roomCode',
  playerId: 'playerId',
  reconnectToken: 'reconnectToken',
  playerKey: 'playerKey',
} as const;

export type StoredSession = {
  roomCode: string | null;
  playerId: string | null;
  reconnectToken: string | null;
};

// Storage can throw (private mode, blocked site data); the game must still run.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not fatal: the player just can't rejoin after a reload.
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing stored that we could clear.
  }
}

export function loadSession(): StoredSession {
  return {
    roomCode: read(KEYS.roomCode),
    playerId: read(KEYS.playerId),
    reconnectToken: read(KEYS.reconnectToken),
  };
}

export function saveSession(roomCode: string, playerId: string, reconnectToken?: string): void {
  const sameSeat = read(KEYS.roomCode) === roomCode && read(KEYS.playerId) === playerId;
  write(KEYS.roomCode, roomCode);
  write(KEYS.playerId, playerId);
  if (reconnectToken) write(KEYS.reconnectToken, reconnectToken);
  // An older server sends no token: keep the one we have for this seat, but
  // never carry a token over to a different seat.
  else if (!sameSeat) remove(KEYS.reconnectToken);
}

// A random id for this device, made once and kept for good (clearSession
// leaves it alone). The server stores it with each game so a player's games
// can be grouped later. It is not a secret and proves nothing about who you are.
let memoryPlayerKey: string | null = null;

function randomUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // crypto.randomUUID only exists on https and localhost; build a v4 UUID by hand elsewhere.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getPlayerKey(): string {
  const stored = read(KEYS.playerKey);
  if (stored && UUID.test(stored)) return stored;
  // With storage blocked, keep one key for as long as the page is open.
  const key = memoryPlayerKey ?? randomUuid();
  memoryPlayerKey = key;
  write(KEYS.playerKey, key);
  return key;
}

// Forget the seat entirely: after leaving, being kicked, or the room closing.
export function clearSession(): void {
  remove(KEYS.roomCode);
  remove(KEYS.playerId);
  remove(KEYS.reconnectToken);
}
