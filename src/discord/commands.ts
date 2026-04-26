import { SlashCommandBuilder } from "discord.js";

export const playCommand = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Open the gacha game menu.");

export const adminSeedStatusCommand = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Admin utilities.")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("seed-status")
      .setDescription("Check seed and migration status."),
  );

export const slashCommands = [playCommand, adminSeedStatusCommand];
