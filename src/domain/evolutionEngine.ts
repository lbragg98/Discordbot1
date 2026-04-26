import type { GameData } from "../data/schema.js";
import type { PlayerRepository } from "../db/repositories.js";
import type { EvolutionRequest, EvolutionResult, Rarity } from "../types.js";

export class EvolutionEngine {
  constructor(
    private readonly gameData: GameData,
    private readonly players: PlayerRepository,
  ) {}

  evolve(request: EvolutionRequest): EvolutionResult {
    const card = this.gameData.cards.find((c) => c.id === request.cardId);
    if (!card) {
      throw new Error("Card does not exist.");
    }
    const state = this.players.getCardState(request.playerId, request.cardId);
    if (state.stage >= 5) {
      throw new Error("Card is already at max evolution.");
    }

    const currentRarity = card.rarityPath[state.stage] as Rarity;
    const costs = this.gameData.evolutionCostByRarity[currentRarity];
    const shardCost = this.gameData.evolutionShardRequirements[state.stage + 1];
    if (!costs || !shardCost) {
      throw new Error("Evolution data unavailable for this stage.");
    }

    this.players.spendEvolutionResources(request.playerId, request.cardId, shardCost, costs);

    const nextStage = state.stage + 1;
    const nextRarity = card.rarityPath[nextStage] as Rarity;
    const statBase = this.gameData.combatStatsByRarity[nextRarity];

    return {
      cardId: request.cardId,
      fromStage: state.stage,
      toStage: nextStage,
      costsPaid: {
        gold: costs.gold,
        crystals: costs.crystals,
        fame: costs.fame,
        shards: shardCost,
      },
      newStats: {
        strength: statBase.strengthMin + statBase.attackPerLevel,
        attack: statBase.attackPerLevel,
        defense: statBase.defensePerLevel,
        speed: statBase.speedPerLevel,
        health: statBase.healthPerLevel,
      },
    };
  }
}
