import type { GameData } from "../data/schema.js";
import type { PlayerRepository } from "../db/repositories.js";
import type { PveBattleResult, Rarity } from "../types.js";
import type { RandomSource } from "./random.js";

export class PveEngine {
  constructor(
    private readonly gameData: GameData,
    private readonly players: PlayerRepository,
    private readonly random: RandomSource,
  ) {}

  runWave(playerId: string, wave: number, teamCardIds: string[]): PveBattleResult {
    const waveDef = this.gameData.pveWaves.find((w) => w.wave === wave);
    if (!waveDef) {
      throw new Error("Wave not found.");
    }
    if (teamCardIds.length < 1) {
      throw new Error("Team requires at least 1 combat card.");
    }

    const ownedMap = new Map(this.players.listOwnedCards(playerId).map((c) => [c.cardId, c]));

    let teamPower = 0;
    const usedCards = teamCardIds.slice(0, 4);
    for (const cardId of usedCards) {
      const owned = ownedMap.get(cardId);
      if (!owned) continue;
      const cardDef = this.gameData.cards.find((c) => c.id === owned.cardId);
      if (!cardDef || cardDef.archetype === "Support") continue;
      const rarity = cardDef.rarityPath[owned.stage] as Rarity;
      const stats = this.gameData.combatStatsByRarity[rarity];
      teamPower +=
        stats.strengthMin +
        stats.attackPerLevel * owned.level +
        stats.defensePerLevel * owned.level +
        stats.healthPerLevel * owned.level;
    }

    if (teamPower <= 0) {
      throw new Error("Team has no valid combat power.");
    }

    const variance = 0.9 + this.random.next() * 0.2;
    const effectivePower = Math.floor(teamPower * variance);
    const outcome = effectivePower >= waveDef.enemyPower ? "win" : "loss";
    const rewards =
      outcome === "win"
        ? {
            gold: waveDef.rewardGold,
            crystals: waveDef.rewardCrystals,
            fame: waveDef.rewardFame,
            xp: waveDef.rewardXp,
          }
        : { gold: 0, crystals: 0, fame: 0, xp: 0 };

    this.players.addBattleRewards(playerId, wave, outcome, rewards);

    return {
      wave,
      outcome,
      rewards,
      cardXpChanges: usedCards.map((cardId) => ({
        cardId,
        xpGained: outcome === "win" ? Math.floor(waveDef.rewardXp / usedCards.length) : 0,
      })),
      resourceChanges: {
        gold: rewards.gold,
        crystals: rewards.crystals,
        fame: rewards.fame,
      },
    };
  }
}
