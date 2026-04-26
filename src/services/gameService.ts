import type { GameData } from "../data/schema.js";
import { PlayerRepository } from "../db/repositories.js";
import { EvolutionEngine } from "../domain/evolutionEngine.js";
import { PullEngine } from "../domain/pullEngine.js";
import { PveEngine } from "../domain/pveEngine.js";
import { MathRandomSource } from "../domain/random.js";
import type {
  EvolutionResult,
  PassiveCadence,
  PassiveClaimResult,
  PlayerLoadout,
  PullResult,
  PveBattleResult,
  QuestRunState,
} from "../types.js";
import { LoadoutService } from "./loadoutService.js";

const CLAIM_REWARDS: Record<
  PassiveCadence,
  { gold: number; crystals: number; fame: number; premiumHours: number }
> = {
  daily: { gold: 3000, crystals: 100, fame: 25, premiumHours: 1 },
  weekly: { gold: 25000, crystals: 1000, fame: 500, premiumHours: 2 },
  monthly: { gold: 100000, crystals: 5000, fame: 3000, premiumHours: 4 },
};

export class GameService {
  readonly random = new MathRandomSource();
  readonly pullEngine: PullEngine;
  readonly evolutionEngine: EvolutionEngine;
  readonly pveEngine: PveEngine;
  readonly loadoutService: LoadoutService;

  constructor(
    private readonly gameData: GameData,
    private readonly players: PlayerRepository,
  ) {
    this.pullEngine = new PullEngine(this.gameData, this.players, this.random);
    this.evolutionEngine = new EvolutionEngine(this.gameData, this.players);
    this.pveEngine = new PveEngine(this.gameData, this.players, this.random);
    this.loadoutService = new LoadoutService(this.gameData);
  }

  pull(playerId: string): PullResult {
    this.players.consumeFreePull(playerId, new Date());
    return this.pullEngine.pull(playerId);
  }

  resetPullWindow(playerId: string): string {
    const state = this.players.resetPullWindowWithPremiumHour(playerId, new Date());
    return `Pull window reset. ${state.freePullsUsed}/${state.freePullsMax} pulls used. Next rollover: ${state.windowEnd}`;
  }

  evolve(playerId: string, cardId: string): EvolutionResult {
    return this.evolutionEngine.evolve({ playerId, cardId });
  }

  runPve(playerId: string, wave: number): PveBattleResult {
    const team = this.players.getTeamSlots(playerId);
    const teamValidation = this.loadoutService.validateTeam(team);
    if (!teamValidation.valid) {
      throw new Error(teamValidation.reason ?? "Invalid team loadout.");
    }
    return this.pveEngine.runWave(playerId, wave, team);
  }

  autoAssignTeam(playerId: string): PlayerLoadout {
    const owned = this.players.listOwnedCards(playerId).map((c) => c.cardId);
    const team = this.loadoutService.buildAutoTeam(owned);
    const validation = this.loadoutService.validateTeam(team);
    if (!validation.valid) throw new Error(validation.reason ?? "Unable to auto-build team.");
    this.players.setTeamSlots(playerId, team);
    return this.getLoadout(playerId);
  }

  autoAssignParty(playerId: string): PlayerLoadout {
    const owned = this.players.listOwnedCards(playerId).map((c) => c.cardId);
    const party = this.loadoutService.buildAutoParty(owned);
    const validation = this.loadoutService.validateParty(party);
    if (!validation.valid) throw new Error(validation.reason ?? "Unable to auto-build party.");
    this.players.setPartySlots(playerId, party);
    return this.getLoadout(playerId);
  }

  getLoadout(playerId: string): PlayerLoadout {
    const party = this.players.getPartySlots(playerId);
    const team = this.players.getTeamSlots(playerId);
    const partyValidation = this.loadoutService.validateParty(party);
    const teamValidation = this.loadoutService.validateTeam(team);
    return {
      party,
      team,
      validation: {
        partyValid: partyValidation.valid,
        partyReason: partyValidation.reason,
        teamValid: teamValidation.valid,
        teamReason: teamValidation.reason,
      },
    };
  }

  startQuest(playerId: string, rarity: string): QuestRunState {
    const loadout = this.getLoadout(playerId);
    if (!loadout.validation.partyValid) {
      throw new Error(loadout.validation.partyReason ?? "Invalid party loadout.");
    }

    const def = this.gameData.questDefinitions.find(
      (q) => q.rarity.toLowerCase() === rarity.toLowerCase(),
    );
    if (!def) throw new Error(`Unknown quest rarity: ${rarity}`);

    const now = new Date();
    const endsAt = new Date(now.getTime() + def.durationMinutes * 60_000);
    this.players.startQuest(playerId, def.rarity, now, endsAt);
    return this.players.getActiveQuest(playerId)!;
  }

  collectQuest(playerId: string): string {
    const active = this.players.getActiveQuest(playerId);
    if (!active) {
      throw new Error("No active quest to collect.");
    }
    const def = this.gameData.questDefinitions.find((q) => q.rarity === active.rarity);
    if (!def) throw new Error("Quest definition missing.");

    this.players.collectQuest(playerId, new Date(), {
      gold: def.rewardGold,
      crystals: def.rewardCrystals,
      fame: def.rewardFame,
    });
    return `Quest collected (${def.rarity}): +${def.rewardGold} gold, +${def.rewardCrystals} crystals, +${def.rewardFame} fame.`;
  }

  claimPassive(playerId: string, cadence: PassiveCadence): PassiveClaimResult {
    const claim = this.players.claimPassive(playerId, cadence, new Date());
    const rewards = CLAIM_REWARDS[cadence];
    this.players.grantClaimRewards(playerId, rewards);
    return {
      cadence,
      awards: rewards,
      nextEligibleAt: claim.nextEligibleAt,
    };
  }

  getCollection(playerId: string): string {
    const cards = this.players.listOwnedCards(playerId);
    if (cards.length === 0) {
      return "No cards yet. Use Pull to start your collection.";
    }
    return cards
      .slice(0, 20)
      .map((c) => `${c.cardId} | evo:${c.stage} lvl:${c.level} copies:${c.copies} foil:${c.foilCopies}`)
      .join("\n");
  }

  getSnapshot(playerId: string): string {
    const s = this.players.getSnapshot(playerId);
    const loadout = this.getLoadout(playerId);
    return [
      `Gold: ${s.currencies.gold} | Crystals: ${s.currencies.crystals} | Fame: ${s.currencies.fame}`,
      `Pity: ${s.pullCounters.pityCounter}/${s.pullCounters.pityMax}`,
      `Pull Window: ${s.pullWindow.freePullsUsed}/${s.pullWindow.freePullsMax} until ${s.pullWindow.windowEnd}`,
      `Premium Hours: ${s.premiumHours}`,
      `Cards: ${s.inventorySummary.uniqueCards} unique / ${s.inventorySummary.totalCards} total`,
      `Shards: ${s.inventorySummary.totalShards} | Best PvE Wave: ${s.progressionFlags.highestPveWave}`,
      `Party: ${loadout.party.length} (${loadout.validation.partyValid ? "valid" : `invalid: ${loadout.validation.partyReason}`})`,
      `Team: ${loadout.team.length} (${loadout.validation.teamValid ? "valid" : `invalid: ${loadout.validation.teamReason}`})`,
      `Quest: ${s.activeQuest ? `${s.activeQuest.rarity} until ${s.activeQuest.endsAt}` : "none"}`,
    ].join("\n");
  }
}
