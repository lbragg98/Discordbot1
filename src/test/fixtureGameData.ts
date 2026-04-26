import type { GameData } from "../data/schema.js";

export function createFixtureGameData(): GameData {
  return {
    cards: [
      {
        id: "#001",
        baseName: "Alpha",
        faction: "Unaligned",
        archetype: "Warrior",
        subtype: "Knight",
        rarityPath: ["Common", "Uncommon", "Rare", "Epic", "Superior", "Legendary"],
      },
      {
        id: "#002",
        baseName: "Beta",
        faction: "Unaligned",
        archetype: "Mage",
        subtype: "Wizard",
        rarityPath: ["Rare", "Epic", "Superior", "Superior", "Legendary", "Ultimate"],
      },
      {
        id: "#003",
        baseName: "Gamma",
        faction: "Unaligned",
        archetype: "Ranger",
        subtype: "Archer",
        rarityPath: ["Uncommon", "Rare", "Epic", "Superior", "Legendary", "Ultimate"],
      },
      {
        id: "#004",
        baseName: "Delta",
        faction: "Unaligned",
        archetype: "Patron",
        subtype: "Warlock",
        rarityPath: ["Uncommon", "Rare", "Epic", "Superior", "Legendary", "Ultimate"],
      },
      {
        id: "#005",
        baseName: "Supporter",
        faction: "Unaligned",
        archetype: "Support",
        subtype: "Booster",
        rarityPath: ["Common", "Uncommon", "Rare", "Epic", "Superior", "Legendary"],
      },
    ],
    pullOdds: {
      rarityByTier: {
        F2P: { Common: 0.8, Uncommon: 0.1, Rare: 0.1, Epic: 0, Superior: 0, Legendary: 0, Ultimate: 0 },
        T1: { Common: 0.7, Uncommon: 0.2, Rare: 0.1, Epic: 0, Superior: 0, Legendary: 0, Ultimate: 0 },
        T2: { Common: 0.6, Uncommon: 0.2, Rare: 0.2, Epic: 0, Superior: 0, Legendary: 0, Ultimate: 0 },
        T3: { Common: 0.4, Uncommon: 0.3, Rare: 0.2, Epic: 0.1, Superior: 0, Legendary: 0, Ultimate: 0 },
      },
      foilOneInByTier: {
        F2P: { Common: 750, Uncommon: 1000, Rare: 2500, Epic: 5000, Superior: 7000, Legendary: 10000, Ultimate: 12000 },
        T1: { Common: 750, Uncommon: 1000, Rare: 2500, Epic: 5000, Superior: 7000, Legendary: 10000, Ultimate: 12000 },
        T2: { Common: 750, Uncommon: 1000, Rare: 2500, Epic: 5000, Superior: 7000, Legendary: 10000, Ultimate: 12000 },
        T3: { Common: 750, Uncommon: 1000, Rare: 2500, Epic: 5000, Superior: 7000, Legendary: 10000, Ultimate: 12000 },
      },
    },
    evolutionShardRequirements: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
    evolutionCostByRarity: {
      Common: { gold: 0, crystals: 0, fame: 0 },
      Uncommon: { gold: 0, crystals: 0, fame: 0 },
      Rare: { gold: 0, crystals: 0, fame: 0 },
      Epic: { gold: 0, crystals: 0, fame: 0 },
      Superior: { gold: 0, crystals: 0, fame: 0 },
      Legendary: { gold: 0, crystals: 0, fame: 0 },
      Ultimate: { gold: 0, crystals: 0, fame: 0 },
    },
    combatStatsByRarity: {
      Common: { strengthMin: 100, attackPerLevel: 10, defensePerLevel: 10, speedPerLevel: 10, healthPerLevel: 10, xpPerLevel: 100 },
      Uncommon: { strengthMin: 200, attackPerLevel: 20, defensePerLevel: 20, speedPerLevel: 20, healthPerLevel: 20, xpPerLevel: 100 },
      Rare: { strengthMin: 300, attackPerLevel: 30, defensePerLevel: 30, speedPerLevel: 30, healthPerLevel: 30, xpPerLevel: 100 },
      Epic: { strengthMin: 400, attackPerLevel: 40, defensePerLevel: 40, speedPerLevel: 40, healthPerLevel: 40, xpPerLevel: 100 },
      Superior: { strengthMin: 500, attackPerLevel: 50, defensePerLevel: 50, speedPerLevel: 50, healthPerLevel: 50, xpPerLevel: 100 },
      Legendary: { strengthMin: 600, attackPerLevel: 60, defensePerLevel: 60, speedPerLevel: 60, healthPerLevel: 60, xpPerLevel: 100 },
      Ultimate: { strengthMin: 700, attackPerLevel: 70, defensePerLevel: 70, speedPerLevel: 70, healthPerLevel: 70, xpPerLevel: 100 },
    },
    pveWaves: [
      { wave: 1, enemyPower: 1, rewardGold: 10, rewardCrystals: 0, rewardFame: 0, rewardXp: 50 },
      { wave: 2, enemyPower: 100000, rewardGold: 10, rewardCrystals: 0, rewardFame: 0, rewardXp: 50 },
    ],
    questDefinitions: [
      { rarity: "Common", durationMinutes: 5, rewardGold: 100, rewardCrystals: 0, rewardFame: 0 },
      { rarity: "Rare", durationMinutes: 30, rewardGold: 1250, rewardCrystals: 500, rewardFame: 0 },
    ],
  };
}
