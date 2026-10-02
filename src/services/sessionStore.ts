// The player's seat in a room, kept across reloads so they can rejoin.
// `reconnectToken` is the secret the server requires to reclaim the seat; it
// is sent only to this player and never shown or logged.

const KEYS = {
  roomCode: 'roomCode',
  playerId: 'playerId',
  reconnectToken: 'reconnectToken',
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

// Forget the seat entirely: after leaving, being kicked, or the room closing.
export function clearSession(): void {
  remove(KEYS.roomCode);
  remove(KEYS.playerId);
  remove(KEYS.reconnectToken);
}
