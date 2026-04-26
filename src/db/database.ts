import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export function openDatabase(dbPath: string): Database.Database {
  const resolved = path.resolve(dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const db = new Database(resolved);
  db.pragma("journal_mode = WAL");
  return db;
}

export function runMigrations(
  db: Database.Database,
  migrationsDir = path.resolve("src/db/migrations"),
): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const existing = new Set<string>(
    db
      .prepare("SELECT id FROM schema_migrations")
      .all()
      .map((row: unknown) => String((row as { id: string }).id)),
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (existing.has(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const tx = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(file);
    });
    tx();
  }
}
