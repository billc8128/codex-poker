import { env } from "cloudflare:workers";

export type GameId = "doudizhu" | "zhajinhua" | "holdem" | "blackjack";
export type AccountIdentity = { userId: string; displayName: string };
export type PlayerAccount = AccountIdentity & { balance: number };
export type ResultInput = AccountIdentity & {
  roundId: string;
  game: GameId;
  delta: number;
};
export type GameResultRow = {
  roundId: string | null;
  game: GameId;
  delta: number;
  createdAt: string;
};

const STARTING_BALANCE = 10000;
const memoryAccounts = new Map<string, PlayerAccount>();
const memoryRounds = new Set<string>();
const memoryResults = new Map<string, GameResultRow[]>();

function database() {
  if (process.env.NODE_ENV !== "production") return null;
  if (!env.DB) throw new Error("Sites D1 binding DB is unavailable");
  return env.DB;
}

function localAccount(identity: AccountIdentity) {
  const current = memoryAccounts.get(identity.userId) ?? {
    ...identity,
    balance: STARTING_BALANCE,
  };
  const account = { ...current, displayName: identity.displayName };
  memoryAccounts.set(identity.userId, account);
  return account;
}

export async function accountFor(
  identity: AccountIdentity,
): Promise<PlayerAccount> {
  const db = database();
  if (!db) return localAccount(identity);
  await db
    .prepare(
      `INSERT INTO player_accounts (user_id, display_name, balance)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         display_name = excluded.display_name,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(identity.userId, identity.displayName, STARTING_BALANCE)
    .run();
  const account = await db
    .prepare(
      `SELECT user_id AS userId, display_name AS displayName, balance
       FROM player_accounts WHERE user_id = ?`,
    )
    .bind(identity.userId)
    .first<PlayerAccount>();
  if (!account) throw new Error("Player account was not created");
  return account;
}

export async function saveResult(input: ResultInput) {
  const db = database();
  if (!db) {
    const key = `${input.userId}:${input.roundId}`;
    const account = localAccount(input);
    if (memoryRounds.has(key)) return account;
    memoryRounds.add(key);
    account.balance += input.delta;
    memoryAccounts.set(input.userId, account);
    memoryResults.set(input.userId, [
      {
        roundId: input.roundId,
        game: input.game,
        delta: input.delta,
        createdAt: new Date().toISOString(),
      },
      ...(memoryResults.get(input.userId) ?? []),
    ]);
    return account;
  }
  await accountFor(input);
  const inserted = await db
    .prepare(
      `INSERT OR IGNORE INTO game_results
       (user_id, round_id, game, delta) VALUES (?, ?, ?, ?)`,
    )
    .bind(input.userId, input.roundId, input.game, input.delta)
    .run();
  if (Number(inserted.meta.changes ?? 0) > 0)
    await db
      .prepare(
        `UPDATE player_accounts
         SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
      )
      .bind(input.delta, input.userId)
      .run();
  return accountFor(input);
}

export async function recentResultsFor(userId: string) {
  const db = database();
  if (!db) return (memoryResults.get(userId) ?? []).slice(0, 20);
  const rows = await db
    .prepare(
      `SELECT round_id AS roundId, game, delta, created_at AS createdAt
       FROM game_results WHERE user_id = ?
       ORDER BY id DESC LIMIT 20`,
    )
    .bind(userId)
    .all<GameResultRow>();
  return rows.results;
}
