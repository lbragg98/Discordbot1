CREATE TABLE IF NOT EXISTS party_slots (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,
  card_id TEXT NOT NULL,
  PRIMARY KEY (player_id, slot_index)
);

CREATE TABLE IF NOT EXISTS team_slots (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,
  card_id TEXT NOT NULL,
  PRIMARY KEY (player_id, slot_index)
);

CREATE TABLE IF NOT EXISTS player_pull_windows (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  free_pulls_used INTEGER NOT NULL DEFAULT 0,
  free_pulls_max INTEGER NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS player_items (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, item_key)
);

CREATE TABLE IF NOT EXISTS player_claim_cooldowns (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  cadence TEXT NOT NULL,
  next_eligible_at TEXT NOT NULL,
  last_claimed_at TEXT NOT NULL,
  PRIMARY KEY (player_id, cadence)
);

CREATE TABLE IF NOT EXISTS player_active_quests (
  player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  rarity TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_quest_definitions (
  rarity TEXT PRIMARY KEY,
  duration_minutes INTEGER NOT NULL,
  reward_gold INTEGER NOT NULL,
  reward_crystals INTEGER NOT NULL,
  reward_fame INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_party_slots_player ON party_slots(player_id);
CREATE INDEX IF NOT EXISTS idx_team_slots_player ON team_slots(player_id);
CREATE INDEX IF NOT EXISTS idx_player_items_player ON player_items(player_id);
CREATE INDEX IF NOT EXISTS idx_claims_player ON player_claim_cooldowns(player_id);
