import type Database from "better-sqlite3";
import type {
  PassiveCadence,
  PlayerSnapshot,
  PullWindowState,
  QuestRunState,
  Tier,
} from "../types.js";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function alignWindow(now: Date): { start: string; end: string } {
  const ts = now.getTime();
  const startMs = Math.floor(ts / SIX_HOURS_MS) * SIX_HOURS_MS;
  const endMs = startMs + SIX_HOURS_MS;
  return { start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() };
}

function cadenceDurationMs(cadence: PassiveCadence): number {
  if (cadence === "daily") return 24 * 60 * 60 * 1000;
  if (cadence === "weekly") return 7 * 24 * 60 * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
}

export class PlayerRepository {
  constructor(private readonly db: Database.Database) {}

  ensurePlayer(playerId: string): void {
    const tx = this.db.transaction(() => {
      this.db.prepare("INSERT OR IGNORE INTO players (id, tier) VALUES (@id, 'F2P')").run({ id: playerId });
      this.db.prepare("INSERT OR IGNORE INTO wallets (player_id) VALUES (?)").run(playerId);
      this.db.prepare("INSERT OR IGNORE INTO pull_counters (player_id) VALUES (?)").run(playerId);
      this.db
        .prepare("INSERT OR IGNORE INTO player_items (player_id, item_key, amount) VALUES (?, 'premium_hour', 0)")
        .run(playerId);
      this.ensurePullWindow(playerId, new Date());
    });
    tx();
  }

  getTier(playerId: string): Tier {
    this.ensurePlayer(playerId);
    const row = this.db.prepare("SELECT tier FROM players WHERE id = ?").get(playerId) as { tier: Tier };
    return row.tier;
  }

  getPity(playerId: string): { pityCounter: number; pityMax: number } {
    this.ensurePlayer(playerId);
    const row = this.db
      .prepare("SELECT pity_counter as pityCounter, pity_max as pityMax FROM pull_counters WHERE player_id = ?")
      .get(playerId) as { pityCounter: number; pityMax: number };
    return row;
  }

  incrementPity(playerId: string, reset = false): void {
    this.ensurePlayer(playerId);
    if (reset) {
      this.db
        .prepare("UPDATE pull_counters SET pity_counter = 0, total_pulls = total_pulls + 1 WHERE player_id = ?")
        .run(playerId);
      return;
    }
    this.db
      .prepare(
        "UPDATE pull_counters SET pity_counter = pity_counter + 1, total_pulls = total_pulls + 1 WHERE player_id = ?",
      )
      .run(playerId);
  }

  private ensurePullWindow(playerId: string, now: Date): void {
    const aligned = alignWindow(now);
    const current = this.db
      .prepare(
        "SELECT window_start as windowStart, window_end as windowEnd, free_pulls_used as freePullsUsed, free_pulls_max as freePullsMax FROM player_pull_windows WHERE player_id = ?",
      )
      .get(playerId) as PullWindowState | undefined;

    if (!current) {
      this.db
        .prepare(
          "INSERT INTO player_pull_windows (player_id, window_start, window_end, free_pulls_used, free_pulls_max) VALUES (?, ?, ?, 0, 5)",
        )
        .run(playerId, aligned.start, aligned.end);
      return;
    }

    if (new Date(current.windowEnd).getTime() <= now.getTime()) {
      this.db
        .prepare(
          "UPDATE player_pull_windows SET window_start = ?, window_end = ?, free_pulls_used = 0, free_pulls_max = 5 WHERE player_id = ?",
        )
        .run(aligned.start, aligned.end, playerId);
    }
  }

  getPullWindowState(playerId: string, now = new Date()): PullWindowState {
    this.ensurePlayer(playerId);
    this.ensurePullWindow(playerId, now);
    const row = this.db
      .prepare(
        "SELECT window_start as windowStart, window_end as windowEnd, free_pulls_used as freePullsUsed, free_pulls_max as freePullsMax FROM player_pull_windows WHERE player_id = ?",
      )
      .get(playerId) as Omit<PullWindowState, "canReset">;

    return {
      ...row,
      canReset: this.getItemAmount(playerId, "premium_hour") > 0,
    };
  }

  consumeFreePull(playerId: string, now = new Date()): void {
    this.ensurePlayer(playerId);
    this.ensurePullWindow(playerId, now);
    const state = this.db
      .prepare("SELECT free_pulls_used as used, free_pulls_max as max FROM player_pull_windows WHERE player_id = ?")
      .get(playerId) as { used: number; max: number };

    if (state.used >= state.max) {
      throw new Error("No free pulls left in this 6-hour window. Use Reset Pull Window.");
    }

    this.db.prepare("UPDATE player_pull_windows SET free_pulls_used = free_pulls_used + 1 WHERE player_id = ?").run(playerId);
  }

  resetPullWindowWithPremiumHour(playerId: string, now = new Date()): PullWindowState {
    this.ensurePlayer(playerId);
    const tx = this.db.transaction(() => {
      const currentPremium = this.getItemAmount(playerId, "premium_hour");
      if (currentPremium < 1) {
        throw new Error("You need at least 1 premium hour to reset pulls.");
      }
      const aligned = alignWindow(now);
      this.db
        .prepare("UPDATE player_items SET amount = amount - 1 WHERE player_id = ? AND item_key = 'premium_hour'")
        .run(playerId);
      this.db
        .prepare(
          "INSERT INTO player_pull_windows (player_id, window_start, window_end, free_pulls_used, free_pulls_max) VALUES (?, ?, ?, 0, 5) ON CONFLICT(player_id) DO UPDATE SET window_start = excluded.window_start, window_end = excluded.window_end, free_pulls_used = 0, free_pulls_max = 5",
        )
        .run(playerId, aligned.start, aligned.end);
    });
    tx();

    return this.getPullWindowState(playerId, now);
  }

  getItemAmount(playerId: string, itemKey: string): number {
    this.ensurePlayer(playerId);
    const row = this.db
      .prepare("SELECT amount FROM player_items WHERE player_id = ? AND item_key = ?")
      .get(playerId, itemKey) as { amount: number } | undefined;
    return row?.amount ?? 0;
  }

  addItem(playerId: string, itemKey: string, amount: number): void {
    this.ensurePlayer(playerId);
    this.db
      .prepare(
        "INSERT INTO player_items (player_id, item_key, amount) VALUES (?, ?, ?) ON CONFLICT(player_id, item_key) DO UPDATE SET amount = amount + excluded.amount",
      )
      .run(playerId, itemKey, amount);
  }

  addCardCopy(playerId: string, cardId: string, foil: boolean): boolean {
    this.ensurePlayer(playerId);
    const existing = this.db
      .prepare("SELECT copies FROM card_instances WHERE player_id = ? AND card_id = ?")
      .get(playerId, cardId) as { copies: number } | undefined;

    if (existing) {
      this.db
        .prepare(
          "UPDATE card_instances SET copies = copies + 1, foil_copies = foil_copies + @foilInc WHERE player_id = @playerId AND card_id = @cardId",
        )
        .run({ playerId, cardId, foilInc: foil ? 1 : 0 });
      this.db
        .prepare(
          "INSERT INTO shards (player_id, card_id, amount) VALUES (?, ?, 1) ON CONFLICT(player_id, card_id) DO UPDATE SET amount = amount + 1",
        )
        .run(playerId, cardId);
      return true;
    }

    this.db
      .prepare(
        "INSERT INTO card_instances (player_id, card_id, copies, foil_copies) VALUES (@playerId, @cardId, 1, @foilInc)",
      )
      .run({ playerId, cardId, foilInc: foil ? 1 : 0 });
    this.db
      .prepare("INSERT OR IGNORE INTO shards (player_id, card_id, amount) VALUES (?, ?, 0)")
      .run(playerId, cardId);
    return false;
  }

  getCardState(playerId: string, cardId: string): { stage: number; level: number; xp: number; shards: number } {
    this.ensurePlayer(playerId);
    const instance = this.db
      .prepare(
        "SELECT evolution_stage as stage, level, xp FROM card_instances WHERE player_id = ? AND card_id = ?",
      )
      .get(playerId, cardId) as { stage: number; level: number; xp: number } | undefined;

    if (!instance) {
      throw new Error("You do not own that card yet.");
    }
    const shardRow = this.db
      .prepare("SELECT amount FROM shards WHERE player_id = ? AND card_id = ?")
      .get(playerId, cardId) as { amount: number } | undefined;

    return { ...instance, shards: shardRow?.amount ?? 0 };
  }

  spendEvolutionResources(
    playerId: string,
    cardId: string,
    shardCost: number,
    costs: { gold: number; crystals: number; fame: number },
  ): void {
    this.ensurePlayer(playerId);
    const tx = this.db.transaction(() => {
      const wallet = this.db
        .prepare("SELECT gold, crystals, fame FROM wallets WHERE player_id = ?")
        .get(playerId) as { gold: number; crystals: number; fame: number };
      const shards = this.db
        .prepare("SELECT amount FROM shards WHERE player_id = ? AND card_id = ?")
        .get(playerId, cardId) as { amount: number } | undefined;
      if (wallet.gold < costs.gold || wallet.crystals < costs.crystals || wallet.fame < costs.fame) {
        throw new Error("Insufficient currency for evolution.");
      }
      if ((shards?.amount ?? 0) < shardCost) {
        throw new Error("Insufficient shards for evolution.");
      }

      this.db
        .prepare("UPDATE wallets SET gold = gold - ?, crystals = crystals - ?, fame = fame - ? WHERE player_id = ?")
        .run(costs.gold, costs.crystals, costs.fame, playerId);
      this.db
        .prepare("UPDATE shards SET amount = amount - ? WHERE player_id = ? AND card_id = ?")
        .run(shardCost, playerId, cardId);
      this.db
        .prepare(
          "UPDATE card_instances SET evolution_stage = evolution_stage + 1, level = 1, xp = 0 WHERE player_id = ? AND card_id = ?",
        )
        .run(playerId, cardId);
    });
    tx();
  }

  listOwnedCards(playerId: string): Array<{ cardId: string; stage: number; level: number; copies: number; foilCopies: number }> {
    this.ensurePlayer(playerId);
    return this.db
      .prepare(
        `SELECT card_id as cardId, evolution_stage as stage, level, copies, foil_copies as foilCopies
         FROM card_instances WHERE player_id = ? ORDER BY card_id`,
      )
      .all(playerId) as Array<{ cardId: string; stage: number; level: number; copies: number; foilCopies: number }>;
  }

  setPartySlots(playerId: string, cardIds: string[]): void {
    this.ensurePlayer(playerId);
    const tx = this.db.transaction(() => {
      this.db.prepare("DELETE FROM party_slots WHERE player_id = ?").run(playerId);
      const ins = this.db.prepare("INSERT INTO party_slots (player_id, slot_index, card_id) VALUES (?, ?, ?)");
      cardIds.forEach((cardId, i) => ins.run(playerId, i + 1, cardId));
    });
    tx();
  }

  setTeamSlots(playerId: string, cardIds: string[]): void {
    this.ensurePlayer(playerId);
    const tx = this.db.transaction(() => {
      this.db.prepare("DELETE FROM team_slots WHERE player_id = ?").run(playerId);
      const ins = this.db.prepare("INSERT INTO team_slots (player_id, slot_index, card_id) VALUES (?, ?, ?)");
      cardIds.forEach((cardId, i) => ins.run(playerId, i + 1, cardId));
    });
    tx();
  }

  getPartySlots(playerId: string): string[] {
    this.ensurePlayer(playerId);
    return (
      this.db
        .prepare("SELECT card_id as cardId FROM party_slots WHERE player_id = ? ORDER BY slot_index")
        .all(playerId) as Array<{ cardId: string }>
    ).map((x) => x.cardId);
  }

  getTeamSlots(playerId: string): string[] {
    this.ensurePlayer(playerId);
    return (
      this.db
        .prepare("SELECT card_id as cardId FROM team_slots WHERE player_id = ? ORDER BY slot_index")
        .all(playerId) as Array<{ cardId: string }>
    ).map((x) => x.cardId);
  }

  getClaimCooldown(playerId: string, cadence: PassiveCadence): string | null {
    this.ensurePlayer(playerId);
    const row = this.db
      .prepare("SELECT next_eligible_at as nextEligibleAt FROM player_claim_cooldowns WHERE player_id = ? AND cadence = ?")
      .get(playerId, cadence) as { nextEligibleAt: string } | undefined;
    return row?.nextEligibleAt ?? null;
  }

  claimPassive(playerId: string, cadence: PassiveCadence, now = new Date()): { nextEligibleAt: string } {
    this.ensurePlayer(playerId);
    const existing = this.getClaimCooldown(playerId, cadence);
    if (existing && new Date(existing).getTime() > now.getTime()) {
      throw new Error(`Claim not ready. Next eligible at ${existing}`);
    }

    const nextEligibleAt = new Date(now.getTime() + cadenceDurationMs(cadence)).toISOString();
    this.db
      .prepare(
        `INSERT INTO player_claim_cooldowns (player_id, cadence, next_eligible_at, last_claimed_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(player_id, cadence)
         DO UPDATE SET next_eligible_at = excluded.next_eligible_at, last_claimed_at = excluded.last_claimed_at`,
      )
      .run(playerId, cadence, nextEligibleAt, now.toISOString());

    return { nextEligibleAt };
  }

  grantClaimRewards(
    playerId: string,
    rewards: { gold: number; crystals: number; fame: number; premiumHours: number },
  ): void {
    this.ensurePlayer(playerId);
    const tx = this.db.transaction(() => {
      this.db
        .prepare("UPDATE wallets SET gold = gold + ?, crystals = crystals + ?, fame = fame + ? WHERE player_id = ?")
        .run(rewards.gold, rewards.crystals, rewards.fame, playerId);
      if (rewards.premiumHours > 0) {
        this.addItem(playerId, "premium_hour", rewards.premiumHours);
      }
    });
    tx();
  }

  getActiveQuest(playerId: string): QuestRunState | null {
    this.ensurePlayer(playerId);
    const row = this.db
      .prepare(
        "SELECT rarity, started_at as startedAt, ends_at as endsAt, status FROM player_active_quests WHERE player_id = ?",
      )
      .get(playerId) as QuestRunState | undefined;
    return row ?? null;
  }

  startQuest(playerId: string, rarity: string, now: Date, endsAt: Date): void {
    this.ensurePlayer(playerId);
    const active = this.getActiveQuest(playerId);
    if (active && active.status === "running" && new Date(active.endsAt).getTime() > now.getTime()) {
      throw new Error("You already have an active quest.");
    }

    this.db
      .prepare(
        `INSERT INTO player_active_quests (player_id, rarity, started_at, ends_at, status)
         VALUES (?, ?, ?, ?, 'running')
         ON CONFLICT(player_id) DO UPDATE SET rarity = excluded.rarity, started_at = excluded.started_at, ends_at = excluded.ends_at, status = 'running'`,
      )
      .run(playerId, rarity, now.toISOString(), endsAt.toISOString());
  }

  collectQuest(playerId: string, now: Date, rewards: { gold: number; crystals: number; fame: number }): void {
    this.ensurePlayer(playerId);
    const active = this.getActiveQuest(playerId);
    if (!active || active.status !== "running") {
      throw new Error("No active quest to collect.");
    }
    if (new Date(active.endsAt).getTime() > now.getTime()) {
      throw new Error(`Quest still running until ${active.endsAt}`);
    }

    const tx = this.db.transaction(() => {
      this.db.prepare("DELETE FROM player_active_quests WHERE player_id = ?").run(playerId);
      this.db
        .prepare("UPDATE wallets SET gold = gold + ?, crystals = crystals + ?, fame = fame + ? WHERE player_id = ?")
        .run(rewards.gold, rewards.crystals, rewards.fame, playerId);
      this.db
        .prepare(
          "INSERT INTO quests_or_pve_runs (player_id, mode, wave, outcome, reward_gold, reward_crystals, reward_fame, reward_xp) VALUES (?, 'QUEST', 0, 'win', ?, ?, ?, 0)",
        )
        .run(playerId, rewards.gold, rewards.crystals, rewards.fame);
    });
    tx();
  }

  addBattleRewards(
    playerId: string,
    wave: number,
    outcome: "win" | "loss",
    rewards: { gold: number; crystals: number; fame: number; xp: number },
  ): void {
    this.ensurePlayer(playerId);
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          "INSERT INTO quests_or_pve_runs (player_id, mode, wave, outcome, reward_gold, reward_crystals, reward_fame, reward_xp) VALUES (?, 'PVE', ?, ?, ?, ?, ?, ?)",
        )
        .run(playerId, wave, outcome, rewards.gold, rewards.crystals, rewards.fame, rewards.xp);
      if (outcome === "win") {
        this.db
          .prepare("UPDATE wallets SET gold = gold + ?, crystals = crystals + ?, fame = fame + ? WHERE player_id = ?")
          .run(rewards.gold, rewards.crystals, rewards.fame, playerId);
      }
    });
    tx();
  }

  getSnapshot(playerId: string): PlayerSnapshot {
    this.ensurePlayer(playerId);
    const wallet = this.db
      .prepare("SELECT gold, crystals, fame FROM wallets WHERE player_id = ?")
      .get(playerId) as { gold: number; crystals: number; fame: number };
    const pity = this.getPity(playerId);
    const inventory = this.db
      .prepare(
        `SELECT COUNT(*) as uniqueCards, COALESCE(SUM(copies), 0) as totalCards
         FROM card_instances WHERE player_id = ?`,
      )
      .get(playerId) as { uniqueCards: number; totalCards: number };
    const shards = this.db
      .prepare("SELECT COALESCE(SUM(amount), 0) as totalShards FROM shards WHERE player_id = ?")
      .get(playerId) as { totalShards: number };
    const progression = this.db
      .prepare(
        `SELECT
            MAX(CASE WHEN mode = 'PVE' AND outcome = 'win' THEN wave ELSE 0 END) as highestPveWave,
            (SELECT total_pulls FROM pull_counters WHERE player_id = ?) as totalPulls
         FROM quests_or_pve_runs WHERE player_id = ?`,
      )
      .get(playerId, playerId) as { highestPveWave: number; totalPulls: number | null };

    const pullWindow = this.getPullWindowState(playerId, new Date());
    const premiumHours = this.getItemAmount(playerId, "premium_hour");
    const activeQuest = this.getActiveQuest(playerId);
    const partyCount = this.getPartySlots(playerId).length;
    const teamCount = this.getTeamSlots(playerId).length;

    return {
      playerId,
      currencies: wallet,
      pullCounters: pity,
      inventorySummary: {
        uniqueCards: inventory.uniqueCards,
        totalCards: inventory.totalCards,
        totalShards: shards.totalShards,
      },
      progressionFlags: {
        hasCompletedFirstPull: (progression.totalPulls ?? 0) > 0,
        highestPveWave: progression.highestPveWave ?? 0,
      },
      pullWindow,
      premiumHours,
      activeQuest,
      loadout: {
        partyCount,
        teamCount,
      },
    };
  }
}

export class GameDataRepository {
  constructor(private readonly db: Database.Database) {}

  replaceSeedData(input: {
    cards: Array<{
      id: string;
      baseName: string;
      faction: string;
      archetype: string;
      subtype: string;
      rarityPath: string[];
    }>;
    pullOdds: Array<{
      tier: Tier;
      rarity: string;
      chance: number;
      foilOneIn: number;
    }>;
    evolutionCosts: Array<{ rarity: string; gold: number; crystals: number; fame: number }>;
    shardRequirements: Array<{ stage: number; shardsRequired: number }>;
    combatStats: Array<{
      rarity: string;
      strengthMin: number;
      attackPerLevel: number;
      defensePerLevel: number;
      speedPerLevel: number;
      healthPerLevel: number;
      xpPerLevel: number;
    }>;
    pveWaves: Array<{
      wave: number;
      enemyPower: number;
      rewardGold: number;
      rewardCrystals: number;
      rewardFame: number;
      rewardXp: number;
    }>;
    questDefinitions: Array<{
      rarity: string;
      durationMinutes: number;
      rewardGold: number;
      rewardCrystals: number;
      rewardFame: number;
    }>;
  }): void {
    const tx = this.db.transaction(() => {
      this.db.exec(`
        DELETE FROM game_cards;
        DELETE FROM game_pull_odds;
        DELETE FROM game_evolution_costs;
        DELETE FROM game_evolution_shards;
        DELETE FROM game_combat_stats;
        DELETE FROM game_pve_waves;
        DELETE FROM game_quest_definitions;
      `);

      const insertCard = this.db.prepare(
        `INSERT INTO game_cards (id, base_name, faction, archetype, subtype, rarity_path_json)
         VALUES (@id, @baseName, @faction, @archetype, @subtype, @rarityPathJson)`,
      );
      for (const card of input.cards) {
        insertCard.run({ ...card, rarityPathJson: JSON.stringify(card.rarityPath) });
      }

      const insertOdds = this.db.prepare(
        "INSERT INTO game_pull_odds (tier, rarity, chance, foil_one_in) VALUES (@tier, @rarity, @chance, @foilOneIn)",
      );
      input.pullOdds.forEach((row) => insertOdds.run(row));

      const insertCosts = this.db.prepare(
        "INSERT INTO game_evolution_costs (rarity, gold, crystals, fame) VALUES (@rarity, @gold, @crystals, @fame)",
      );
      input.evolutionCosts.forEach((row) => insertCosts.run(row));

      const insertShards = this.db.prepare(
        "INSERT INTO game_evolution_shards (stage, shards_required) VALUES (@stage, @shardsRequired)",
      );
      input.shardRequirements.forEach((row) => insertShards.run(row));

      const insertCombat = this.db.prepare(
        `INSERT INTO game_combat_stats
         (rarity, strength_min, attack_per_level, defense_per_level, speed_per_level, health_per_level, xp_per_level)
         VALUES (@rarity, @strengthMin, @attackPerLevel, @defensePerLevel, @speedPerLevel, @healthPerLevel, @xpPerLevel)`,
      );
      input.combatStats.forEach((row) => insertCombat.run(row));

      const insertWave = this.db.prepare(
        `INSERT INTO game_pve_waves
         (wave, enemy_power, reward_gold, reward_crystals, reward_fame, reward_xp)
         VALUES (@wave, @enemyPower, @rewardGold, @rewardCrystals, @rewardFame, @rewardXp)`,
      );
      input.pveWaves.forEach((row) => insertWave.run(row));

      const insertQuest = this.db.prepare(
        `INSERT INTO game_quest_definitions
         (rarity, duration_minutes, reward_gold, reward_crystals, reward_fame)
         VALUES (@rarity, @durationMinutes, @rewardGold, @rewardCrystals, @rewardFame)`,
      );
      input.questDefinitions.forEach((row) => insertQuest.run(row));
    });
    tx();
  }

  getSeedStatus(): {
    cards: number;
    pullOdds: number;
    evolutionCosts: number;
    shardRows: number;
    combatStats: number;
    pveWaves: number;
    questDefinitions: number;
  } {
    const count = (table: string) =>
      (this.db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c;
    return {
      cards: count("game_cards"),
      pullOdds: count("game_pull_odds"),
      evolutionCosts: count("game_evolution_costs"),
      shardRows: count("game_evolution_shards"),
      combatStats: count("game_combat_stats"),
      pveWaves: count("game_pve_waves"),
      questDefinitions: count("game_quest_definitions"),
    };
  }
}
