import { z } from "zod";
import type { Rarity, Tier } from "../types.js";

const raritySchema = z.enum([
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Superior",
  "Legendary",
  "Ultimate",
]);

const tierSchema = z.enum(["F2P", "T1", "T2", "T3"]);

export interface CardDefinition {
  id: string;
  baseName: string;
  faction: string;
  archetype: string;
  subtype: string;
  rarityPath: Rarity[];
}

export interface PullOdds {
  rarityByTier: Record<Tier, Record<Rarity, number>>;
  foilOneInByTier: Record<Tier, Record<Rarity, number>>;
}

export interface EvolutionCostByRarity {
  gold: number;
  crystals: number;
  fame: number;
}

export interface QuestDefinition {
  rarity: string;
  durationMinutes: number;
  rewardGold: number;
  rewardCrystals: number;
  rewardFame: number;
}

export interface GameData {
  cards: CardDefinition[];
  pullOdds: PullOdds;
  evolutionShardRequirements: Record<number, number>;
  evolutionCostByRarity: Record<Rarity, EvolutionCostByRarity>;
  combatStatsByRarity: Record<
    Rarity,
    {
      strengthMin: number;
      attackPerLevel: number;
      defensePerLevel: number;
      speedPerLevel: number;
      healthPerLevel: number;
      xpPerLevel: number;
    }
  >;
  pveWaves: Array<{
    wave: number;
    enemyPower: number;
    rewardGold: number;
    rewardCrystals: number;
    rewardFame: number;
    rewardXp: number;
  }>;
  questDefinitions: QuestDefinition[];
}

export const gameDataSchema: z.ZodType<GameData> = z.object({
  cards: z.array(
    z.object({
      id: z.string(),
      baseName: z.string(),
      faction: z.string(),
      archetype: z.string(),
      subtype: z.string(),
      rarityPath: z.array(raritySchema).length(6),
    }),
  ),
  pullOdds: z.object({
    rarityByTier: z.record(
      tierSchema,
      z.record(raritySchema, z.number().min(0).max(1)),
    ),
    foilOneInByTier: z.record(
      tierSchema,
      z.record(raritySchema, z.number().int().positive()),
    ),
  }),
  evolutionShardRequirements: z.record(z.coerce.number().int().min(1), z.number()),
  evolutionCostByRarity: z.record(
    raritySchema,
    z.object({
      gold: z.number().nonnegative(),
      crystals: z.number().nonnegative(),
      fame: z.number().nonnegative(),
    }),
  ),
  combatStatsByRarity: z.record(
    raritySchema,
    z.object({
      strengthMin: z.number().positive(),
      attackPerLevel: z.number().nonnegative(),
      defensePerLevel: z.number().nonnegative(),
      speedPerLevel: z.number().nonnegative(),
      healthPerLevel: z.number().nonnegative(),
      xpPerLevel: z.number().positive(),
    }),
  ),
  pveWaves: z.array(
    z.object({
      wave: z.number().int().positive(),
      enemyPower: z.number().positive(),
      rewardGold: z.number().nonnegative(),
      rewardCrystals: z.number().nonnegative(),
      rewardFame: z.number().nonnegative(),
      rewardXp: z.number().nonnegative(),
    }),
  ),
  questDefinitions: z.array(
    z.object({
      rarity: z.string(),
      durationMinutes: z.number().int().positive(),
      rewardGold: z.number().nonnegative(),
      rewardCrystals: z.number().nonnegative(),
      rewardFame: z.number().nonnegative(),
    }),
  ),
});
