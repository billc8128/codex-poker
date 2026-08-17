import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const playerAccounts = sqliteTable("player_accounts", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  balance: integer("balance").notNull().default(10000),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const gameResults = sqliteTable(
  "game_results",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    roundId: text("round_id"),
    game: text("game").notNull(),
    delta: integer("delta").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_game_results_user_id").on(table.userId),
    uniqueIndex("idx_game_results_user_round").on(
      table.userId,
      table.roundId,
    ),
  ],
);
