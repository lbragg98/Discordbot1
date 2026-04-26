export type Tier = "F2P" | "T1" | "T2" | "T3";

export type Rarity =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Epic"
  | "Superior"
  | "Legendary"
  | "Ultimate";

export type Archetype = "Warrior" | "Mage" | "Ranger" | "Patron" | "Support";

export type PassiveCadence = "daily" | "weekly" | "monthly";

export const rarityOrder: Rarity[] = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Superior",
  "Legendary",
  "Ultimate",
];

export interface PullResult {
  cardId: string;
  evolutionStage: number;
  rarity: Rarity;
  foil: boolean;
  pityReset: boolean;
  shardGain: number;
}

export interface EvolutionRequest {
  playerId: string;
  cardId: string;
}

export interface EvolutionResult {
  cardId: string;
  fromStage: number;
  toStage: number;
  costsPaid: {
    gold: number;
    crystals: number;
    fame: number;
    shards: number;
  };
  newStats: {
    strength: number;
    attack: number;
    defense: number;
    speed: number;
    health: number;
  };
}

export interface PveBattleResult {
  wave: number;
  outcome: "win" | "loss";
  rewards: {
    gold: number;
    crystals: number;
    fame: number;
    xp: number;
  };
  cardXpChanges: Array<{ cardId: string; xpGained: number }>;
  resourceChanges: {
    gold: number;
    crystals: number;
    fame: number;
  };
}

export interface PullWindowState {
  windowStart: string;
  windowEnd: string;
  freePullsUsed: number;
  freePullsMax: number;
  canReset: boolean;
}

export interface QuestRunState {
  rarity: string;
  startedAt: string;
  endsAt: string;
  status: "running";
}

export interface PassiveClaimResult {
  cadence: PassiveCadence;
  awards: {
    gold: number;
    crystals: number;
    fame: number;
    premiumHours: number;
  };
  nextEligibleAt: string;
}

export interface PlayerLoadout {
  party: string[];
  team: string[];
  validation: {
    partyValid: boolean;
    partyReason?: string;
    teamValid: boolean;
    teamReason?: string;
  };
}

export interface PlayerSnapshot {
  playerId: string;
  currencies: {
    gold: number;
    crystals: number;
    fame: number;
  };
  pullCounters: {
    pityCounter: number;
    pityMax: number;
  };
  inventorySummary: {
    uniqueCards: number;
    totalCards: number;
    totalShards: number;
  };
  progressionFlags: {
    hasCompletedFirstPull: boolean;
    highestPveWave: number;
  };
  pullWindow: PullWindowState;
  premiumHours: number;
  activeQuest: QuestRunState | null;
  loadout: {
    partyCount: number;
    teamCount: number;
  };
}
