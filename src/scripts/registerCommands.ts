import { REST, Routes } from "discord.js";
import { config } from "../config.js";
import { slashCommands } from "../discord/commands.js";

if (!config.DISCORD_TOKEN || !config.CLIENT_ID || !config.GUILD_ID) {
  throw new Error("DISCORD_TOKEN, CLIENT_ID, and GUILD_ID are required.");
}

const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), {
  body: slashCommands.map((c) => c.toJSON()),
});

console.log("Guild commands registered.");
