export * from "./models/auth";
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

// Enums
export const sessionTypeEnum = pgEnum('session_type', ['cash', 'tournament']);
export const sessionStatusEnum = pgEnum('session_status', ['active', 'completed']);
export const playerStatusEnum = pgEnum('player_status', ['active', 'busted', 'cashed_out', 'left']);
export const transactionTypeEnum = pgEnum('transaction_type', ['buy_in', 'cash_out']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'approved', 'rejected']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'digital']);

// Poker Sessions
export const pokerSessions = pgTable("poker_sessions", {
  id: serial("id").primaryKey(),
  hostId: text("host_id").references(() => users.id).notNull(),
  type: sessionTypeEnum("type").notNull(),
  status: sessionStatusEnum("status").default('active').notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  code: text("code").unique().notNull(), // For joining
  config: jsonb("config"), // For tournament structure (blinds, intervals) or cash game rules
});

// Session Players
export const sessionPlayers = pgTable("session_players", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => pokerSessions.id).notNull(),
  userId: text("user_id").references(() => users.id), // Nullable for guest players
  name: text("name").notNull(), // Display name (user's name or manual entry)
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
  status: playerStatusEnum("status").default('active').notNull(),
  tournamentPlace: integer("tournament_place"), // 1st, 2nd, etc.
  currentStack: integer("current_stack").default(0), // For tracking stack updates
});

// Ledger / Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => pokerSessions.id).notNull(),
  playerId: integer("player_id").references(() => sessionPlayers.id).notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: integer("amount").notNull(), // In cents? Or full units. Let's assume full currency units for simplicity, or cents. Let's do integer currency units (e.g. dollars).
  paymentMethod: paymentMethodEnum("payment_method").default('cash').notNull(),
  status: transactionStatusEnum("status").default('pending').notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Relations
export const pokerSessionsRelations = relations(pokerSessions, ({ one, many }) => ({
  host: one(users, {
    fields: [pokerSessions.hostId],
    references: [users.id],
  }),
  players: many(sessionPlayers),
  transactions: many(transactions),
}));

export const sessionPlayersRelations = relations(sessionPlayers, ({ one, many }) => ({
  session: one(pokerSessions, {
    fields: [sessionPlayers.sessionId],
    references: [pokerSessions.id],
  }),
  user: one(users, {
    fields: [sessionPlayers.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  session: one(pokerSessions, {
    fields: [transactions.sessionId],
    references: [pokerSessions.id],
  }),
  player: one(sessionPlayers, {
    fields: [transactions.playerId],
    references: [sessionPlayers.id],
  }),
}));

// Schemas
export const insertPokerSessionSchema = createInsertSchema(pokerSessions).omit({ id: true, startTime: true, endTime: true, status: true, code: true });
export const insertSessionPlayerSchema = createInsertSchema(sessionPlayers).omit({ id: true, joinedAt: true, leftAt: true, status: true, tournamentPlace: true, currentStack: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, timestamp: true, status: true });

// Types
export type PokerSession = typeof pokerSessions.$inferSelect;
export type InsertPokerSession = z.infer<typeof insertPokerSessionSchema>;
export type SessionPlayer = typeof sessionPlayers.$inferSelect;
export type InsertSessionPlayer = z.infer<typeof insertSessionPlayerSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// API Models
export type CreateSessionRequest = {
  type: 'cash' | 'tournament';
  config?: any;
};

export type JoinSessionRequest = {
  code: string;
  name: string;
  userId?: string;
};

export type AddTransactionRequest = {
  playerId: number;
  type: 'buy_in' | 'cash_out';
  amount: number;
  paymentMethod: 'cash' | 'digital';
};

export type UpdateTransactionStatusRequest = {
  status: 'approved' | 'rejected';
};

export type UpdateTransactionRequest = {
  amount?: number;
  type?: 'buy_in' | 'cash_out';
  paymentMethod?: 'cash' | 'digital';
};

export type AddManualPlayerRequest = {
  name: string;
};

export type EndSessionRequest = {
  cashOuts?: { playerId: number; amount: number }[];
};

// Legacy Import - Game Results
export const gameResults = pgTable("game_results", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  playerName: text("player_name").notNull(),
  date: timestamp("date").notNull(),
  buyIn: integer("buy_in").notNull(),
  cashOut: integer("cash_out").notNull(),
  netProfit: integer("net_profit").notNull(),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
});

export const gameResultsRelations = relations(gameResults, ({ one }) => ({
  user: one(users, {
    fields: [gameResults.userId],
    references: [users.id],
  }),
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
