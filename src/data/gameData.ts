import fs from "node:fs";
import path from "node:path";
import type { GameData } from "./schema.js";
import { gameDataSchema } from "./schema.js";

export function loadGameData(filePath: string): GameData {
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(
      `Game data not found at ${absolute}. Run "npm run extract:data" first.`,
    );
  }
  const raw = fs.readFileSync(absolute, "utf8");
  const parsedJson = JSON.parse(raw);
  return gameDataSchema.parse(parsedJson);
}
