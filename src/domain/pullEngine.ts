import type { GameData } from "../data/schema.js";
import type { PlayerRepository } from "../db/repositories.js";
import { rarityOrder, type PullResult, type Rarity, type Tier } from "../types.js";
import type { RandomSource } from "./random.js";

export class PullEngine {
  constructor(
    private readonly gameData: GameData,
    private readonly players: PlayerRepository,
    private readonly random: RandomSource,
  ) {}

  pull(playerId: string): PullResult {
    const tier = this.players.getTier(playerId);
    const pity = this.players.getPity(playerId);
    const pityTriggered = pity.pityCounter + 1 >= pity.pityMax;

    let rarity = pityTriggered
      ? this.rollRareOrBetter(tier)
      : this.rollRarity(this.gameData.pullOdds.rarityByTier[tier]);
    if (pityTriggered && rarityOrder.indexOf(rarity) < rarityOrder.indexOf("Rare")) {
      rarity = "Rare";
    }

    const foilOneIn = this.gameData.pullOdds.foilOneInByTier[tier][rarity];
    const foil = this.random.next() < 1 / foilOneIn;

    const candidateCards = this.gameData.cards.filter(
      (card) => card.rarityPath[0] === rarity,
    );
    const picked =
      candidateCards[Math.floor(this.random.next() * candidateCards.length)] ??
      this.gameData.cards[Math.floor(this.random.next() * this.gameData.cards.length)];
    const duplicate = this.players.addCardCopy(playerId, picked.id, foil);

    this.players.incrementPity(playerId, rarityOrder.indexOf(rarity) >= rarityOrder.indexOf("Rare"));

    return {
      cardId: picked.id,
      evolutionStage: 0,
      rarity,
      foil,
      pityReset: pityTriggered || rarityOrder.indexOf(rarity) >= rarityOrder.indexOf("Rare"),
      shardGain: duplicate ? 1 : 0,
    };
  }

  private rollRareOrBetter(tier: Tier): Rarity {
    const odds = this.gameData.pullOdds.rarityByTier[tier];
    const filtered = Object.fromEntries(
      Object.entries(odds).filter(
        ([rarity]) => rarityOrder.indexOf(rarity as Rarity) >= rarityOrder.indexOf("Rare"),
      ),
    ) as Record<Rarity, number>;
    const total = Object.values(filtered).reduce((acc, v) => acc + v, 0);
    const normalized: Record<Rarity, number> = Object.fromEntries(
      Object.entries(filtered).map(([k, v]) => [k, v / total]),
    ) as Record<Rarity, number>;
    return this.rollRarity(normalized);
  }

  private rollRarity(odds: Record<Rarity, number>): Rarity {
    const roll = this.random.next();
    let cumulative = 0;
    for (const rarity of rarityOrder) {
      const chance = odds[rarity] ?? 0;
      cumulative += chance;
      if (roll <= cumulative) {
        return rarity;
      }
    }
    return "Common";
  }
}
