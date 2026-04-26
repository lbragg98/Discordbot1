CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'F2P',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wallets (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  gold INTEGER NOT NULL DEFAULT 1000,
  crystals INTEGER NOT NULL DEFAULT 0,
  fame INTEGER NOT NULL DEFAULT 0,
  requests INTEGER NOT NULL DEFAULT 5,
  warrants INTEGER NOT NULL DEFAULT 0,
  grimoires INTEGER NOT NULL DEFAULT 0,
  arcane_focus INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pull_counters (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  pity_counter INTEGER NOT NULL DEFAULT 0,
  pity_max INTEGER NOT NULL DEFAULT 50,
  total_pulls INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS card_instances (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  evolution_stage INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  copies INTEGER NOT NULL DEFAULT 1,
  foil_copies INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, card_id)
);

CREATE TABLE IF NOT EXISTS shards (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, card_id)
);

CREATE TABLE IF NOT EXISTS quests_or_pve_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  wave INTEGER NOT NULL,
  outcome TEXT NOT NULL,
  reward_gold INTEGER NOT NULL DEFAULT 0,
  reward_crystals INTEGER NOT NULL DEFAULT 0,
  reward_fame INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shop_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  currency_key TEXT NOT NULL,
  currency_amount INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS game_cards (
  id TEXT PRIMARY KEY,
  base_name TEXT NOT NULL,
  faction TEXT NOT NULL,
  archetype TEXT NOT NULL,
  subtype TEXT NOT NULL,
  rarity_path_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_pull_odds (
  tier TEXT NOT NULL,
  rarity TEXT NOT NULL,
  chance REAL NOT NULL,
  foil_one_in INTEGER NOT NULL,
  PRIMARY KEY (tier, rarity)
);

CREATE TABLE IF NOT EXISTS game_evolution_costs (
  rarity TEXT PRIMARY KEY,
  gold INTEGER NOT NULL DEFAULT 0,
  crystals INTEGER NOT NULL DEFAULT 0,
  fame INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS game_evolution_shards (
  stage INTEGER PRIMARY KEY,
  shards_required INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS game_combat_stats (
  rarity TEXT PRIMARY KEY,
  strength_min INTEGER NOT NULL,
  attack_per_level INTEGER NOT NULL,
  defense_per_level INTEGER NOT NULL,
  speed_per_level INTEGER NOT NULL,
  health_per_level INTEGER NOT NULL,
  xp_per_level INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS game_pve_waves (
  wave INTEGER PRIMARY KEY,
  enemy_power INTEGER NOT NULL,
  reward_gold INTEGER NOT NULL,
  reward_crystals INTEGER NOT NULL,
  reward_fame INTEGER NOT NULL,
  reward_xp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_card_instances_player ON card_instances(player_id);
CREATE INDEX IF NOT EXISTS idx_shards_player ON shards(player_id);
CREATE INDEX IF NOT EXISTS idx_pve_runs_player ON quests_or_pve_runs(player_id);
