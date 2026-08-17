CREATE TABLE IF NOT EXISTS player_accounts (
  user_id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 10000,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE game_results ADD COLUMN round_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_results_user_round
ON game_results(user_id, round_id);
