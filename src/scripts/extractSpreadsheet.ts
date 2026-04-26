import { config } from "../config.js";
import { extractGameDataFromSpreadsheet, saveGameDataJson } from "../data/extractFromSpreadsheet.js";
import { gameDataSchema } from "../data/schema.js";

const gameData = extractGameDataFromSpreadsheet(config.SPREADSHEET_PATH);
gameDataSchema.parse(gameData);
saveGameDataJson(gameData, config.generatedDataPath);

console.log(`Wrote normalized game data to ${config.generatedDataPath}`);
console.log(`Cards: ${gameData.cards.length}, PvE waves: ${gameData.pveWaves.length}`);
