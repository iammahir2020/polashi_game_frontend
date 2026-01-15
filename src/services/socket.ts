import { io, Socket } from "socket.io-client";
import type { Room, RoomJoinedPayload } from "../types/game";

const SOCKET_URL = "https://polashi-game-backend.onrender.com/";
// const SOCKET_URL = "http://172.16.16.6:3000/";

class SocketService {
  socket: Socket;
  private initialized = false;

  constructor() {
    this.socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }


  connect() {
    if (this.initialized) return;

    this.socket.connect();
    this.initialized = true;

    this.socket.on("connect", () => {
      console.log("🟢 Socket connected:", this.socket.id);
      
      const savedRoom = localStorage.getItem("roomCode");
      const savedPlayer = localStorage.getItem("playerId");
      if (savedRoom && savedPlayer) {
        this.reconnect(savedRoom, savedPlayer);
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason);
    });
  }

  disconnect() {
    if (this.socket.connected) {
      this.socket.disconnect();
      this.initialized = false;
    }
  }

  createRoom(name: string) {
    this.socket.emit("createRoom", { name });
  }

  closeRoom(roomCode: string, playerId: string) {
    this.socket.emit("closeRoom", { roomCode, requesterId: playerId });
  }

  joinRoom(roomCode: string, name: string) {
    this.socket.emit("joinRoom", { roomCode, name });
  }

  reconnect(roomCode: string, playerId: string) {
    this.socket.emit("reconnectPlayer", { roomCode, playerId });
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

  makeMove(roomCode: string, playerId: string, move: any) {
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

  startGame(roomCode: string, playerId: string) {
    this.socket.emit("startGame", { roomCode, requesterId: playerId });
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

  onGuptochorResult(cb: (data: { targetName: string, alliance: string }) => void) {
    this.socket.on("guptochorResult", cb);
  }

  onRoomJoined(cb: (data: RoomJoinedPayload) => void) {
    this.socket.on("roomJoined", cb);
  }

  onRoomDissolved(cb: () => void) {
    this.socket.on("roomDissolved", cb);
  }

  onRoomUpdated(cb: (room: Room) => void) {
    this.socket.on("roomUpdated", cb);
  }

  onGeneralAnimation(cb: (data: { name: string }) => void) {
    this.socket.on("triggerGeneralAnimation", cb);
  }

  onGameUpdated(cb: (data: { room: Room }) => void) {
    this.socket.on("gameUpdated", cb);
  }

  onError(cb: (msg: string) => void) {
    this.socket.on("errorMessage", cb);
  }

  onKicked(cb: () => void) {
    this.socket.on("kicked", cb);
  }

  onNotification(callback: (data: { message: string, type: string }) => void) {
    this.socket.on("notification", callback);
  }
  
  offAll() {
    this.socket.removeAllListeners();
  }

  offRoomJoined() { this.socket.off("roomJoined"); }
  offRoomUpdated() { this.socket.off("roomUpdated"); }
  offGameUpdated() { this.socket.off("gameUpdated"); }
  offGeneralAnimation() { this.socket.off("triggerGeneralAnimation"); }
  offError() { this.socket.off("errorMessage"); }
  offKicked() { this.socket.off("kicked"); }
  offRoomDissolved() { this.socket.off("roomDissolved"); }
  offGuptochorResult() { this.socket.off("guptochorResult"); }
  offNotification() { this.socket.off("notification"); }
}

export const socketService = new SocketService();