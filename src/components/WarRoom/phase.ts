import type { Player, Room } from "../../types/game";
import { MISSION_CONFIGS } from "../../constants";

export interface PhaseInput {
  room: Room;
  me: Player | undefined;
  currentGeneral: Player | null;
  isGameMaster: boolean;
  awaitingNewGeneral: boolean;
  isTurnComplete: boolean;
}

// What the table is waiting for, in one line. Display only: it reads the same
// room state the rest of the screen already shows.
export function phaseMessage({
  room, me, currentGeneral, isGameMaster, awaitingNewGeneral, isTurnComplete,
}: PhaseInput): string {
  if (room.gameStatus === "OVER") return room.winner ? `The campaign is over. ${room.winner} prevail.` : "The campaign is over.";
  if (room.gameStatus === "MIR_JAFOR_TURN") return "The final betrayal: Mir Jafor is choosing a target.";
  if (room.voting?.active) {
    return room.voting.type === "teamApproval"
      ? "The council is voting on the proposed battalion."
      : "The battalion is on its mission. Its members vote in secret.";
  }
  if (room.voting) return "The verdict is in.";
  if (awaitingNewGeneral) return isTurnComplete ? "Your turn is done, waiting for new general" : "Waiting for new general";
  if (!currentGeneral) {
    return isGameMaster ? "Appoint a General to lead this mission." : "Waiting for the host to appoint a General.";
  }
  const needed = MISSION_CONFIGS[room.activePlayerIds?.length || 5]?.[(room.currentRound || 1) - 1]?.players;
  if (me?.id === currentGeneral.id) return "You are the General. Choose your battalion.";
  return needed
    ? `${currentGeneral.name} is choosing a battalion of ${needed}.`
    : `${currentGeneral.name} is choosing a battalion.`;
}
