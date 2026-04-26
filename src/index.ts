import { config } from "./config.js";
import { loadGameData } from "./data/gameData.js";
import { openDatabase, runMigrations } from "./db/database.js";
import { GameDataRepository, PlayerRepository } from "./db/repositories.js";
import { createBot } from "./discord/bot.js";
import { GameService } from "./services/gameService.js";

if (!config.DISCORD_TOKEN || !config.CLIENT_ID || !config.GUILD_ID) {
  throw new Error("Missing Discord env vars. Copy .env.example into .env and fill values.");
}

const db = openDatabase(config.BOT_DB_PATH);
runMigrations(db);

const data = loadGameData(config.generatedDataPath);
const playerRepo = new PlayerRepository(db);
const dataRepo = new GameDataRepository(db);
const gameService = new GameService(data, playerRepo);

createBot({
  token: config.DISCORD_TOKEN,
  gameService,
  playerRepo,
  gameDataRepo: dataRepo,
});
