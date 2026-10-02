export type Player = {
  id: string;
  name: string;
  online?: boolean;
  isGameMaster?: boolean;
  character?: CharacterType | null;
  isGeneral?: boolean;
  isObserver?: boolean;
};

export type MissionRequirement = {
  players: number;
  failsRequired: number;
}

export type VotingState = {
  active: boolean;
  // Key is playerId. Value is "yes" | "no" once a vote is cast and visible.
  // `true` is reserved for a redacted secret vote: the backend may confirm a
  // player HAS voted without revealing what they chose while voting is still
  // active. `false` marks a player as explicitly not-yet-voted (as opposed to
  // simply absent from the map) — both are boolean, neither is a real choice.
  // Always read this map through `voteSelectors.ts`, never by key presence.
  votes: Record<string, "yes" | "no" | boolean>;
  result: "Yes" | "No" | null;
  type: "teamApproval" | "missionOutcome";
};

export type Room = {
  roomCode: string;
  players: Player[];
  locked?: boolean;
  gameStarted?: boolean;
  disableSecretIntelligence?: boolean;
  secretIntel?: string[]; 
  voting?: VotingState | null;
  proposedTeam?: string[];

  currentRound: number;      
  scoreGreen: number;        
  scoreRed: number;          
  roundHistory: ("Green" | "Red")[]; 
  gameStatus: "ACTIVE" | "OVER" | "WAITING" | "MIR_JAFOR_TURN";
  winner?: string;

  guptochorId: string | null;      
  nextGuptochorId: string | null;  
  guptochorUsed: boolean;
  
  activePlayerIds: string[];
};

// What the server sends you when you create, join or rejoin a room. The
// reconnect token is your secret for reclaiming this seat later.
export type RoomJoinedPayload = {
  roomCode: string;
  room: Room;
  playerId: string;
  reconnectToken?: string;
};

export type CharacterType = {
    id: number,
    name: string,
    description: string,
    color: string,
    team: "Nawabs" | "East India Company (EIC)"
}
