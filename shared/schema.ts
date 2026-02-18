export * from "./models/auth";
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum, date, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export const sessionTypeEnum = pgEnum('session_type', ['cash', 'tournament']);
export const sessionStatusEnum = pgEnum('session_status', ['active', 'completed']);
export const playerStatusEnum = pgEnum('player_status', ['active', 'busted', 'cashed_out', 'left']);
export const transactionTypeEnum = pgEnum('transaction_type', ['buy_in', 'cash_out']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'approved', 'rejected']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'digital']);

export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").unique().notNull(),
  creatorId: text("creator_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leagueMembers = pgTable("league_members", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").references(() => leagues.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  canHostSessions: boolean("can_host_sessions").default(false).notNull(),
}, (table) => [
  uniqueIndex("league_members_league_user_idx").on(table.leagueId, table.userId),
]);

export const leaguePlayers = pgTable("league_players", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").references(() => leagues.id).notNull(),
  name: text("name").notNull(),
  claimedByUserId: text("claimed_by_user_id").references(() => users.id),
}, (table) => [
  uniqueIndex("league_players_league_name_idx").on(table.leagueId, table.name),
  uniqueIndex("league_players_league_name_ci_idx").on(table.leagueId, sql`lower(trim(${table.name}))`),
]);

export const pokerSessions = pgTable("poker_sessions", {
  id: serial("id").primaryKey(),
  hostId: text("host_id").references(() => users.id).notNull(),
  leagueId: integer("league_id").references(() => leagues.id),
  type: sessionTypeEnum("type").notNull(),
  status: sessionStatusEnum("status").default('active').notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  code: text("code").unique().notNull(),
  config: jsonb("config"),
  defaultBuyIn: integer("default_buy_in"),
  isUnbalanced: boolean("is_unbalanced").default(false),
  autoApproveTransactions: boolean("auto_approve_transactions").default(false).notNull(),
});

export const sessionPlayers = pgTable("session_players", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => pokerSessions.id).notNull(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
  status: playerStatusEnum("status").default('active').notNull(),
  tournamentPlace: integer("tournament_place"),
  currentStack: integer("current_stack").default(0),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => pokerSessions.id).notNull(),
  playerId: integer("player_id").references(() => sessionPlayers.id).notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").default('cash').notNull(),
  status: transactionStatusEnum("status").default('pending').notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const leaguesRelations = relations(leagues, ({ one, many }) => ({
  creator: one(users, { fields: [leagues.creatorId], references: [users.id] }),
  members: many(leagueMembers),
  players: many(leaguePlayers),
  sessions: many(pokerSessions),
}));

export const leagueMembersRelations = relations(leagueMembers, ({ one }) => ({
  league: one(leagues, { fields: [leagueMembers.leagueId], references: [leagues.id] }),
  user: one(users, { fields: [leagueMembers.userId], references: [users.id] }),
}));

export const leaguePlayersRelations = relations(leaguePlayers, ({ one }) => ({
  league: one(leagues, { fields: [leaguePlayers.leagueId], references: [leagues.id] }),
  claimedBy: one(users, { fields: [leaguePlayers.claimedByUserId], references: [users.id] }),
}));

export const pokerSessionsRelations = relations(pokerSessions, ({ one, many }) => ({
  host: one(users, { fields: [pokerSessions.hostId], references: [users.id] }),
  league: one(leagues, { fields: [pokerSessions.leagueId], references: [leagues.id] }),
  players: many(sessionPlayers),
  transactions: many(transactions),
}));

export const sessionPlayersRelations = relations(sessionPlayers, ({ one, many }) => ({
  session: one(pokerSessions, { fields: [sessionPlayers.sessionId], references: [pokerSessions.id] }),
  user: one(users, { fields: [sessionPlayers.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  session: one(pokerSessions, { fields: [transactions.sessionId], references: [pokerSessions.id] }),
  player: one(sessionPlayers, { fields: [transactions.playerId], references: [sessionPlayers.id] }),
}));

export const insertPokerSessionSchema = createInsertSchema(pokerSessions).omit({ id: true });
export const insertSessionPlayerSchema = createInsertSchema(sessionPlayers).omit({ id: true, joinedAt: true, leftAt: true, status: true, tournamentPlace: true, currentStack: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, timestamp: true });
export const insertLeagueSchema = createInsertSchema(leagues).omit({ id: true, createdAt: true });
export const insertLeagueMemberSchema = createInsertSchema(leagueMembers).omit({ id: true, joinedAt: true });
export const insertLeaguePlayerSchema = createInsertSchema(leaguePlayers).omit({ id: true });

export type PokerSession = typeof pokerSessions.$inferSelect;
export type InsertPokerSession = z.infer<typeof insertPokerSessionSchema>;
export type SessionPlayer = typeof sessionPlayers.$inferSelect;
export type InsertSessionPlayer = z.infer<typeof insertSessionPlayerSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type League = typeof leagues.$inferSelect;
export type InsertLeague = z.infer<typeof insertLeagueSchema>;
export type LeagueMember = typeof leagueMembers.$inferSelect;
export type InsertLeagueMember = z.infer<typeof insertLeagueMemberSchema>;
export type LeaguePlayer = typeof leaguePlayers.$inferSelect;
export type InsertLeaguePlayer = z.infer<typeof insertLeaguePlayerSchema>;

export type TournamentConfig = {
  allowRebuys: boolean;
  rebuyTimeLimit: number | null;
  payoutStructure: {
    type: 'winner_takes_all' | 'top_2' | 'top_3' | 'custom';
    percentages: number[];
  };
  customPayouts?: Record<string, number>;
  blindTimer?: {
    enabled: boolean;
    levelDurationMinutes: number;
    startingBigBlind: number;
  };
};

export type CreateSessionRequest = {
  type: 'cash' | 'tournament';
  leagueId?: number;
  config?: any;
  defaultBuyIn?: number;
};

export type JoinSessionRequest = {
  code: string;
};

export type AddTransactionRequest = {
  playerId: number;
  type: 'buy_in' | 'cash_out';
  amount: number;
};

export type UpdateTransactionStatusRequest = {
  status: 'approved' | 'rejected';
};

export type UpdateTransactionRequest = {
  amount?: number;
  type?: 'buy_in' | 'cash_out';
};

export type AddManualPlayerRequest = {
  name: string;
};

export type EndSessionRequest = {
  cashOuts?: { playerId: number; amount: number }[];
};

export const gameResults = pgTable("game_results", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  leagueId: integer("league_id").references(() => leagues.id),
  sessionId: integer("session_id").references(() => pokerSessions.id, { onDelete: 'set null' }),
  playerName: text("player_name").notNull(),
  date: timestamp("date").notNull(),
  buyIn: integer("buy_in").notNull(),
  cashOut: integer("cash_out").notNull(),
  netProfit: integer("net_profit").notNull(),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
});

export const gameResultsRelations = relations(gameResults, ({ one }) => ({
  user: one(users, { fields: [gameResults.userId], references: [users.id] }),
  league: one(leagues, { fields: [gameResults.leagueId], references: [leagues.id] }),
}));

export const insertGameResultSchema = createInsertSchema(gameResults).omit({ id: true, importedAt: true, netProfit: true });

export type GameResult = typeof gameResults.$inferSelect;
export type InsertGameResult = z.infer<typeof insertGameResultSchema>;

export type ImportRow = {
  date: string;
  playerName: string;
  buyIn: number;
  cashOut: number;
};

export type ParsedFileResponse = {
  rows: ImportRow[];
  rawText?: string;
};
