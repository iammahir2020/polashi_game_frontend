export type Player = {
  id: string;
  name: string;
  online?: boolean;
  socketId?: string;
  isGameMaster?: boolean;
  character?: CharacterType | null;
  isGeneral?: boolean;
  lastCharacterId?: number | null;
};

export type MissionRequirement = {
  players: number;
  failsRequired: number;
}

export type VotingState = {
  active: boolean;
  votes: Record<string, "yes" | "no">; // Key is playerId, value is "yes" or "no"
  result: "Yes" | "No" | null;
  type: "teamApproval" | "missionOutcome";
};

export type Room = {
  roomCode: string;
  players: Player[];
  turnIndex: number;
  locked?: boolean;
  gameStarted?: boolean;
  secretIntel?: string[]; 
  voting?: VotingState | null;
  proposedTeam?: string[];

  currentRound: number;      
  scoreGreen: number;        
  scoreRed: number;          
  roundHistory: ("Green" | "Red")[]; 
  gameStatus: "ACTIVE" | "OVER" | "WAITING";
  winner?: string;

  guptochorId: string | null;      
  nextGuptochorId: string | null;  
  guptochorUsed: boolean;     
};

export type RoomJoinedPayload = {
  roomCode: string;
  room: Room;
  role: "player";
  playerId: string;
  isGameMaster: boolean;
};

export type CharacterType = {
    id: number,
    name: string,
    description: string,
    color: string,
    team: "Nawabs" | "East India Company (EIC)"
}
