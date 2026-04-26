import { config } from "../config.js";
import { loadGameData } from "../data/gameData.js";
import { openDatabase, runMigrations } from "../db/database.js";
import { GameDataRepository } from "../db/repositories.js";
import { rarityOrder } from "../types.js";

const db = openDatabase(config.BOT_DB_PATH);
runMigrations(db);
const repo = new GameDataRepository(db);
const data = loadGameData(config.generatedDataPath);

repo.replaceSeedData({
  cards: data.cards.map((c) => ({ ...c })),
  pullOdds: (["F2P", "T1", "T2", "T3"] as const).flatMap((tier) =>
    rarityOrder.map((rarity) => ({
      tier,
      rarity,
      chance: data.pullOdds.rarityByTier[tier][rarity],
      foilOneIn: data.pullOdds.foilOneInByTier[tier][rarity],
    })),
  ),
  evolutionCosts: rarityOrder.map((rarity) => ({
    rarity,
    ...data.evolutionCostByRarity[rarity],
  })),
  shardRequirements: Object.entries(data.evolutionShardRequirements).map(([stage, shardsRequired]) => ({
    stage: Number(stage),
    shardsRequired,
  })),
  combatStats: rarityOrder.map((rarity) => ({
    rarity,
    ...data.combatStatsByRarity[rarity],
  })),
  pveWaves: data.pveWaves,
  questDefinitions: data.questDefinitions,
});

console.log("Seed complete:", repo.getSeedStatus());
db.close();
