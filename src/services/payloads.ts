import type {
  CharacterType,
  Player,
  Room,
  RoomJoinedPayload,
  VotingState,
} from '../types/game';
import { stripInvisible } from '../lib/names';

// Everything the server sends is checked here before React sees it. Another
// player controls part of it (their name, for one), and a single field of the
// wrong type, rendered as a React child, would blank the page for the whole
// room. Each cleaner returns a value matching `src/types/game.ts`, or null when
// the payload is too broken to use.
//
// The rule is "fix what's fixable, drop what isn't": strings are clipped and
// stripped of invisible/bidi characters, unknown fields are dropped, wrong
// types fall back to the value the UI already expects when a field is absent.

const LIMITS = {
  name: 40,
  text: 500,
  id: 64,
  players: 50,
  intel: 20,
  characters: 30,
} as const;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

// Display text from the server: names, messages, labels.
function text(v: unknown, max: number = LIMITS.text): string | undefined {
  return typeof v === 'string' ? clip(stripInvisible(v), max) : undefined;
}

function id(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 && v.length <= LIMITS.id ? v : undefined;
}

function idList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => id(x) !== undefined).slice(0, max);
}

function optionalBool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

function nullableId(v: unknown): string | null {
  return id(v) ?? null;
}

export function sanitizeCharacter(v: unknown): CharacterType | null {
  if (!isObj(v) || !isFiniteNumber(v.id)) return null;
  return {
    id: v.id,
    name: text(v.name, LIMITS.name) ?? '',
    description: text(v.description) ?? '',
    color: text(v.color, 20) ?? '',
    // Unknown teams are passed through as text; the UI treats anything that
    // isn't "Nawabs" as the Company.
    team: (text(v.team, 60) ?? '') as CharacterType['team'],
  };
}

export function sanitizePlayer(v: unknown): Player | null {
  if (!isObj(v)) return null;
  const playerId = id(v.id);
  if (!playerId) return null;
  const player: Player = {
    id: playerId,
    name: text(v.name, LIMITS.name) || 'Unknown',
    character: v.character == null ? null : sanitizeCharacter(v.character),
  };
  const flags = ['online', 'isGameMaster', 'isGeneral', 'isObserver'] as const;
  for (const flag of flags) {
    const value = optionalBool(v[flag]);
    if (value !== undefined) player[flag] = value;
  }
  return player;
}

const VOTE_TYPES = ['teamApproval', 'missionOutcome'] as const;

function sanitizeVoting(v: unknown): VotingState | null {
  if (!isObj(v)) return null;
  if (!VOTE_TYPES.includes(v.type as (typeof VOTE_TYPES)[number])) return null;
  const votes: VotingState['votes'] = {};
  if (isObj(v.votes)) {
    for (const [key, value] of Object.entries(v.votes).slice(0, LIMITS.players)) {
      if (!id(key)) continue;
      if (value === 'yes' || value === 'no' || typeof value === 'boolean') votes[key] = value;
    }
  }
  return {
    active: v.active === true,
    votes,
    result: v.result === 'Yes' || v.result === 'No' ? v.result : null,
    type: v.type as VotingState['type'],
  };
}

const GAME_STATUSES: Room['gameStatus'][] = ['ACTIVE', 'OVER', 'WAITING', 'MIR_JAFOR_TURN'];

export function sanitizeRoom(v: unknown): Room | null {
  if (!isObj(v) || !Array.isArray(v.players)) return null;
  const players = v.players
    .slice(0, LIMITS.players)
    .map(sanitizePlayer)
    .filter((p): p is Player => p !== null);

  const room: Room = {
    roomCode: text(v.roomCode, 16) ?? '',
    players,
    currentRound: isFiniteNumber(v.currentRound) ? v.currentRound : (undefined as unknown as number),
    scoreGreen: isFiniteNumber(v.scoreGreen) ? v.scoreGreen : (undefined as unknown as number),
    scoreRed: isFiniteNumber(v.scoreRed) ? v.scoreRed : (undefined as unknown as number),
    roundHistory: Array.isArray(v.roundHistory)
      ? v.roundHistory.filter((r): r is 'Green' | 'Red' => r === 'Green' || r === 'Red').slice(0, 10)
      : [],
    gameStatus: GAME_STATUSES.includes(v.gameStatus as Room['gameStatus'])
      ? (v.gameStatus as Room['gameStatus'])
      : (undefined as unknown as Room['gameStatus']),
    guptochorId: nullableId(v.guptochorId),
    nextGuptochorId: nullableId(v.nextGuptochorId),
    guptochorUsed: v.guptochorUsed === true,
    activePlayerIds: idList(v.activePlayerIds, LIMITS.players),
    proposedTeam: idList(v.proposedTeam, LIMITS.players),
    voting: v.voting == null ? null : sanitizeVoting(v.voting),
  };

  const optionalFlags = ['locked', 'gameStarted', 'disableSecretIntelligence'] as const;
  for (const flag of optionalFlags) {
    const value = optionalBool(v[flag]);
    if (value !== undefined) room[flag] = value;
  }
  const winner = text(v.winner, 60);
  if (winner !== undefined) room.winner = winner;
  if (Array.isArray(v.secretIntel)) {
    room.secretIntel = v.secretIntel
      .map((s) => text(s, 80))
      .filter((s): s is string => s !== undefined)
      .slice(0, LIMITS.intel);
  }

  // Absent numbers/status stay absent, as the UI already expects in the lobby.
  for (const key of ['currentRound', 'scoreGreen', 'scoreRed', 'gameStatus'] as const) {
    if (room[key] === undefined) delete (room as Partial<Room>)[key];
  }
  return room;
}

export type CleanRoomJoined = RoomJoinedPayload;

export function sanitizeRoomJoined(v: unknown): CleanRoomJoined | null {
  if (!isObj(v)) return null;
  const roomCode = typeof v.roomCode === 'string' ? v.roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) : '';
  const playerId = id(v.playerId);
  const room = sanitizeRoom(v.room);
  if (!roomCode || !playerId || !room) return null;
  const joined: CleanRoomJoined = {
    roomCode,
    playerId,
    room,
  };
  if (typeof v.reconnectToken === 'string' && v.reconnectToken.length <= 128) {
    joined.reconnectToken = v.reconnectToken;
  }
  return joined;
}

export function sanitizeCharacterList(v: unknown): CharacterType[] | null {
  if (!Array.isArray(v)) return null;
  return v
    .slice(0, LIMITS.characters)
    .map(sanitizeCharacter)
    .filter((c): c is CharacterType => c !== null);
}

export function sanitizeErrorMessage(v: unknown): string {
  return text(v, 300) || 'Something went wrong.';
}

// "roomDissolved": why the room went away. "closed_by_host" when the Game
// Master closed it; anything else (a rejoin to a room that's already gone, or
// an older server sending no reason) is "room_gone".
export type RoomDissolvedReason = "closed_by_host" | "room_gone";

export function sanitizeRoomDissolved(v: unknown): { reason: RoomDissolvedReason } {
  return { reason: isObj(v) && v.reason === "closed_by_host" ? "closed_by_host" : "room_gone" };
}

// "serverUpdating": the server has our room but can't hand it over yet (a
// deploy is moving it between servers). Its only field is how long to wait
// before asking again, kept between half a second and ten seconds so a broken
// value can neither hammer the server nor leave a player waiting for minutes.
export const SERVER_UPDATING_DEFAULT_RETRY_MS = 2000;

export function sanitizeServerUpdating(v: unknown): { retryInMs: number } {
  const ms = isObj(v) && isFiniteNumber(v.retryInMs) ? v.retryInMs : SERVER_UPDATING_DEFAULT_RETRY_MS;
  return { retryInMs: Math.min(10_000, Math.max(500, ms)) };
}

export function sanitizeGuptochorResult(v: unknown): { targetName: string; alliance: string } | null {
  if (!isObj(v)) return null;
  const targetName = text(v.targetName, LIMITS.name);
  const alliance = text(v.alliance, 60);
  if (targetName === undefined || alliance === undefined) return null;
  return { targetName, alliance };
}

export function sanitizeNotification(
  v: unknown,
): { message: string; type: string; requesterId?: string; targetId?: string } | null {
  if (!isObj(v)) return null;
  const message = text(v.message);
  if (!message) return null;
  const note: { message: string; type: string; requesterId?: string; targetId?: string } = {
    message,
    type: text(v.type, 20) ?? 'info',
  };
  const requesterId = id(v.requesterId);
  const targetId = id(v.targetId);
  if (requesterId) note.requesterId = requesterId;
  if (targetId) note.targetId = targetId;
  return note;
}

export function sanitizeGeneralAnimation(v: unknown): { name: string } | null {
  if (!isObj(v)) return null;
  const name = text(v.name, LIMITS.name);
  return name === undefined ? null : { name };
}
