import Database from "better-sqlite3";
import { runMigrations } from "../db/database.js";
import { PlayerRepository } from "../db/repositories.js";

export function createTestPlayerRepo(): { db: Database.Database; repo: PlayerRepository } {
  const db = new Database(":memory:");
  runMigrations(db);
  return { db, repo: new PlayerRepository(db) };
}
