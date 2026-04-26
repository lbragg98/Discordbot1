import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { rarityOrder, type Rarity, type Tier } from "../types.js";
import type { GameData } from "./schema.js";

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const num = Number(cleaned);
    if (Number.isFinite(num)) return num;
  }
  return fallback;
}

function parseDurationMinutes(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(1, Math.floor(raw));
  const text = String(raw ?? "").trim().toLowerCase();
  const minMatch = text.match(/(\d+)\s*min/);
  if (minMatch) return Number(minMatch[1]);
  const hourMatch = text.match(/(\d+)\s*hr/);
  if (hourMatch) return Number(hourMatch[1]) * 60;
  return 5;
}

function parseFoilOneIn(value: unknown): number {
  if (typeof value === "string") {
    const m = value.match(/^1\s*\/\s*([0-9,]+)$/);
    if (m) return Number(m[1].replace(/,/g, ""));
    const asNum = Number(value.replace(/,/g, ""));
    if (Number.isFinite(asNum) && asNum > 0) return asNum;
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (value instanceof Date) {
    return value.getFullYear();
  }
  return 1000;
}

function readSheetRows(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Missing required sheet: ${sheetName}`);
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    blankrows: false,
    defval: null,
  }) as unknown[][];
}

function normalizeRarity(raw: unknown): Rarity {
  const txt = String(raw ?? "").trim();
  const found = rarityOrder.find((r) => r.toLowerCase() === txt.toLowerCase());
  if (found) return found;
  return "Common";
}

export function extractGameDataFromSpreadsheet(spreadsheetPath: string): GameData {
  const workbook = XLSX.readFile(spreadsheetPath, { cellDates: true });

  const cardRows = readSheetRows(workbook, "Core Card Library");
  const cards = cardRows
    .filter((r) => String(r[0] ?? "").startsWith("#"))
    .map((r) => {
      const id = String(r[0]).trim();
      const nameCell = String(r[1] ?? "").trim();
      return {
        id,
        baseName: nameCell.length > 0 ? nameCell : `Unknown ${id}`,
        archetype: String(r[2] ?? "Support").trim() || "Support",
        subtype: String(r[3] ?? "Booster").trim() || "Booster",
        faction: String(r[4] ?? "Unaligned").trim() || "Unaligned",
        rarityPath: [r[5], r[6], r[7], r[8], r[9], r[10]].map(normalizeRarity),
      };
    });

  const pullRows = readSheetRows(workbook, "Pull Odds");
  const tiers: Tier[] = ["F2P", "T1", "T2", "T3"];
  const rarityByTier: Record<Tier, Record<Rarity, number>> = {
    F2P: { Common: 0, Uncommon: 0, Rare: 0, Epic: 0, Superior: 0, Legendary: 0, Ultimate: 0 },
    T1: { Common: 0, Uncommon: 0, Rare: 0, Epic: 0, Superior: 0, Legendary: 0, Ultimate: 0 },
    T2: { Common: 0, Uncommon: 0, Rare: 0, Epic: 0, Superior: 0, Legendary: 0, Ultimate: 0 },
    T3: { Common: 0, Uncommon: 0, Rare: 0, Epic: 0, Superior: 0, Legendary: 0, Ultimate: 0 },
  };
  const foilOneInByTier: Record<Tier, Record<Rarity, number>> = {
    F2P: { Common: 1000, Uncommon: 1000, Rare: 2500, Epic: 5000, Superior: 7000, Legendary: 10000, Ultimate: 12000 },
    T1: { Common: 900, Uncommon: 900, Rare: 2000, Epic: 4000, Superior: 6000, Legendary: 8000, Ultimate: 10000 },
    T2: { Common: 800, Uncommon: 800, Rare: 1500, Epic: 3000, Superior: 5000, Legendary: 6000, Ultimate: 8000 },
    T3: { Common: 700, Uncommon: 700, Rare: 1000, Epic: 2500, Superior: 4000, Legendary: 5000, Ultimate: 6000 },
  };

  for (const row of pullRows) {
    const label = String(row[1] ?? "").trim();
    if (!label) continue;
    if (label.endsWith("Pull Chance")) {
      const rarityPrefix = label.split(" ")[0];
      const mappedRarity: Record<string, Rarity> = {
        C: "Common",
        UC: "Uncommon",
        R: "Rare",
        E: "Epic",
        S: "Superior",
        L: "Legendary",
        U: "Ultimate",
      };
      const rarity = mappedRarity[rarityPrefix];
      if (!rarity) continue;
      tiers.forEach((tier, i) => {
        rarityByTier[tier][rarity] = asNumber(row[i + 2], 0);
      });
    }
    if (label.endsWith("Foil Chance")) {
      const rarityPrefix = label.split(" ")[0];
      const mappedRarity: Record<string, Rarity> = {
        C: "Common",
        UC: "Uncommon",
        R: "Rare",
        E: "Epic",
        S: "Superior",
        L: "Legendary",
        U: "Ultimate",
      };
      const rarity = mappedRarity[rarityPrefix];
      if (!rarity) continue;
      tiers.forEach((tier, i) => {
        foilOneInByTier[tier][rarity] = parseFoilOneIn(row[i + 2]);
      });
    }
  }

  const evoRows = readSheetRows(workbook, "Evolution Requirements");
  const shardReq: Record<number, number> = {};
  let piecesRow: unknown[] | undefined;
  for (const row of evoRows) {
    if (row.some((cell) => String(cell ?? "").trim() === "Pieces")) {
      piecesRow = row;
      break;
    }
  }
  if (piecesRow) {
    const idx = piecesRow.findIndex((cell) => String(cell ?? "").trim() === "Pieces");
    for (let stage = 1; stage <= 5; stage += 1) {
      shardReq[stage] = asNumber(piecesRow[idx + stage], stage * 50);
    }
  }

  const rarityColumns = ["C", "UC", "R", "E", "S", "L", "U"];
  const rarityMap: Record<string, Rarity> = {
    C: "Common",
    UC: "Uncommon",
    R: "Rare",
    E: "Epic",
    S: "Superior",
    L: "Legendary",
    U: "Ultimate",
  };
  const findRow = (label: string) =>
    evoRows.find((r) => r.some((cell) => String(cell ?? "").trim() === label)) ?? [];
  const valueAtLabelOffset = (row: unknown[], label: string, offset: number): unknown => {
    const idx = row.findIndex((cell) => String(cell ?? "").trim() === label);
    if (idx < 0) return null;
    return row[idx + offset];
  };
  const goldRow = findRow("Gold");
  const crystalRow = findRow("Crystals");
  const fameRow = findRow("Fame");
  const evolutionCostByRarity: GameData["evolutionCostByRarity"] = {
    Common: { gold: 0, crystals: 0, fame: 0 },
    Uncommon: { gold: 0, crystals: 0, fame: 0 },
    Rare: { gold: 0, crystals: 0, fame: 0 },
    Epic: { gold: 0, crystals: 0, fame: 0 },
    Superior: { gold: 0, crystals: 0, fame: 0 },
    Legendary: { gold: 0, crystals: 0, fame: 0 },
    Ultimate: { gold: 0, crystals: 0, fame: 0 },
  };
  rarityColumns.forEach((code, i) => {
    const rarity = rarityMap[code];
    evolutionCostByRarity[rarity] = {
      gold: asNumber(valueAtLabelOffset(goldRow, "Gold", i + 1), 0),
      crystals: asNumber(valueAtLabelOffset(crystalRow, "Crystals", i + 1), 0),
      fame: asNumber(valueAtLabelOffset(fameRow, "Fame", i + 1), 0),
    };
  });

  const combatRows = readSheetRows(workbook, "Combat Card Stats");
  const rowByLabel = (label: string) =>
    combatRows.find((r) => String(r[0] ?? "").trim() === label) ?? [];
  const strengthMin = rowByLabel("Strength Min");
  const attackPerLevel = rowByLabel("Atk Increase");
  const defensePerLevel = rowByLabel("Def Increase");
  const speedPerLevel = rowByLabel("Spd Increase");
  const healthPerLevel = rowByLabel("Hlth Increase");
  const xpPerLevel = rowByLabel("XP Per Level");

  const combatStatsByRarity: GameData["combatStatsByRarity"] = {
    Common: { strengthMin: asNumber(strengthMin[1], 100), attackPerLevel: asNumber(attackPerLevel[1], 10), defensePerLevel: asNumber(defensePerLevel[1], 10), speedPerLevel: asNumber(speedPerLevel[1], 10), healthPerLevel: asNumber(healthPerLevel[1], 25), xpPerLevel: asNumber(xpPerLevel[1], 100) },
    Uncommon: { strengthMin: asNumber(strengthMin[2], 1000), attackPerLevel: asNumber(attackPerLevel[2], 25), defensePerLevel: asNumber(defensePerLevel[2], 25), speedPerLevel: asNumber(speedPerLevel[2], 25), healthPerLevel: asNumber(healthPerLevel[2], 50), xpPerLevel: asNumber(xpPerLevel[2], 250) },
    Rare: { strengthMin: asNumber(strengthMin[3], 6250), attackPerLevel: asNumber(attackPerLevel[3], 50), defensePerLevel: asNumber(defensePerLevel[3], 50), speedPerLevel: asNumber(speedPerLevel[3], 50), healthPerLevel: asNumber(healthPerLevel[3], 100), xpPerLevel: asNumber(xpPerLevel[3], 500) },
    Epic: { strengthMin: asNumber(strengthMin[4], 25000), attackPerLevel: asNumber(attackPerLevel[4], 100), defensePerLevel: asNumber(defensePerLevel[4], 100), speedPerLevel: asNumber(speedPerLevel[4], 100), healthPerLevel: asNumber(healthPerLevel[4], 250), xpPerLevel: asNumber(xpPerLevel[4], 1000) },
    Superior: { strengthMin: asNumber(strengthMin[5], 100000), attackPerLevel: asNumber(attackPerLevel[5], 250), defensePerLevel: asNumber(defensePerLevel[5], 250), speedPerLevel: asNumber(speedPerLevel[5], 250), healthPerLevel: asNumber(healthPerLevel[5], 500), xpPerLevel: asNumber(xpPerLevel[5], 2500) },
    Legendary: { strengthMin: asNumber(strengthMin[6], 500000), attackPerLevel: asNumber(attackPerLevel[6], 500), defensePerLevel: asNumber(defensePerLevel[6], 500), speedPerLevel: asNumber(speedPerLevel[6], 500), healthPerLevel: asNumber(healthPerLevel[6], 1000), xpPerLevel: asNumber(xpPerLevel[6], 5000) },
    Ultimate: { strengthMin: asNumber(strengthMin[7], 2500000), attackPerLevel: asNumber(attackPerLevel[7], 1000), defensePerLevel: asNumber(defensePerLevel[7], 1000), speedPerLevel: asNumber(speedPerLevel[7], 1000), healthPerLevel: asNumber(healthPerLevel[7], 2500), xpPerLevel: asNumber(xpPerLevel[7], 10000) },
  };

  const questRows = readSheetRows(workbook, "Quest Mode");
  const questDefinitions = questRows
    .filter((r) => {
      const rarity = String(r[3] ?? "").trim();
      return ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Hero"].includes(rarity);
    })
    .map((r) => ({
      rarity: String(r[3]).trim(),
      durationMinutes: parseDurationMinutes(r[4]),
      rewardGold: asNumber(r[5], 0),
      rewardCrystals: asNumber(r[6], 0),
      rewardFame: asNumber(r[7], 0),
    }));

  const pveRows = readSheetRows(workbook, "Adventure Mode");
  const pveWaves = pveRows
    .filter((r) => typeof r[1] === "number" && Number.isFinite(r[1] as number))
    .map((r) => {
      const wave = asNumber(r[1], 1);
      const rewardGold = asNumber(String(r[3] ?? "").replace(" Gold", "").trim(), 100);
      const rewardCrystals = wave >= 8 ? Math.floor(rewardGold * 0.2) : 0;
      const rewardFame = wave >= 7 ? Math.floor(rewardGold * 0.05) : 0;
      const enemyPower = 800 + wave * 900;
      return { wave, enemyPower, rewardGold, rewardCrystals, rewardFame, rewardXp: 100 + wave * 20 };
    })
    .filter((w) => w.wave <= 500);

  for (let wave = pveWaves.length + 1; wave <= 500; wave += 1) {
    pveWaves.push({
      wave,
      enemyPower: 800 + wave * 900,
      rewardGold: 100 + Math.floor(wave * 45),
      rewardCrystals: wave >= 8 ? Math.floor((100 + wave * 45) * 0.2) : 0,
      rewardFame: wave >= 7 ? Math.floor((100 + wave * 45) * 0.05) : 0,
      rewardXp: 100 + wave * 20,
    });
  }

  const gameData: GameData = {
    cards,
    pullOdds: { rarityByTier, foilOneInByTier },
    evolutionShardRequirements: shardReq,
    evolutionCostByRarity,
    combatStatsByRarity,
    pveWaves: pveWaves.sort((a, b) => a.wave - b.wave),
    questDefinitions,
  };

  return gameData;
}

export function saveGameDataJson(gameData: GameData, outputPath: string): void {
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(gameData, null, 2), "utf8");
}
