import type { MissionRequirement } from "./types/game";
export type MissionConfigs = Record<number, MissionRequirement[]>;
export type Distribution = {
  nawabs: number;
  eic: number;
}

export const MISSION_CONFIGS: MissionConfigs = {
  5: [
    { players: 2, failsRequired: 1 }, { players: 3, failsRequired: 1 },
    { players: 2, failsRequired: 1 }, { players: 3, failsRequired: 1 },
    { players: 3, failsRequired: 1 }
  ],
  6: [
    { players: 2, failsRequired: 1 }, { players: 3, failsRequired: 1 },
    { players: 4, failsRequired: 1 }, { players: 3, failsRequired: 1 },
    { players: 4, failsRequired: 1 }
  ],
  7: [
    { players: 2, failsRequired: 1 }, { players: 3, failsRequired: 1 },
    { players: 3, failsRequired: 1 }, { players: 4, failsRequired: 2 }, // Round 4: 2 fails needed
    { players: 4, failsRequired: 1 }
  ],
  8: [
    { players: 3, failsRequired: 1 }, { players: 4, failsRequired: 1 },
    { players: 4, failsRequired: 1 }, { players: 5, failsRequired: 2 }, // Round 4: 2 fails needed
    { players: 5, failsRequired: 1 }
  ],
  9: [
    { players: 3, failsRequired: 1 }, { players: 4, failsRequired: 1 },
    { players: 4, failsRequired: 1 }, { players: 5, failsRequired: 2 }, // Round 4: 2 fails needed
    { players: 5, failsRequired: 1 }
  ],
  10: [
    { players: 3, failsRequired: 1 }, { players: 4, failsRequired: 1 },
    { players: 4, failsRequired: 1 }, { players: 5, failsRequired: 2 }, // Round 4: 2 fails needed
    { players: 5, failsRequired: 1 }
  ]
}

export const TEAM_DISTRIBUTIONS: Record<number, Distribution> = {
  5: { nawabs: 3, eic: 2 },
  6: { nawabs: 4, eic: 2 },
  7: { nawabs: 4, eic: 3 },
  8: { nawabs: 5, eic: 3 },
  9: { nawabs: 6, eic: 3 },
  10: { nawabs: 6, eic: 4 },
};