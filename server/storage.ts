import { db } from "./db";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  pokerSessions, sessionPlayers, transactions, gameResults,
  leagues, leagueMembers, leaguePlayers,
  type PokerSession, type InsertPokerSession,
  type SessionPlayer, type InsertSessionPlayer,
  type Transaction, type InsertTransaction,
  type GameResult,
  type League, type InsertLeague,
  type LeagueMember, type InsertLeagueMember,
  type LeaguePlayer, type InsertLeaguePlayer,
} from "@shared/schema";

export interface IStorage {
  createSession(session: InsertPokerSession): Promise<PokerSession>;
  getSession(id: number): Promise<PokerSession | undefined>;
  getSessionByCode(code: string): Promise<PokerSession | undefined>;
  getUserSessions(userId: string): Promise<PokerSession[]>;
  getLeagueSessions(leagueId: number): Promise<PokerSession[]>;
  updateSessionStatus(id: number, status: 'active' | 'completed', endTime?: Date): Promise<PokerSession>;
  updateSessionConfig(id: number, config: Record<string, unknown>): Promise<PokerSession>;

  addPlayer(player: InsertSessionPlayer): Promise<SessionPlayer>;
  getSessionPlayers(sessionId: number): Promise<SessionPlayer[]>;
  getPlayer(id: number): Promise<SessionPlayer | undefined>;
  getPlayerBySessionAndUser(sessionId: number, userId: string): Promise<SessionPlayer | undefined>;
  updatePlayerStatus(id: number, status: 'active' | 'busted' | 'cashed_out' | 'left'): Promise<SessionPlayer>;
  updatePlayerTournamentPlace(id: number, place: number): Promise<SessionPlayer>;
  bustPlayer(id: number, place: number): Promise<SessionPlayer>;

  addTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getSessionTransactions(sessionId: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  updateTransactionStatus(id: number, status: 'approved' | 'rejected'): Promise<Transaction>;
  updateTransaction(id: number, data: { amount?: number; type?: 'buy_in' | 'cash_out'; paymentMethod?: 'cash' | 'digital' }): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;

  deleteSession(id: number): Promise<void>;

  addGameResult(result: { userId: string; leagueId?: number; sessionId?: number; playerName: string; date: Date; buyIn: number; cashOut: number; netProfit: number }): Promise<GameResult>;
  getGameResults(userId: string): Promise<GameResult[]>;
  getLeagueGameResults(leagueId: number): Promise<GameResult[]>;

  createLeague(league: InsertLeague): Promise<League>;
  getLeague(id: number): Promise<League | undefined>;
  getLeagueByInviteCode(code: string): Promise<League | undefined>;
  getUserLeagues(userId: string): Promise<League[]>;
  updateLeague(id: number, data: { name?: string }): Promise<League>;

  addLeagueMember(member: InsertLeagueMember): Promise<LeagueMember>;
  getLeagueMembers(leagueId: number): Promise<LeagueMember[]>;
  isLeagueMember(leagueId: number, userId: string): Promise<boolean>;

  addLeaguePlayer(player: InsertLeaguePlayer): Promise<LeaguePlayer>;
  getLeaguePlayers(leagueId: number): Promise<LeaguePlayer[]>;
  getLeaguePlayer(id: number): Promise<LeaguePlayer | undefined>;
  getLeaguePlayerByUserId(leagueId: number, userId: string): Promise<LeaguePlayer | undefined>;
  claimLeaguePlayer(playerId: number, userId: string): Promise<LeaguePlayer>;
  getLeaguePlayerByName(leagueId: number, name: string): Promise<LeaguePlayer | undefined>;
  unclaimLeaguePlayer(playerId: number): Promise<LeaguePlayer>;
  mergeLeaguePlayers(sourcePlayerId: number, targetPlayerId: number, leagueId: number): Promise<void>;
  renameLeaguePlayer(playerId: number, newName: string, leagueId: number): Promise<LeaguePlayer>;
  deleteLeaguePlayer(playerId: number): Promise<void>;
  getPlayerSessionCounts(leagueId: number): Promise<Map<string, number>>;
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

  async getLeagueSessions(leagueId: number): Promise<PokerSession[]> {
    return await db.select()
      .from(pokerSessions)
      .where(eq(pokerSessions.leagueId, leagueId))
      .orderBy(desc(pokerSessions.startTime));
  }

  async updateSessionStatus(id: number, status: 'active' | 'completed', endTime?: Date): Promise<PokerSession> {
    const [updated] = await db.update(pokerSessions)
      .set({ status, endTime })
      .where(eq(pokerSessions.id, id))
      .returning();
    return updated;
  }

  async updateSessionConfig(id: number, config: Record<string, unknown>): Promise<PokerSession> {
    const [updated] = await db.update(pokerSessions)
      .set({ config })
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

  async updatePlayerStatus(id: number, status: 'active' | 'busted' | 'cashed_out' | 'left'): Promise<SessionPlayer> {
    const [updated] = await db.update(sessionPlayers)
      .set({ status })
      .where(eq(sessionPlayers.id, id))
      .returning();
    return updated;
  }

  async updatePlayerTournamentPlace(id: number, place: number): Promise<SessionPlayer> {
    const [updated] = await db.update(sessionPlayers)
      .set({ tournamentPlace: place })
      .where(eq(sessionPlayers.id, id))
      .returning();
    return updated;
  }

  async bustPlayer(id: number, place: number): Promise<SessionPlayer> {
    const [updated] = await db.update(sessionPlayers)
      .set({ status: 'busted', tournamentPlace: place, leftAt: new Date() })
      .where(eq(sessionPlayers.id, id))
      .returning();
    return updated;
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
      const session = await tx.select().from(pokerSessions).where(eq(pokerSessions.id, id)).then(r => r[0]);

      const players = await tx.select({ id: sessionPlayers.id }).from(sessionPlayers).where(eq(sessionPlayers.sessionId, id));
      const playerIds = players.map(p => p.id);
      if (playerIds.length > 0) {
        await tx.delete(transactions).where(inArray(transactions.playerId, playerIds));
      }

      await tx.delete(gameResults).where(eq(gameResults.sessionId, id));

      if (session && session.leagueId && session.startTime) {
        const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
        await tx.delete(gameResults).where(
          and(
            eq(gameResults.leagueId, session.leagueId),
            sql`DATE(${gameResults.date}) = ${sessionDate}`,
            sql`${gameResults.sessionId} IS NULL`
          )
        );
      }

      await tx.delete(sessionPlayers).where(eq(sessionPlayers.sessionId, id));
      await tx.delete(pokerSessions).where(eq(pokerSessions.id, id));
    });
  }

  async addGameResult(result: { userId: string; leagueId?: number; sessionId?: number; playerName: string; date: Date; buyIn: number; cashOut: number; netProfit: number }): Promise<GameResult> {
    const [newResult] = await db.insert(gameResults).values(result).returning();
    return newResult;
  }

  async getGameResults(userId: string): Promise<GameResult[]> {
    return await db.select()
      .from(gameResults)
      .where(eq(gameResults.userId, userId))
      .orderBy(desc(gameResults.date));
  }

  async getLeagueGameResults(leagueId: number): Promise<GameResult[]> {
    return await db.select()
      .from(gameResults)
      .where(eq(gameResults.leagueId, leagueId))
      .orderBy(desc(gameResults.date));
  }

  async createLeague(league: InsertLeague): Promise<League> {
    const [newLeague] = await db.insert(leagues).values(league).returning();
    return newLeague;
  }

  async getLeague(id: number): Promise<League | undefined> {
    const [league] = await db.select().from(leagues).where(eq(leagues.id, id));
    return league;
  }

  async getLeagueByInviteCode(code: string): Promise<League | undefined> {
    const [league] = await db.select().from(leagues).where(eq(leagues.inviteCode, code));
    return league;
  }

  async getUserLeagues(userId: string): Promise<League[]> {
    const memberships = await db.select({ leagueId: leagueMembers.leagueId })
      .from(leagueMembers)
      .where(eq(leagueMembers.userId, userId));
    const leagueIds = memberships.map(m => m.leagueId);
    if (leagueIds.length === 0) return [];
    return await db.select().from(leagues).where(inArray(leagues.id, leagueIds));
  }

  async updateLeague(id: number, data: { name?: string }): Promise<League> {
    const [updated] = await db.update(leagues).set(data).where(eq(leagues.id, id)).returning();
    return updated;
  }

  async addLeagueMember(member: InsertLeagueMember): Promise<LeagueMember> {
    const [newMember] = await db.insert(leagueMembers).values(member).returning();
    return newMember;
  }

  async getLeagueMembers(leagueId: number): Promise<LeagueMember[]> {
    return await db.select().from(leagueMembers).where(eq(leagueMembers.leagueId, leagueId));
  }

  async isLeagueMember(leagueId: number, userId: string): Promise<boolean> {
    const [member] = await db.select().from(leagueMembers)
      .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId)));
    return !!member;
  }

  async addLeaguePlayer(player: InsertLeaguePlayer): Promise<LeaguePlayer> {
    const [newPlayer] = await db.insert(leaguePlayers).values(player).returning();
    return newPlayer;
  }

  async getLeaguePlayers(leagueId: number): Promise<LeaguePlayer[]> {
    return await db.select().from(leaguePlayers).where(eq(leaguePlayers.leagueId, leagueId));
  }

  async getLeaguePlayer(id: number): Promise<LeaguePlayer | undefined> {
    const [player] = await db.select().from(leaguePlayers).where(eq(leaguePlayers.id, id));
    return player;
  }

  async getLeaguePlayerByUserId(leagueId: number, userId: string): Promise<LeaguePlayer | undefined> {
    const [player] = await db.select().from(leaguePlayers)
      .where(and(eq(leaguePlayers.leagueId, leagueId), eq(leaguePlayers.claimedByUserId, userId)));
    return player;
  }

  async claimLeaguePlayer(playerId: number, userId: string): Promise<LeaguePlayer> {
    const [updated] = await db.update(leaguePlayers)
      .set({ claimedByUserId: userId })
      .where(and(eq(leaguePlayers.id, playerId), sql`${leaguePlayers.claimedByUserId} IS NULL`))
      .returning();
    if (!updated) throw new Error("Player already claimed or not found");
    return updated;
  }

  async getLeaguePlayerByName(leagueId: number, name: string): Promise<LeaguePlayer | undefined> {
    const allPlayers = await db.select().from(leaguePlayers).where(eq(leaguePlayers.leagueId, leagueId));
    return allPlayers.find(p => p.name.toLowerCase().trim() === name.toLowerCase().trim());
  }

  async unclaimLeaguePlayer(playerId: number): Promise<LeaguePlayer> {
    const [updated] = await db.update(leaguePlayers)
      .set({ claimedByUserId: null })
      .where(eq(leaguePlayers.id, playerId))
      .returning();
    if (!updated) throw new Error("Player not found");
    return updated;
  }

  async mergeLeaguePlayers(sourcePlayerId: number, targetPlayerId: number, leagueId: number): Promise<void> {
    await db.transaction(async (tx) => {
      const [source] = await tx.select().from(leaguePlayers).where(eq(leaguePlayers.id, sourcePlayerId));
      const [target] = await tx.select().from(leaguePlayers).where(eq(leaguePlayers.id, targetPlayerId));
      if (!source || !target) throw new Error("Source or target player not found");
      if (source.leagueId !== leagueId || target.leagueId !== leagueId) throw new Error("Players must be in the same league");

      if (source.claimedByUserId && !target.claimedByUserId) {
        await tx.update(leaguePlayers)
          .set({ claimedByUserId: source.claimedByUserId })
          .where(eq(leaguePlayers.id, targetPlayerId));
      }

      await tx.update(gameResults)
        .set({ playerName: target.name })
        .where(and(eq(gameResults.playerName, source.name), eq(gameResults.leagueId, leagueId)));

      await tx.update(sessionPlayers)
        .set({ name: target.name })
        .where(
          and(
            eq(sessionPlayers.name, source.name),
            inArray(
              sessionPlayers.sessionId,
              tx.select({ id: pokerSessions.id }).from(pokerSessions).where(eq(pokerSessions.leagueId, leagueId))
            )
          )
        );

      await tx.delete(leaguePlayers).where(eq(leaguePlayers.id, sourcePlayerId));
    });
  }

  async renameLeaguePlayer(playerId: number, newName: string, leagueId: number): Promise<LeaguePlayer> {
    const [updated] = await db.transaction(async (tx) => {
      const [player] = await tx.select().from(leaguePlayers).where(eq(leaguePlayers.id, playerId));
      if (!player) throw new Error("Player not found");
      if (player.leagueId !== leagueId) throw new Error("Player not in this league");

      const oldName = player.name;

      const [updatedPlayer] = await tx.update(leaguePlayers)
        .set({ name: newName })
        .where(eq(leaguePlayers.id, playerId))
        .returning();

      await tx.update(sessionPlayers)
        .set({ name: newName })
        .where(
          and(
            eq(sessionPlayers.name, oldName),
            inArray(
              sessionPlayers.sessionId,
              tx.select({ id: pokerSessions.id }).from(pokerSessions).where(eq(pokerSessions.leagueId, leagueId))
            )
          )
        );

      await tx.update(gameResults)
        .set({ playerName: newName })
        .where(and(eq(gameResults.playerName, oldName), eq(gameResults.leagueId, leagueId)));

      return [updatedPlayer];
    });
    return updated;
  }

  async deleteLeaguePlayer(playerId: number): Promise<void> {
    await db.delete(leaguePlayers).where(eq(leaguePlayers.id, playerId));
  }

  async getPlayerSessionCounts(leagueId: number): Promise<Map<string, number>> {
    const rows = await db
      .select({
        name: sql<string>`lower(trim(${sessionPlayers.name}))`,
        count: sql<number>`count(distinct ${sessionPlayers.sessionId})`,
      })
      .from(sessionPlayers)
      .innerJoin(pokerSessions, eq(sessionPlayers.sessionId, pokerSessions.id))
      .where(eq(pokerSessions.leagueId, leagueId))
      .groupBy(sql`lower(trim(${sessionPlayers.name}))`);

    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.name, Number(row.count));
    }
    return map;
  }
}

export const storage = new DatabaseStorage();
