import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { config } from "../config.js";
import { extractGameDataFromSpreadsheet } from "./extractFromSpreadsheet.js";

describe("Spreadsheet extraction", () => {
  const hasSheet = fs.existsSync(config.SPREADSHEET_PATH);
  const maybe = hasSheet ? extractGameDataFromSpreadsheet(config.SPREADSHEET_PATH) : null;

  it.skipIf(!hasSheet)("loads 124 base cards with 6-stage rarity paths", () => {
    expect(maybe!.cards).toHaveLength(124);
    for (const card of maybe!.cards) {
      expect(card.rarityPath).toHaveLength(6);
    }
  });

  it.skipIf(!hasSheet)("normalizes foil odds artifacts into integer one-in values", () => {
    const odds = maybe!.pullOdds.foilOneInByTier;
    for (const tier of Object.keys(odds) as Array<keyof typeof odds>) {
      for (const rarity of Object.keys(odds[tier]) as Array<keyof (typeof odds)[typeof tier]>) {
        expect(Number.isInteger(odds[tier][rarity])).toBe(true);
        expect(odds[tier][rarity]).toBeGreaterThan(0);
      }
    }
  });

  it.skipIf(!hasSheet)("extracts quest definitions from Quest Mode", () => {
    expect(maybe!.questDefinitions.length).toBeGreaterThan(0);
    expect(maybe!.questDefinitions.some((q) => q.rarity === "Common")).toBe(true);
  });
});
