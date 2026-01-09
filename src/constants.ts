import type { MissionRequirement } from "./types/game";

export const MISSION_REQUIREMENTS: MissionRequirement[] = [
    { players: 3, failsRequired: 1 }, // R1
    { players: 4, failsRequired: 1 }, // R2
    { players: 4, failsRequired: 1 }, // R3
    { players: 5, failsRequired: 2 }, // R4 - The tricky one
    { players: 5, failsRequired: 1 }, // R5
  ];