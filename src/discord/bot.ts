import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  Client,
  Events,
  GatewayIntentBits,
  type Interaction,
} from "discord.js";
import type { GameDataRepository, PlayerRepository } from "../db/repositories.js";
import type { PassiveCadence } from "../types.js";
import { GameService } from "../services/gameService.js";
import { buildActionId, parseActionId } from "./session.js";

function buildMenu(userId: string) {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(buildActionId(userId, "pull")).setLabel("Pull").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(buildActionId(userId, "reset_pulls")).setLabel("Reset Pulls").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(buildActionId(userId, "profile")).setLabel("Profile").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(buildActionId(userId, "collection")).setLabel("Collection").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(buildActionId(userId, "evolve")).setLabel("Evolve").setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(buildActionId(userId, "party_manage")).setLabel("Party Manage").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(buildActionId(userId, "team_manage")).setLabel("Team Manage").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(buildActionId(userId, "pve")).setLabel("PvE").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(buildActionId(userId, "shop")).setLabel("Shop").setStyle(ButtonStyle.Secondary),
  );

  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(buildActionId(userId, "quest_start_common")).setLabel("Quest C").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(buildActionId(userId, "quest_start_uncommon")).setLabel("Quest UC").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(buildActionId(userId, "quest_start_rare")).setLabel("Quest R").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(buildActionId(userId, "quest_start_epic")).setLabel("Quest E").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(buildActionId(userId, "quest_start_legendary")).setLabel("Quest L").setStyle(ButtonStyle.Secondary),
  );

  const row4 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(buildActionId(userId, "quest_collect")).setLabel("Quest Collect").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(buildActionId(userId, "daily_claim")).setLabel("Daily").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(buildActionId(userId, "weekly_claim")).setLabel("Weekly").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(buildActionId(userId, "monthly_claim")).setLabel("Monthly").setStyle(ButtonStyle.Primary),
  );

  return [row1, row2, row3, row4];
}

async function handleSlashInteraction(
  interaction: Interaction,
  gameService: GameService,
  gameDataRepo: GameDataRepository,
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "play") {
    gameService.getSnapshot(interaction.user.id);
    await interaction.reply({
      content:
        "Welcome to Danteria Beta. Party = passive questing, Team = active combat. Use Party/Team Manage after pulling cards.",
      components: buildMenu(interaction.user.id),
      ephemeral: true,
    });
    return;
  }
  if (interaction.commandName === "admin" && interaction.options.getSubcommand(false) === "seed-status") {
    const status = gameDataRepo.getSeedStatus();
    await interaction.reply({
      content: `Seed Status\ncards=${status.cards} pullOdds=${status.pullOdds} evolutionCosts=${status.evolutionCosts} shardRows=${status.shardRows} combatStats=${status.combatStats} pveWaves=${status.pveWaves} questDefinitions=${status.questDefinitions}`,
      ephemeral: true,
    });
  }
}

async function doClaim(
  interaction: ButtonInteraction,
  gameService: GameService,
  cadence: PassiveCadence,
): Promise<void> {
  const result = gameService.claimPassive(interaction.user.id, cadence);
  await interaction.reply({
    content: `${cadence.toUpperCase()} claim: +${result.awards.gold} gold, +${result.awards.crystals} crystals, +${result.awards.fame} fame, +${result.awards.premiumHours} premium hour(s). Next: ${result.nextEligibleAt}`,
    ephemeral: true,
  });
}

async function handleButtonInteraction(
  interaction: Interaction,
  gameService: GameService,
  playerRepo: PlayerRepository,
): Promise<void> {
  if (!interaction.isButton()) return;
  const parsed = parseActionId(interaction.customId);
  if (!parsed.valid) return;
  if (parsed.userId !== interaction.user.id) {
    await interaction.reply({ content: "This button session belongs to another player.", ephemeral: true });
    return;
  }

  playerRepo.ensurePlayer(interaction.user.id);
  try {
    switch (parsed.action) {
      case "pull": {
        const result = gameService.pull(interaction.user.id);
        const snapshot = playerRepo.getSnapshot(interaction.user.id);
        await interaction.reply({
          content: `Pull Result\nCard: ${result.cardId}\nRarity: ${result.rarity}\nFoil: ${result.foil ? "Yes" : "No"}\nShard Gain: ${result.shardGain}\nPity Reset: ${result.pityReset ? "Yes" : "No"}\nWindow: ${snapshot.pullWindow.freePullsUsed}/${snapshot.pullWindow.freePullsMax}`,
          ephemeral: true,
        });
        break;
      }
      case "reset_pulls": {
        const message = gameService.resetPullWindow(interaction.user.id);
        await interaction.reply({ content: message, ephemeral: true });
        break;
      }
      case "collection": {
        const summary = gameService.getCollection(interaction.user.id);
        await interaction.reply({ content: `Collection\n${summary}`, ephemeral: true });
        break;
      }
      case "evolve": {
        const owned = playerRepo.listOwnedCards(interaction.user.id);
        if (owned.length === 0) {
          await interaction.reply({ content: "No cards to evolve yet. Pull first.", ephemeral: true });
          return;
        }
        const chosen = owned[0];
        const result = gameService.evolve(interaction.user.id, chosen.cardId);
        await interaction.reply({
          content: `Evolved ${result.cardId} from stage ${result.fromStage} to ${result.toStage}.\nCosts: Gold ${result.costsPaid.gold}, Crystals ${result.costsPaid.crystals}, Fame ${result.costsPaid.fame}, Shards ${result.costsPaid.shards}`,
          ephemeral: true,
        });
        break;
      }
      case "party_manage": {
        const loadout = gameService.autoAssignParty(interaction.user.id);
        await interaction.reply({
          content: `Party updated: ${loadout.party.join(", ")}\nValid: ${loadout.validation.partyValid ? "yes" : loadout.validation.partyReason}`,
          ephemeral: true,
        });
        break;
      }
      case "team_manage": {
        const loadout = gameService.autoAssignTeam(interaction.user.id);
        await interaction.reply({
          content: `Team updated: ${loadout.team.join(", ")}\nValid: ${loadout.validation.teamValid ? "yes" : loadout.validation.teamReason}`,
          ephemeral: true,
        });
        break;
      }
      case "pve": {
        const snapshot = playerRepo.getSnapshot(interaction.user.id);
        const nextWave = Math.max(1, snapshot.progressionFlags.highestPveWave + 1);
        const result = gameService.runPve(interaction.user.id, nextWave);
        await interaction.reply({
          content: `PvE Wave ${result.wave}: ${result.outcome.toUpperCase()}\nRewards: Gold ${result.rewards.gold}, Crystals ${result.rewards.crystals}, Fame ${result.rewards.fame}, XP ${result.rewards.xp}`,
          ephemeral: true,
        });
        break;
      }
      case "shop": {
        await interaction.reply({
          content: "Shop is still soft-currency only. Premium-hour items currently come from daily/weekly/monthly claims.",
          ephemeral: true,
        });
        break;
      }
      case "quest_start_common":
      case "quest_start_uncommon":
      case "quest_start_rare":
      case "quest_start_epic":
      case "quest_start_legendary": {
        const rarity = parsed.action.replace("quest_start_", "");
        const title = rarity === "uncommon" ? "Uncommon" : rarity === "common" ? "Common" : rarity === "rare" ? "Rare" : rarity === "epic" ? "Epic" : "Legendary";
        const active = gameService.startQuest(interaction.user.id, title);
        await interaction.reply({
          content: `Quest started: ${active.rarity}. Ends at ${active.endsAt}.`,
          ephemeral: true,
        });
        break;
      }
      case "quest_collect": {
        const message = gameService.collectQuest(interaction.user.id);
        await interaction.reply({ content: message, ephemeral: true });
        break;
      }
      case "daily_claim": {
        await doClaim(interaction, gameService, "daily");
        break;
      }
      case "weekly_claim": {
        await doClaim(interaction, gameService, "weekly");
        break;
      }
      case "monthly_claim": {
        await doClaim(interaction, gameService, "monthly");
        break;
      }
      case "profile": {
        const summary = gameService.getSnapshot(interaction.user.id);
        await interaction.reply({ content: `Profile\n${summary}`, ephemeral: true });
        break;
      }
    }
  } catch (error) {
    await interaction.reply({ content: `Action failed: ${(error as Error).message}`, ephemeral: true });
  }
}

export function createBot(params: {
  token: string;
  gameService: GameService;
  playerRepo: PlayerRepository;
  gameDataRepo: GameDataRepository;
}): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    await handleSlashInteraction(interaction, params.gameService, params.gameDataRepo);
    await handleButtonInteraction(interaction, params.gameService, params.playerRepo);
  });

  client.login(params.token).catch((err: unknown) => {
    console.error("Discord login failed.", err);
  });
  return client;
}
