import { io, Socket } from "socket.io-client";
import type { CharacterType, Room } from "../types/game";
import { getPlayerKey, loadSession } from "./sessionStore";
import {
  sanitizeCharacterList,
  sanitizeErrorMessage,
  sanitizeGeneralAnimation,
  sanitizeGuptochorResult,
  sanitizeNotification,
  sanitizeRoom,
  sanitizeRoomJoined,
  type CleanRoomJoined,
} from "./payloads";

// `||` on purpose, not `??`: an EMPTY string (e.g. `VITE_SOCKET_URL=` left
// blank in some environment) should also fall back, not be treated as a
// deliberate "connect to nothing". The fallback is byte-identical to the
// value this used to be hardcoded to, so leaving `VITE_SOCKET_URL` unset
// anywhere (a deploy that predates this change, say) changes nothing.
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "https://polashi-game-backend.onrender.com/";

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

// Drops a malformed server payload instead of letting it reach React.
function guarded<T>(event: string, clean: (raw: unknown) => T | null, cb: (data: T) => void) {
  return (raw: unknown) => {
    const data = clean(raw);
    if (data === null) {
      if (import.meta.env.DEV) console.warn(`Ignored malformed "${event}" payload`, raw);
      return;
    }
    cb(data);
  };
}

// Server events the UI subscribes to. `offAll` removes only these, never the
// service's own connect/disconnect handlers (Steps.md #6).
const GAME_EVENTS = [
  "roomJoined",
  "roomUpdated",
  "errorMessage",
  "roomDissolved",
  "characterListUpdate",
  "triggerGeneralAnimation",
  "guptochorResult",
  "notification",
] as const;

class SocketService {
  socket: Socket;
  private initialized = false;
  // True once a rejoin was sent on the current connection, so a page load
  // doesn't send it twice (the dashboard asks on mount, and so does "connect").
  private rejoinSent = false;

  constructor() {
    this.socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      // Exponential backoff with jitter: 1 s, 2 s, 4 s... up to 30 s, each
      // randomized by +/-50%, so a server restart isn't hit by every client
      // at once and a long outage doesn't mean a retry every few seconds.
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
    });

    // Registered once for the life of the app, so remounting the dashboard
    // (or React StrictMode's mount/unmount/mount) never adds a second copy or
    // loses them.
    this.socket.on("connect", () => {
      devLog("Socket connected");

      const { roomCode, playerId } = loadSession();
      if (roomCode && playerId && !this.rejoinSent) {
        this.reconnect(roomCode, playerId);
      }
    });

    this.socket.on("disconnect", (reason) => {
      this.rejoinSent = false;
      devLog("Socket disconnected:", reason);
    });
  }


  connect() {
    if (this.initialized) return;

    this.socket.connect();
    this.initialized = true;
  }

  createRoom(name: string) {
    this.socket.emit("createRoom", { name, playerKey: getPlayerKey() });
  }

  onCharacterList(callback: (list: CharacterType[]) => void) {
    this.socket.on("characterListUpdate", guarded("characterListUpdate", sanitizeCharacterList, callback));
  }

  closeRoom(roomCode: string, playerId: string) {
    this.socket.emit("closeRoom", { roomCode, requesterId: playerId });
  }

  joinRoom(roomCode: string, name: string) {
    this.socket.emit("joinRoom", { roomCode, name, playerKey: getPlayerKey() });
  }

  // Reclaims a seat. The server requires the secret token it gave this player.
  reconnect(roomCode: string, playerId: string) {
    const { reconnectToken } = loadSession();
    this.rejoinSent = true;
    this.socket.emit("reconnectPlayer", { roomCode, playerId, ...(reconnectToken ? { reconnectToken } : {}) });
  }

  leaveRoom(roomCode: string, playerId: string) {
    this.socket.emit("leaveRoom", { roomCode, playerId });
  }

  startVote(roomCode: string, playerId: string) {
    this.socket.emit("startVote", { roomCode, requesterId: playerId });
  }

  startSecretVote(roomCode: string, playerId: string) {
    this.socket.emit("startSecretVote", { roomCode, requesterId: playerId });
  }

  castVote(roomCode: string, playerId: string, choice: "yes" | "no") {
    this.socket.emit("castVote", { roomCode, playerId, choice });
  }

  proposeTeam(roomCode: string, playerIds: string[]) {
    this.socket.emit("proposeTeam", { roomCode, playerIds });
  }

  clearVote(roomCode: string, playerId: string) {
    this.socket.emit("clearVote", { roomCode, requesterId: playerId });
  }

  makeMove(roomCode: string, playerId: string, move: unknown) {
    this.socket.emit("makeMove", {
      roomCode,
      playerId,
      move,
    });
  }

  lockRoom(roomCode: string,locked:boolean, playerId: string) {
    this.socket.emit("setRoomLock", {
      roomCode,
      locked: locked,
      requesterId: playerId,
    });
  }

  kickPlayer(roomCode: string,targetId:string, playerId: string) {
    this.socket.emit("kickPlayer", {
      roomCode,
      targetPlayerId: targetId,
      requesterId: playerId,
    });
  }

  startGame(
    roomCode: string,
    playerId: string,
    activeIds: string[],
    selectedCharIds: number[],
    disableSecretIntelligence: boolean
  ) {
    this.socket.emit("startGame", { 
      roomCode, 
      requesterId: playerId, 
      activeIds, // Passing the selected battalion to the backend
      selectedCharIds,
      disableSecretIntelligence
    });
  }

  setDisableSecretIntelligence(roomCode: string, playerId: string, disableSecretIntelligence: boolean) {
    this.socket.emit("setDisableSecretIntelligence", {
      roomCode,
      requesterId: playerId,
      disableSecretIntelligence,
    });
  }

  assignGeneral(roomCode: string, playerId: string) {
    this.socket.emit("assignGeneral", { roomCode, requesterId: playerId });
  }

  resetGame(roomCode: string, playerId: string) {
    this.socket.emit("resetGame", { roomCode, requesterId: playerId });
  }

  investigate(roomCode: string, targetId: string, playerId: string) {
    this.socket.emit("investigatePlayer", {
      roomCode,
      targetPlayerId: targetId,
      requesterId: playerId
    });
  }

  attemptAssassination(roomCode: string, targetId: string, playerId: string) {
    this.socket.emit("attemptAssassination", { 
      roomCode, 
      targetId, 
      requesterId: playerId
    });
  }

  onGuptochorResult(cb: (data: { targetName: string, alliance: string }) => void) {
    this.socket.on("guptochorResult", guarded("guptochorResult", sanitizeGuptochorResult, cb));
  }

  onRoomJoined(cb: (data: CleanRoomJoined) => void) {
    this.socket.on("roomJoined", guarded("roomJoined", sanitizeRoomJoined, cb));
  }

  onRoomDissolved(cb: () => void) {
    this.socket.on("roomDissolved", cb);
  }

  onRoomUpdated(cb: (room: Room) => void) {
    this.socket.on("roomUpdated", guarded("roomUpdated", sanitizeRoom, cb));
  }

  onGeneralAnimation(cb: (data: { name: string }) => void) {
    this.socket.on("triggerGeneralAnimation", guarded("triggerGeneralAnimation", sanitizeGeneralAnimation, cb));
  }

  onError(cb: (msg: string) => void) {
    this.socket.on("errorMessage", (raw: unknown) => cb(sanitizeErrorMessage(raw)));
  }

  onNotification(
    callback: (data: { message: string; type: string; requesterId?: string; targetId?: string }) => void,
  ) {
    this.socket.on("notification", guarded("notification", sanitizeNotification, callback));
  }

  requestCharacterList() {
    this.socket.emit("getCharacterList");
  }
  
  offCharacterList() {
    this.socket.off("characterListUpdate");
  }
  
  offAll() {
    GAME_EVENTS.forEach((event) => this.socket.off(event));
  }

  offGeneralAnimation() { this.socket.off("triggerGeneralAnimation"); }
  offRoomDissolved() { this.socket.off("roomDissolved"); }
  offGuptochorResult() { this.socket.off("guptochorResult"); }
  offNotification() { this.socket.off("notification"); }
}

export const socketService = new SocketService();

// Dev-only escape hatch, for E2E tests only: `socketService` is a
// module-scoped singleton, unreachable from outside the app's own code —
// there's no other way for a real browser, driven by Playwright, to inspect
// its internal state (e.g. how many listeners are attached to a given
// event). `Steps.md` #6's own verify criterion needs exactly that
// (`socketService.socket.listeners("roomUpdated").length === 1`), so this
// exists purely to make that checkable, not to change any behavior.
// `import.meta.env.DEV` is statically `false` in a production build — Vite
// replaces it at build time, so this whole block is dead code there and
// gets stripped, never shipped.
if (import.meta.env.DEV) {
  (window as typeof window & { __socketService?: typeof socketService }).__socketService =
    socketService;
}