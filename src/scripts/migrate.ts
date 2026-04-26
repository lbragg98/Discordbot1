import { config } from "../config.js";
import { openDatabase, runMigrations } from "../db/database.js";

const db = openDatabase(config.BOT_DB_PATH);
runMigrations(db);
db.close();
console.log(`Migrations complete for ${config.BOT_DB_PATH}`);
