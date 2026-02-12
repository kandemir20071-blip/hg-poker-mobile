import { db } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  pokerSessions, sessionPlayers, transactions, gameResults,
  type PokerSession, type InsertPokerSession,
  type SessionPlayer, type InsertSessionPlayer,
  type Transaction, type InsertTransaction,
  type GameResult
} from "@shared/schema";

export interface IStorage {
  // Sessions
  createSession(session: InsertPokerSession): Promise<PokerSession>;
  getSession(id: number): Promise<PokerSession | undefined>;
  getSessionByCode(code: string): Promise<PokerSession | undefined>;
  getUserSessions(userId: string): Promise<PokerSession[]>;
  updateSessionStatus(id: number, status: 'active' | 'completed', endTime?: Date): Promise<PokerSession>;

  // Players
  addPlayer(player: InsertSessionPlayer): Promise<SessionPlayer>;
  getSessionPlayers(sessionId: number): Promise<SessionPlayer[]>;
  getPlayer(id: number): Promise<SessionPlayer | undefined>;
  getPlayerBySessionAndUser(sessionId: number, userId: string): Promise<SessionPlayer | undefined>;

  // Transactions
  addTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getSessionTransactions(sessionId: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  updateTransactionStatus(id: number, status: 'approved' | 'rejected'): Promise<Transaction>;
  updateTransaction(id: number, data: { amount?: number; type?: 'buy_in' | 'cash_out'; paymentMethod?: 'cash' | 'digital' }): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;

  // Session management
  deleteSession(id: number): Promise<void>;

  // Game Results (Legacy Import)
  addGameResult(result: { userId: string; playerName: string; date: Date; buyIn: number; cashOut: number; netProfit: number }): Promise<GameResult>;
  getGameResults(userId: string): Promise<GameResult[]>;
}

export class DatabaseStorage implements IStorage {
  async createSession(session: InsertPokerSession): Promise<PokerSession> {
    const [newSession] = await db.insert(pokerSessions).values(session).returning();
    return newSession;
  }

  async getSession(id: number): Promise<PokerSession | undefined> {
    const [session] = await db.select().from(pokerSessions).where(eq(pokerSessions.id, id));
    return session;
  }

  async getSessionByCode(code: string): Promise<PokerSession | undefined> {
    const [session] = await db.select().from(pokerSessions).where(eq(pokerSessions.code, code));
    return session;
  }

  async getUserSessions(userId: string): Promise<PokerSession[]> {
    return await db.select()
      .from(pokerSessions)
      .where(eq(pokerSessions.hostId, userId))
      .orderBy(desc(pokerSessions.startTime));
  }

  async updateSessionStatus(id: number, status: 'active' | 'completed', endTime?: Date): Promise<PokerSession> {
    const [updated] = await db.update(pokerSessions)
      .set({ status, endTime })
      .where(eq(pokerSessions.id, id))
      .returning();
    return updated;
  }

  async addPlayer(player: InsertSessionPlayer): Promise<SessionPlayer> {
    const [newPlayer] = await db.insert(sessionPlayers).values(player).returning();
    return newPlayer;
  }

  async getSessionPlayers(sessionId: number): Promise<SessionPlayer[]> {
    return await db.select().from(sessionPlayers).where(eq(sessionPlayers.sessionId, sessionId));
  }

  async getPlayer(id: number): Promise<SessionPlayer | undefined> {
    const [player] = await db.select().from(sessionPlayers).where(eq(sessionPlayers.id, id));
    return player;
  }

  async getPlayerBySessionAndUser(sessionId: number, userId: string): Promise<SessionPlayer | undefined> {
    const [player] = await db.select()
      .from(sessionPlayers)
      .where(and(eq(sessionPlayers.sessionId, sessionId), eq(sessionPlayers.userId, userId)));
    return player;
  }

  async addTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getSessionTransactions(sessionId: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.sessionId, sessionId));
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id));
    return tx;
  }

  async updateTransactionStatus(id: number, status: 'approved' | 'rejected'): Promise<Transaction> {
    const [updated] = await db.update(transactions)
      .set({ status })
      .where(eq(transactions.id, id))
      .returning();
    return updated;
  }

  async updateTransaction(id: number, data: { amount?: number; type?: 'buy_in' | 'cash_out'; paymentMethod?: 'cash' | 'digital' }): Promise<Transaction> {
    const [updated] = await db.update(transactions)
      .set(data)
      .where(eq(transactions.id, id))
      .returning();
    return updated;
  }

  async deleteTransaction(id: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  async deleteSession(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const players = await tx.select({ id: sessionPlayers.id }).from(sessionPlayers).where(eq(sessionPlayers.sessionId, id));
      const playerIds = players.map(p => p.id);
      if (playerIds.length > 0) {
        await tx.delete(transactions).where(inArray(transactions.playerId, playerIds));
      }
      await tx.delete(sessionPlayers).where(eq(sessionPlayers.sessionId, id));
      await tx.delete(pokerSessions).where(eq(pokerSessions.id, id));
    });
  }

  async addGameResult(result: { userId: string; playerName: string; date: Date; buyIn: number; cashOut: number; netProfit: number }): Promise<GameResult> {
    const [newResult] = await db.insert(gameResults).values(result).returning();
    return newResult;
  }

  async getGameResults(userId: string): Promise<GameResult[]> {
    return await db.select()
      .from(gameResults)
      .where(eq(gameResults.userId, userId))
      .orderBy(desc(gameResults.date));
  }
}

export const storage = new DatabaseStorage();
