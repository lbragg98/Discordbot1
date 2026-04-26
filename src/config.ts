import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  DISCORD_TOKEN: z.string().optional().default(""),
  CLIENT_ID: z.string().optional().default(""),
  GUILD_ID: z.string().optional().default(""),
  BOT_DB_PATH: z.string().default("./data/runtime/gacha.sqlite"),
  SPREADSHEET_PATH: z
    .string()
    .default("C:/Users/lbrag/Downloads/Copy of Danteria Bot.xlsx"),
});

const parsed = configSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
  );
}

export const config = {
  ...parsed.data,
  BOT_DB_PATH: path.resolve(parsed.data.BOT_DB_PATH),
  generatedDataPath: path.resolve("data/generated/game-data.json"),
};
