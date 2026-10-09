import type { Player, Room } from "../../types/game";
import { MISSION_CONFIGS } from "../../constants";
import { makeI18n, type I18n } from "../../i18n/core";

const ENGLISH = makeI18n("en", () => {});

export interface PhaseInput {
  room: Room;
  me: Player | undefined;
  currentGeneral: Player | null;
  isGameMaster: boolean;
  awaitingNewGeneral: boolean;
  isTurnComplete: boolean;
}

// What the table is waiting for, in one line. Display only: it reads the same
// room state the rest of the screen already shows. In English unless given
// the current language's `useI18n()`.
export function phaseMessage(
  { room, me, currentGeneral, isGameMaster, awaitingNewGeneral, isTurnComplete }: PhaseInput,
  { t, winner }: Pick<I18n, "t" | "winner"> = ENGLISH,
): string {
  if (room.gameStatus === "OVER") return room.winner ? t("phase.overWinner", { winner: winner(room.winner) }) : t("phase.over");
  if (room.gameStatus === "MIR_JAFOR_TURN") return t("phase.mirJafor");
  if (room.voting?.active) {
    return room.voting.type === "teamApproval" ? t("phase.councilVoting") : t("phase.missionVoting");
  }
  if (room.voting) return t("phase.verdict");
  if (awaitingNewGeneral) return isTurnComplete ? t("phase.turnDone") : t("phase.waitingNewGeneral");
  if (!currentGeneral) {
    return isGameMaster ? t("phase.appointGeneral") : t("phase.waitingForHost");
  }
  const needed = MISSION_CONFIGS[room.activePlayerIds?.length || 5]?.[(room.currentRound || 1) - 1]?.players;
  if (me?.id === currentGeneral.id) return t("phase.youAreGeneral");
  return needed
    ? t("phase.generalChoosingCount", { name: currentGeneral.name, count: needed })
    : t("phase.generalChoosing", { name: currentGeneral.name });
}
