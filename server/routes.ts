import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import multer from "multer";
import path from "path";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as any).code === "23505"
  );
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls', '.pdf', '.docx', '.doc', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // ==================== LEAGUES ====================

  app.post(api.leagues.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.leagues.create.input.parse(req.body);
      const userId = (req.user as any).claims.sub;
      const inviteCode = randomBytes(3).toString('hex').toUpperCase();

      const league = await storage.createLeague({
        name: input.name,
        creatorId: userId,
        inviteCode,
      });

      await storage.addLeagueMember({ leagueId: league.id, userId });

      res.status(201).json(league);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (isUniqueViolation(err)) return res.status(400).json({ message: "You are already a member of this league." });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.leagues.list.path, requireAuth, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const userLeagues = await storage.getUserLeagues(userId);
    res.json(userLeagues);
  });

  app.get(api.leagues.get.path, requireAuth, async (req, res) => {
    const leagueId = Number(req.params.id);
    const league = await storage.getLeague(leagueId);
    if (!league) return res.status(404).json({ message: "League not found" });

    const userId = (req.user as any).claims.sub;
    const isMember = await storage.isLeagueMember(leagueId, userId);
    if (!isMember) return res.status(401).json({ message: "Not a member of this league" });

    const members = await storage.getLeagueMembers(leagueId);
    const players = await storage.getLeaguePlayers(leagueId);
    const sessionCountMap = await storage.getPlayerSessionCounts(leagueId);
    const playersWithCounts = players.map(p => ({
      ...p,
      sessionCount: sessionCountMap.get(p.name.toLowerCase().trim()) || 0,
    }));

    res.json({ ...league, memberCount: members.length, players: playersWithCounts });
  });

  app.post(api.leagues.join.path, requireAuth, async (req, res) => {
    try {
      const { inviteCode } = api.leagues.join.input.parse(req.body);
      const userId = (req.user as any).claims.sub;

      const league = await storage.getLeagueByInviteCode(inviteCode.toUpperCase());
      if (!league) return res.status(404).json({ message: "League not found" });

      const alreadyMember = await storage.isLeagueMember(league.id, userId);
      if (!alreadyMember) {
        await storage.addLeagueMember({ leagueId: league.id, userId });
      }

      const players = await storage.getLeaguePlayers(league.id);
      const unclaimedPlayers = players.filter(p => !p.claimedByUserId);

      res.json({ league, unclaimedPlayers });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (isUniqueViolation(err)) return res.status(400).json({ message: "You are already a member of this league." });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.leagues.players.path, requireAuth, async (req, res) => {
    const leagueId = Number(req.params.id);
    const userId = (req.user as any).claims.sub;
    const isMember = await storage.isLeagueMember(leagueId, userId);
    if (!isMember) return res.status(401).json({ message: "Not a member of this league" });
    const players = await storage.getLeaguePlayers(leagueId);
    const sessionCountMap = await storage.getPlayerSessionCounts(leagueId);
    const playersWithCounts = players.map(p => ({
      ...p,
      sessionCount: sessionCountMap.get(p.name.toLowerCase().trim()) || 0,
    }));

    res.json(playersWithCounts);
  });

  app.post(api.leagues.claimPlayer.path, requireAuth, async (req, res) => {
    try {
      const leagueId = Number(req.params.id);
      const { playerId } = api.leagues.claimPlayer.input.parse(req.body);
      const userId = (req.user as any).claims.sub;

      const isMember = await storage.isLeagueMember(leagueId, userId);
      if (!isMember) return res.status(401).json({ message: "Not a member of this league" });

      const existingClaim = await storage.getLeaguePlayerByUserId(leagueId, userId);
      if (existingClaim) {
        return res.status(400).json({ message: `You have already claimed the name "${existingClaim.name}" in this league.` });
      }

      const player = await storage.getLeaguePlayer(playerId);
      if (!player || player.leagueId !== leagueId) {
        return res.status(404).json({ message: "Player not found in this league" });
      }

      if (player.claimedByUserId) {
        return res.status(400).json({ message: "Player already claimed by another user" });
      }

      const updated = await storage.claimLeaguePlayer(playerId, userId);

      const { db: database } = await import("./db");
      const { gameResults, sessionPlayers, pokerSessions } = await import("@shared/schema");
      const { eq: eqOp, and: andOp, sql: sqlOp, inArray } = await import("drizzle-orm");

      await database.update(gameResults)
        .set({ userId })
        .where(andOp(
          eqOp(gameResults.leagueId, leagueId),
          sqlOp`LOWER(TRIM(${gameResults.playerName})) = LOWER(TRIM(${player.name}))`
        ));

      const leagueSessions = await database.select({ id: pokerSessions.id })
        .from(pokerSessions)
        .where(eqOp(pokerSessions.leagueId, leagueId));
      const leagueSessionIds = leagueSessions.map(s => s.id);

      if (leagueSessionIds.length > 0) {
        await database.update(sessionPlayers)
          .set({ userId })
          .where(andOp(
            inArray(sessionPlayers.sessionId, leagueSessionIds),
            sqlOp`LOWER(TRIM(${sessionPlayers.name})) = LOWER(TRIM(${player.name}))`,
            sqlOp`${sessionPlayers.userId} IS NULL`
          ));
      }

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.leagues.unclaimPlayer.path, requireAuth, async (req, res) => {
    try {
      const leagueId = Number(req.params.id);
      const { playerId } = api.leagues.unclaimPlayer.input.parse(req.body);
      const userId = (req.user as any).claims.sub;

      const league = await storage.getLeague(leagueId);
      if (!league) return res.status(404).json({ message: "League not found" });
      if (league.creatorId !== userId) return res.status(401).json({ message: "Only the league creator can manage players" });

      const player = await storage.getLeaguePlayer(playerId);
      if (!player || player.leagueId !== leagueId) return res.status(404).json({ message: "Player not found in this league" });
      if (!player.claimedByUserId) return res.status(400).json({ message: "Player is not claimed" });

      const updated = await storage.unclaimLeaguePlayer(playerId);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.leagues.mergePlayers.path, requireAuth, async (req, res) => {
    try {
      const leagueId = Number(req.params.id);
      const { sourcePlayerId, targetPlayerId } = api.leagues.mergePlayers.input.parse(req.body);
      const userId = (req.user as any).claims.sub;

      const league = await storage.getLeague(leagueId);
      if (!league) return res.status(404).json({ message: "League not found" });
      if (league.creatorId !== userId) return res.status(401).json({ message: "Only the league creator can merge players" });

      if (sourcePlayerId === targetPlayerId) return res.status(400).json({ message: "Cannot merge a player into themselves" });

      const source = await storage.getLeaguePlayer(sourcePlayerId);
      const target = await storage.getLeaguePlayer(targetPlayerId);
      if (!source || source.leagueId !== leagueId) return res.status(404).json({ message: "Source player not found in this league" });
      if (!target || target.leagueId !== leagueId) return res.status(404).json({ message: "Target player not found in this league" });

      if (source.claimedByUserId && target.claimedByUserId && source.claimedByUserId !== target.claimedByUserId) {
        return res.status(400).json({ message: "Both players are claimed by different users. Unclaim one first before merging." });
      }

      await storage.mergeLeaguePlayers(sourcePlayerId, targetPlayerId, leagueId);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Merge players error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.leagues.renamePlayer.path, requireAuth, async (req, res) => {
    try {
      const leagueId = Number(req.params.id);
      const { playerId, newName } = api.leagues.renamePlayer.input.parse(req.body);
      const userId = (req.user as any).claims.sub;

      const league = await storage.getLeague(leagueId);
      if (!league) return res.status(404).json({ message: "League not found" });
      if (league.creatorId !== userId) return res.status(401).json({ message: "Only the league creator can rename players" });

      const player = await storage.getLeaguePlayer(playerId);
      if (!player || player.leagueId !== leagueId) return res.status(404).json({ message: "Player not found in this league" });

      const trimmedName = newName.trim();
      if (!trimmedName) return res.status(400).json({ message: "Name cannot be empty" });

      const existing = await storage.getLeaguePlayerByName(leagueId, trimmedName);
      if (existing && existing.id !== playerId) return res.status(400).json({ message: "A player with that name already exists in this league" });

      const updated = await storage.renameLeaguePlayer(playerId, trimmedName, leagueId);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (isUniqueViolation(err)) return res.status(400).json({ message: "A player with that name already exists in this league." });
      console.error("Rename player error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.leagues.deletePlayer.path, requireAuth, async (req, res) => {
    try {
      const leagueId = Number(req.params.id);
      const { playerId } = api.leagues.deletePlayer.input.parse(req.body);
      const userId = (req.user as any).claims.sub;

      const league = await storage.getLeague(leagueId);
      if (!league) return res.status(404).json({ message: "League not found" });
      if (league.creatorId !== userId) return res.status(401).json({ message: "Only the league creator can delete players" });

      const player = await storage.getLeaguePlayer(playerId);
      if (!player || player.leagueId !== leagueId) return res.status(404).json({ message: "Player not found in this league" });

      await storage.deleteLeaguePlayerWithData(playerId, leagueId);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Delete player error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.delete(api.leagues.kickMember.path, requireAuth, async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      const targetUserId = req.params.userId;
      const requesterId = (req.user as any).claims.sub;

      const league = await storage.getLeague(leagueId);
      if (!league) return res.status(404).json({ message: "League not found" });

      if (league.creatorId !== requesterId) {
        return res.status(401).json({ message: "Only the league creator can remove members" });
      }

      if (targetUserId === requesterId) {
        return res.status(400).json({ message: "You cannot kick yourself from the league" });
      }

      const isMember = await storage.isLeagueMember(leagueId, targetUserId);
      if (!isMember) return res.status(404).json({ message: "User is not a member of this league" });

      await storage.kickLeagueMember(leagueId, targetUserId);
      res.json({ success: true });
    } catch (err) {
      console.error("Kick member error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.delete(api.leagues.leave.path, requireAuth, async (req, res) => {
    try {
      const leagueId = Number(req.params.id);
      const userId = (req.user as any).claims.sub;

      const league = await storage.getLeague(leagueId);
      if (!league) return res.status(404).json({ message: "League not found" });

      if (league.creatorId === userId) {
        return res.status(400).json({ message: "The creator cannot leave the league. You must delete it or transfer ownership." });
      }

      const isMember = await storage.isLeagueMember(leagueId, userId);
      if (!isMember) return res.status(400).json({ message: "You are not a member of this league" });

      await storage.removeLeagueMember(leagueId, userId);
      res.json({ success: true });
    } catch (err) {
      console.error("Leave league error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.delete(api.leagues.delete.path, requireAuth, async (req, res) => {
    try {
      const leagueId = Number(req.params.id);
      const userId = (req.user as any).claims.sub;

      const league = await storage.getLeague(leagueId);
      if (!league) return res.status(404).json({ message: "League not found" });

      if (league.creatorId !== userId) {
        return res.status(401).json({ message: "Only the league creator can delete the league" });
      }

      await storage.deleteLeague(leagueId);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete league error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // League sessions endpoint
  app.get('/api/leagues/:id/sessions', requireAuth, async (req, res) => {
    const leagueId = Number(req.params.id);
    const userId = (req.user as any).claims.sub;
    const isMember = await storage.isLeagueMember(leagueId, userId);
    if (!isMember) return res.status(401).json({ message: "Not a member of this league" });
    const sessions = await storage.getLeagueSessions(leagueId);
    res.json(sessions);
  });

  // ==================== SESSIONS ====================

  app.post(api.sessions.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.sessions.create.input.parse(req.body);
      const hostId = (req.user as any).claims.sub;
      const code = randomBytes(3).toString('hex').toUpperCase();

      const session = await storage.createSession({
        ...input,
        hostId,
        code,
      });

      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.sessions.list.path, requireAuth, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const sessions = await storage.getUserSessions(userId);
    res.json(sessions);
  });

  app.get(api.sessions.get.path, async (req, res) => {
    const sessionId = Number(req.params.id);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const players = await storage.getSessionPlayers(sessionId);
    const txns = await storage.getSessionTransactions(sessionId);

    const isImported = session.config && (session.config as any).source === 'import';

    if (isImported && players.length === 0 && session.leagueId) {
      const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
      const allResults = await storage.getLeagueGameResults(session.leagueId);
      const sessionResults = allResults.filter(r => {
        const resultDate = new Date(r.date).toISOString().split('T')[0];
        return resultDate === sessionDate;
      });

      const importedPlayers = sessionResults.map((r, idx) => ({
        id: -(idx + 1),
        sessionId,
        userId: r.userId,
        name: r.playerName,
        joinedAt: r.date,
        leftAt: null,
        status: 'cashed_out' as const,
        tournamentPlace: null,
        currentStack: 0,
        totalBuyIn: r.buyIn,
        totalCashOut: r.cashOut,
        netProfit: r.netProfit,
      }));

      return res.json({ session, players: importedPlayers, transactions: [] });
    }

    const playersWithStats = players.map(p => {
      const playerTransactions = txns.filter(t => t.playerId === p.id && t.status === 'approved');
      const totalBuyIn = playerTransactions.filter(t => t.type === 'buy_in').reduce((sum, t) => sum + t.amount, 0);
      const totalCashOut = playerTransactions.filter(t => t.type === 'cash_out').reduce((sum, t) => sum + t.amount, 0);
      return { ...p, totalBuyIn, totalCashOut, netProfit: totalCashOut - totalBuyIn };
    });

    res.json({ session, players: playersWithStats, transactions: txns });
  });

  app.post(api.sessions.join.path, async (req, res) => {
    try {
      const { code, name } = api.sessions.join.input.parse(req.body);
      const session = await storage.getSessionByCode(code.toUpperCase());
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.status === 'completed') return res.status(400).json({ message: "Session completed" });

      const userId = req.isAuthenticated() ? (req.user as any).claims.sub : undefined;
      let player;
      let isNewPlayer = false;
      if (userId) player = await storage.getPlayerBySessionAndUser(session.id, userId);
      if (!player) {
        const existingPlayers = await storage.getSessionPlayers(session.id);
        const nameExists = existingPlayers.some(
          p => p.name.toLowerCase().trim() === name.toLowerCase().trim()
        );
        if (nameExists) return res.status(400).json({ message: "Player is already in this session." });

        player = await storage.addPlayer({ sessionId: session.id, name, userId });
        isNewPlayer = true;
      }

      if (isNewPlayer && session.defaultBuyIn && session.defaultBuyIn > 0) {
        await storage.addTransaction({
          sessionId: session.id,
          playerId: player.id,
          type: 'buy_in',
          amount: session.defaultBuyIn,
          paymentMethod: 'cash',
          status: 'approved',
        });
      }

      res.json({ session, player });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.sessions.end.path, requireAuth, async (req, res) => {
    const sessionId = Number(req.params.id);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    const hostId = (req.user as any).claims.sub;
    if (session.hostId !== hostId) return res.status(401).json({ message: "Only host can end session" });

    const forceUnbalanced = req.body.forceUnbalanced === true;
    const adjustments: { playerId: number; amount: number }[] = req.body.adjustments ?? [];

    if (req.body.cashOuts) {
      for (const cashOut of req.body.cashOuts) {
        await storage.addTransaction({
          sessionId, playerId: cashOut.playerId, type: 'cash_out',
          amount: cashOut.amount, paymentMethod: 'cash', status: 'approved',
        });
      }
    }

    if (adjustments.length > 0 && session.type === 'cash') {
      for (const adj of adjustments) {
        if (adj.amount > 0) {
          await storage.addTransaction({
            sessionId, playerId: adj.playerId, type: 'cash_out',
            amount: adj.amount, paymentMethod: 'cash', status: 'approved',
          });
        } else if (adj.amount < 0) {
          const playerTx = (await storage.getSessionTransactions(sessionId))
            .filter(t => t.playerId === adj.playerId && t.type === 'cash_out' && t.status === 'approved')
            .sort((a, b) => b.amount - a.amount);
          let remaining = Math.abs(adj.amount);
          for (const tx of playerTx) {
            if (remaining <= 0) break;
            if (tx.amount <= remaining) {
              await storage.deleteTransaction(tx.id);
              remaining -= tx.amount;
            } else {
              await storage.updateTransaction(tx.id, { amount: tx.amount - remaining });
              remaining = 0;
            }
          }
        }
      }
    }

    if (session.type === 'cash' && !forceUnbalanced) {
      const preTx = await storage.getSessionTransactions(sessionId);
      const approvedPre = preTx.filter(t => t.status === 'approved');
      const preBuyIns = approvedPre.filter(t => t.type === 'buy_in').reduce((s, t) => s + t.amount, 0);
      const preCashOuts = approvedPre.filter(t => t.type === 'cash_out').reduce((s, t) => s + t.amount, 0);
      if (preBuyIns !== preCashOuts) {
        return res.status(400).json({
          message: "Ledger mismatch",
          totalBuyIns: preBuyIns,
          totalCashOuts: preCashOuts,
          difference: preBuyIns - preCashOuts,
        });
      }
    }

    if (session.type === 'tournament') {
      const allPlayers = await storage.getSessionPlayers(sessionId);
      const activePlayers = allPlayers.filter(p => p.status === 'active');

      if (activePlayers.length > 0) {
        const sortedByJoin = [...activePlayers].sort(
          (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
        );
        for (let i = 0; i < sortedByJoin.length; i++) {
          const place = sortedByJoin.length - i;
          if (place === 1) {
            await storage.updatePlayerTournamentPlace(sortedByJoin[i].id, 1);
          } else {
            await storage.bustPlayer(sortedByJoin[i].id, place);
          }
        }
      }

      const existingCashOuts = (await storage.getSessionTransactions(sessionId))
        .filter(t => t.type === 'cash_out' && t.status === 'approved');

      if (existingCashOuts.length === 0) {
        const allTx = await storage.getSessionTransactions(sessionId);
        const totalBuyIns = allTx
          .filter(t => t.type === 'buy_in' && t.status === 'approved')
          .reduce((sum, t) => sum + t.amount, 0);

        const config = session.config as any;
        const customPayouts = config?.customPayouts;
        const payoutStructure = config?.payoutStructure;
        const percentages: number[] = payoutStructure?.percentages ?? [100];

        const finalPlayers = await storage.getSessionPlayers(sessionId);
        for (const sp of finalPlayers) {
          let payout = 0;
          if (customPayouts && customPayouts[String(sp.id)] !== undefined) {
            payout = customPayouts[String(sp.id)];
          } else {
            const place = sp.tournamentPlace ?? 999;
            const pct = percentages[place - 1] ?? 0;
            payout = Math.round(totalBuyIns * pct / 100);
          }
          if (payout > 0) {
            await storage.addTransaction({
              sessionId, playerId: sp.id, type: 'cash_out',
              amount: payout, paymentMethod: 'cash', status: 'approved',
            });
          }
        }
      }
    }

    const updated = await storage.updateSessionStatus(sessionId, 'completed', new Date());

    if (session.type === 'cash') {
      const allTxForBalance = await storage.getSessionTransactions(sessionId);
      const approvedForBalance = allTxForBalance.filter(t => t.status === 'approved');
      const totalBuyIns = approvedForBalance.filter(t => t.type === 'buy_in').reduce((s, t) => s + t.amount, 0);
      const totalCashOuts = approvedForBalance.filter(t => t.type === 'cash_out').reduce((s, t) => s + t.amount, 0);
      if (totalBuyIns !== totalCashOuts) {
        await storage.flagSessionUnbalanced(sessionId, true);
      }
    }

    try {
      const players = await storage.getSessionPlayers(sessionId);
      const allTransactions = await storage.getSessionTransactions(sessionId);
      const approvedTx = allTransactions.filter(t => t.status === 'approved');

      for (const player of players) {
        const playerTx = approvedTx.filter(t => t.playerId === player.id);
        const buyIn = playerTx.filter(t => t.type === 'buy_in').reduce((sum, t) => sum + t.amount, 0);
        const cashOut = playerTx.filter(t => t.type === 'cash_out').reduce((sum, t) => sum + t.amount, 0);

        if (buyIn > 0 || cashOut > 0) {
          await storage.addGameResult({
            userId: player.userId || hostId,
            leagueId: session.leagueId ?? undefined,
            sessionId,
            playerName: player.name,
            date: updated.endTime || new Date(),
            buyIn,
            cashOut,
            netProfit: cashOut - buyIn,
          });

          if (session.leagueId) {
            const existingPlayers = await storage.getLeaguePlayers(session.leagueId);
            const normalizedName = player.name.toLowerCase().trim();
            const exists = existingPlayers.some(p => p.name.toLowerCase().trim() === normalizedName);
            if (!exists) {
              try {
                await storage.addLeaguePlayer({
                  leagueId: session.leagueId,
                  name: player.name,
                  claimedByUserId: player.userId,
                });
              } catch (innerErr) {
                if (!isUniqueViolation(innerErr)) throw innerErr;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error generating game results from session:", err);
    }

    res.json(updated);
  });

  app.delete('/api/sessions/:id', requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.hostId !== (req.user as any).claims.sub) return res.status(401).json({ message: "Only the host can delete sessions" });
      await storage.deleteSession(sessionId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.sessions.addPlayer.path, requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const input = api.sessions.addPlayer.input.parse(req.body);
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.hostId !== (req.user as any).claims.sub) return res.status(401).json({ message: "Only the host can add players manually" });

      const existingPlayers = await storage.getSessionPlayers(sessionId);
      const nameExists = existingPlayers.some(
        p => p.name.toLowerCase().trim() === input.name.toLowerCase().trim()
      );
      if (nameExists) return res.status(400).json({ message: "Player is already in this session." });

      const player = await storage.addPlayer({ sessionId, name: input.name, userId: null });

      if (session.defaultBuyIn && session.defaultBuyIn > 0) {
        await storage.addTransaction({
          sessionId,
          playerId: player.id,
          type: 'buy_in',
          amount: session.defaultBuyIn,
          paymentMethod: 'cash',
          status: 'approved',
        });
      }

      res.status(201).json(player);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (isUniqueViolation(err)) return res.status(400).json({ message: "Player is already in this session." });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post('/api/sessions/:id/players/:playerId/cashout', requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const playerId = Number(req.params.playerId);
      const { amount } = z.object({ amount: z.number().min(0).lt(100000) }).parse(req.body);

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.hostId !== (req.user as any).claims.sub) return res.status(401).json({ message: "Only the host can cash out players" });

      const player = await storage.getPlayer(playerId);
      if (!player || player.sessionId !== sessionId) return res.status(404).json({ message: "Player not found in this session" });

      const transaction = await storage.addTransaction({
        sessionId, playerId, type: 'cash_out',
        amount, paymentMethod: 'cash', status: 'approved',
      });

      const updatedPlayer = await storage.updatePlayerStatus(playerId, 'cashed_out');

      res.json({ transaction, player: updatedPlayer });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ==================== TOURNAMENT: BUST PLAYER ====================

  app.post('/api/sessions/:id/players/:playerId/bust', requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const playerId = Number(req.params.playerId);

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.hostId !== (req.user as any).claims.sub) return res.status(401).json({ message: "Only the host can bust players" });
      if (session.type !== 'tournament') return res.status(400).json({ message: "Bust is only available in tournaments" });
      if (session.status !== 'active') return res.status(400).json({ message: "Session is not active" });

      const player = await storage.getPlayer(playerId);
      if (!player || player.sessionId !== sessionId) return res.status(404).json({ message: "Player not found in this session" });
      if (player.status !== 'active') return res.status(400).json({ message: "Player is not active" });

      const allPlayers = await storage.getSessionPlayers(sessionId);
      const activePlayers = allPlayers.filter(p => p.status === 'active');
      const placement = activePlayers.length;

      const updated = await storage.bustPlayer(playerId, placement);

      const remainingActive = activePlayers.filter(p => p.id !== playerId);
      if (remainingActive.length === 1) {
        const freshSession = await storage.getSession(sessionId);
        if (!freshSession || freshSession.status !== 'active') {
          return res.json(updated);
        }

        const winner = remainingActive[0];
        await storage.updatePlayerTournamentPlace(winner.id, 1);

        const existingCashOuts = (await storage.getSessionTransactions(sessionId))
          .filter(t => t.type === 'cash_out' && t.status === 'approved');
        if (existingCashOuts.length === 0) {
          const allTx = await storage.getSessionTransactions(sessionId);
          const totalBuyIns = allTx
            .filter(t => t.type === 'buy_in' && t.status === 'approved')
            .reduce((sum, t) => sum + t.amount, 0);

          const config = freshSession.config as any;
          const customPayouts = config?.customPayouts;
          const payoutStructure = config?.payoutStructure;
          const percentages: number[] = payoutStructure?.percentages ?? [100];

          const allSessionPlayers = await storage.getSessionPlayers(sessionId);
          for (const sp of allSessionPlayers) {
            let payout = 0;
            if (customPayouts && customPayouts[String(sp.id)] !== undefined) {
              payout = customPayouts[String(sp.id)];
            } else {
              const place = sp.tournamentPlace ?? 999;
              const pct = percentages[place - 1] ?? 0;
              payout = Math.round(totalBuyIns * pct / 100);
            }
            if (payout > 0) {
              await storage.addTransaction({
                sessionId, playerId: sp.id, type: 'cash_out',
                amount: payout, paymentMethod: 'cash', status: 'approved',
              });
            }
          }
        }

        await storage.updateSessionStatus(sessionId, 'completed', new Date());

        const updatedSession = await storage.getSession(sessionId);
        try {
          const finalPlayers = await storage.getSessionPlayers(sessionId);
          const finalTx = await storage.getSessionTransactions(sessionId);
          const approvedTx = finalTx.filter(t => t.status === 'approved');
          const hostId = freshSession.hostId;

          for (const fp of finalPlayers) {
            const playerTx = approvedTx.filter(t => t.playerId === fp.id);
            const buyIn = playerTx.filter(t => t.type === 'buy_in').reduce((sum, t) => sum + t.amount, 0);
            const cashOut = playerTx.filter(t => t.type === 'cash_out').reduce((sum, t) => sum + t.amount, 0);

            if (buyIn > 0 || cashOut > 0) {
              await storage.addGameResult({
                userId: fp.userId || hostId,
                leagueId: freshSession.leagueId ?? undefined,
                sessionId,
                playerName: fp.name,
                date: updatedSession?.endTime || new Date(),
                buyIn,
                cashOut,
                netProfit: cashOut - buyIn,
              });

              if (freshSession.leagueId) {
                const existingPlayers = await storage.getLeaguePlayers(freshSession.leagueId);
                const normalizedName = fp.name.toLowerCase().trim();
                const exists = existingPlayers.some(p => p.name.toLowerCase().trim() === normalizedName);
                if (!exists) {
                  try {
                    await storage.addLeaguePlayer({
                      leagueId: freshSession.leagueId,
                      name: fp.name,
                      claimedByUserId: fp.userId,
                    });
                  } catch (innerErr) {
                    if (!isUniqueViolation(innerErr)) throw innerErr;
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("Error generating game results from auto-finished tournament:", err);
        }

        res.json({ ...updated, autoFinished: true });
      } else {
        res.json(updated);
      }
    } catch (err) {
      console.error("Bust player error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ==================== CUSTOM CHOP ====================

  app.put('/api/sessions/:id/custom-chop', requireAuth, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const { payouts } = req.body as { payouts: Record<string, number> };

      if (!payouts || typeof payouts !== 'object') {
        return res.status(400).json({ message: "payouts object is required" });
      }

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.hostId !== (req.user as any).claims.sub) return res.status(401).json({ message: "Only the host can set custom payouts" });
      if (session.type !== 'tournament') return res.status(400).json({ message: "Custom chop is only available for tournaments" });

      const allPlayers = await storage.getSessionPlayers(sessionId);
      const allTx = await storage.getSessionTransactions(sessionId);
      const totalBuyIns = allTx
        .filter(t => t.type === 'buy_in' && t.status === 'approved')
        .reduce((sum, t) => sum + t.amount, 0);
      const payoutTotal = Object.values(payouts).reduce((sum, v) => sum + v, 0);

      if (payoutTotal !== totalBuyIns) {
        return res.status(400).json({ message: `Payouts total (${payoutTotal}) must equal prize pool (${totalBuyIns})` });
      }

      const existingConfig = (session.config as Record<string, unknown>) || {};
      const updated = await storage.updateSessionConfig(sessionId, {
        ...existingConfig,
        customPayouts: payouts,
      });

      res.json(updated);
    } catch (err) {
      console.error("Custom chop error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ==================== TRANSACTIONS ====================

  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const input = api.transactions.create.input.parse(req.body);
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const userId = req.isAuthenticated() ? (req.user as any).claims.sub : null;
      const isHost = userId && userId === session.hostId;
      const status = isHost ? 'approved' : 'pending';

      const transaction = await storage.addTransaction({ sessionId, ...input, paymentMethod: 'cash', status });
      res.status(201).json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.patch(api.transactions.updateStatus.path, requireAuth, async (req, res) => {
    try {
      const transactionId = Number(req.params.id);
      const input = api.transactions.updateStatus.input.parse(req.body);
      const updated = await storage.updateTransactionStatus(transactionId, input.status);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.patch(api.transactions.update.path, requireAuth, async (req, res) => {
    try {
      const transactionId = Number(req.params.id);
      const input = api.transactions.update.input.parse(req.body);
      const tx = await storage.getTransaction(transactionId);
      if (!tx) return res.status(404).json({ message: "Transaction not found" });
      const session = await storage.getSession(tx.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.hostId !== (req.user as any).claims.sub) return res.status(401).json({ message: "Only the host can edit transactions" });

      const updated = await storage.updateTransaction(transactionId, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.delete(api.transactions.delete.path, requireAuth, async (req, res) => {
    try {
      const transactionId = Number(req.params.id);
      const tx = await storage.getTransaction(transactionId);
      if (!tx) return res.status(404).json({ message: "Transaction not found" });
      const session = await storage.getSession(tx.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.hostId !== (req.user as any).claims.sub) return res.status(401).json({ message: "Only the host can delete transactions" });
      await storage.deleteTransaction(transactionId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // ==================== STATS ====================

  app.get(api.stats.personal.path, requireAuth, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const userLeagues = await storage.getUserLeagues(userId);

    let allResults: Array<{ date: Date; profit: number; buyIn: number; cashOut: number; leagueName: string; sessionId: number | null }> = [];

    for (const league of userLeagues) {
      const results = await storage.getLeagueGameResults(league.id);
      const leaguePlayers = await storage.getLeaguePlayers(league.id);
      const claimedPlayer = leaguePlayers.find(p => p.claimedByUserId === userId);
      if (!claimedPlayer) continue;

      const playerResults = results.filter(r =>
        r.playerName.toLowerCase().trim() === claimedPlayer.name.toLowerCase().trim()
      );

      for (const r of playerResults) {
        allResults.push({
          date: new Date(r.date),
          profit: r.netProfit,
          buyIn: r.buyIn,
          cashOut: r.cashOut,
          leagueName: league.name,
          sessionId: r.sessionId ?? null,
        });
      }
    }

    allResults.sort((a, b) => a.date.getTime() - b.date.getTime());

    let cumulative = 0;
    const bankrollHistory = allResults.map(r => {
      cumulative += r.profit;
      return {
        date: r.date.toISOString().split('T')[0],
        profit: r.profit,
        cumulative,
      };
    });

    const totalProfit = allResults.reduce((sum, r) => sum + r.profit, 0);
    const totalGames = new Set(allResults.map(r => r.date.toISOString().split('T')[0])).size;
    const totalBuyIn = allResults.reduce((sum, r) => sum + r.buyIn, 0);
    const totalCashOut = allResults.reduce((sum, r) => sum + r.cashOut, 0);
    const roi = totalBuyIn > 0 ? Math.round((totalProfit / totalBuyIn) * 100) : 0;

    const recentGames = [...allResults].reverse().map(r => ({
      date: r.date.toISOString().split('T')[0],
      leagueName: r.leagueName,
      profit: r.profit,
      sessionId: r.sessionId,
    }));

    res.json({ totalGames, totalProfit, totalBuyIn, totalCashOut, roi, bankrollHistory, recentGames });
  });

  app.get(api.stats.league.path, requireAuth, async (req, res) => {
    const leagueId = Number(req.params.leagueId);
    const userId = (req.user as any).claims.sub;
    const isMember = await storage.isLeagueMember(leagueId, userId);
    if (!isMember) return res.status(401).json({ message: "Not a member" });

    const importedResults = await storage.getLeagueGameResults(leagueId);
    const sortedResults = [...importedResults].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const totalMoneyWagered = importedResults.reduce((sum, r) => sum + r.buyIn, 0);
    const totalPot = importedResults.reduce((sum, r) => sum + r.cashOut, 0);
    const totalPlayerEntries = importedResults.length;
    const leagueSessionsList = await storage.getLeagueSessions(leagueId);
    const totalGames = leagueSessionsList.filter(s => s.status === 'completed').length;

    const playerMap = new Map<string, Map<string, number>>();
    const playerBuyInMap = new Map<string, number>();
    const playerSessionProfits = new Map<string, number[]>();

    for (const r of sortedResults) {
      const name = r.playerName;
      const dateStr = new Date(r.date).toISOString().split('T')[0];
      if (!playerMap.has(name)) playerMap.set(name, new Map());
      const dateMap = playerMap.get(name)!;
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + r.netProfit);

      playerBuyInMap.set(name, (playerBuyInMap.get(name) || 0) + r.buyIn);
      if (!playerSessionProfits.has(name)) playerSessionProfits.set(name, []);
      playerSessionProfits.get(name)!.push(r.netProfit);
    }

    const playerProfitHistory = Array.from(playerMap.entries()).map(([playerName, dateMap]) => {
      const sortedDates = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      let cum = 0;
      const points = sortedDates.map(([date, profit]) => {
        cum += profit;
        return { date, cumulative: cum, profit };
      });
      return { playerName, totalProfit: cum, points };
    });

    const playerAnalytics = Array.from(playerMap.entries()).map(([playerName, dateMap]) => {
      const gamesPlayed = dateMap.size;
      const totalBuyIn = playerBuyInMap.get(playerName) || 0;
      const profits = playerSessionProfits.get(playerName) || [];
      const totalProfit = profits.reduce((s, p) => s + p, 0);
      const roi = totalBuyIn > 0 ? Math.round((totalProfit / totalBuyIn) * 100) : 0;
      const biggestWin = profits.length > 0 ? Math.max(...profits, 0) : 0;
      const biggestLoss = profits.length > 0 ? Math.min(...profits, 0) : 0;
      return { playerName, gamesPlayed, totalBuyIn, totalProfit, roi, biggestWin, biggestLoss };
    });

    const sessionDateMap = new Map<string, number>();
    for (const r of sortedResults) {
      const dateStr = new Date(r.date).toISOString().split('T')[0];
      sessionDateMap.set(dateStr, (sessionDateMap.get(dateStr) || 0) + r.buyIn);
    }
    const sessionHistory = Array.from(sessionDateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, totalWagered]) => ({ date, totalWagered }));

    res.json({ totalGames, totalMoneyWagered, totalPot, totalPlayerEntries, playerProfitHistory, playerAnalytics, sessionHistory });
  });

  // Keep old stats endpoint for backward compat (redirects to league-based)
  app.get(api.stats.get.path, requireAuth, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const importedResults = await storage.getGameResults(userId);
    const sessions = await storage.getUserSessions(userId);

    const sortedResults = [...importedResults].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let cumulative = 0;
    const bankrollHistory = sortedResults.map(r => {
      cumulative += r.netProfit;
      return {
        date: new Date(r.date).toISOString().split('T')[0],
        profit: r.netProfit,
        cumulative,
      };
    });

    const totalProfit = importedResults.reduce((sum, r) => sum + r.netProfit, 0);
    const totalBuyIn = importedResults.reduce((sum, r) => sum + r.buyIn, 0);
    const roi = totalBuyIn > 0 ? Math.round((totalProfit / totalBuyIn) * 100) : 0;

    const playerMap = new Map<string, Map<string, number>>();
    for (const r of sortedResults) {
      const name = r.playerName;
      const dateStr = new Date(r.date).toISOString().split('T')[0];
      if (!playerMap.has(name)) playerMap.set(name, new Map());
      const dateMap = playerMap.get(name)!;
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + r.netProfit);
    }

    const playerProfitHistory = Array.from(playerMap.entries()).map(([playerName, dateMap]) => {
      const sortedDates = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      let cum = 0;
      const points = sortedDates.map(([date, profit]) => {
        cum += profit;
        return { date, cumulative: cum, profit };
      });
      return { playerName, totalProfit: cum, points };
    });

    res.json({
      totalGames: sessions.length + new Set(importedResults.map(r => new Date(r.date).toISOString().split('T')[0])).size,
      totalProfit, roi, bankrollHistory, playerProfitHistory,
    });
  });

  // ==================== DATA MIGRATION ====================

  app.post('/api/migrate-to-league', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { leagueId } = req.body;

      if (!leagueId) return res.status(400).json({ message: "leagueId required" });

      const league = await storage.getLeague(leagueId);
      if (!league) return res.status(404).json({ message: "League not found" });
      if (league.creatorId !== userId) return res.status(401).json({ message: "Only the creator can migrate data" });

      const existingResults = await storage.getGameResults(userId);
      const unassigned = existingResults.filter(r => !r.leagueId);

      if (unassigned.length === 0) {
        return res.json({ migrated: 0, playersCreated: 0 });
      }

      const existingPlayers = await storage.getLeaguePlayers(leagueId);
      const playerNameSet = new Set(existingPlayers.map(p => p.name.toLowerCase().trim()));
      let playersCreated = 0;

      const uniqueNames = Array.from(new Set(unassigned.map(r => r.playerName.trim())));
      for (const name of uniqueNames) {
        if (!playerNameSet.has(name.toLowerCase())) {
          try {
            await storage.addLeaguePlayer({ leagueId, name, claimedByUserId: null });
            playerNameSet.add(name.toLowerCase());
            playersCreated++;
          } catch (innerErr) {
            if (!isUniqueViolation(innerErr)) throw innerErr;
            playerNameSet.add(name.toLowerCase());
          }
        }
      }

      const { db: database } = await import("./db");
      const { gameResults } = await import("@shared/schema");
      const { eq: eqOp, inArray: inArrayOp } = await import("drizzle-orm");

      const ids = unassigned.map(r => r.id);
      const BATCH_SIZE = 500;
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        await database.update(gameResults)
          .set({ leagueId })
          .where(inArrayOp(gameResults.id, batch));
      }

      const uniqueDates = Array.from(new Set(unassigned.map(r => new Date(r.date).toISOString().split('T')[0])));
      const existingSessions = await storage.getLeagueSessions(leagueId);
      const existingSessionDates = new Set(existingSessions.map(s => new Date(s.startTime).toISOString().split('T')[0]));
      let sessionsCreated = 0;
      for (const dateStr of uniqueDates) {
        if (!existingSessionDates.has(dateStr)) {
          const code = randomBytes(3).toString('hex').toUpperCase();
          const sessionDate = new Date(dateStr + 'T12:00:00Z');
          await storage.createSession({
            hostId: userId, leagueId, type: 'cash',
            config: { source: 'import', importDate: dateStr },
            code, startTime: sessionDate, status: 'completed', endTime: sessionDate,
          } as any);
          sessionsCreated++;
        }
      }

      res.json({ migrated: unassigned.length, playersCreated, sessionsCreated });
    } catch (err: any) {
      console.error("Migration error:", err);
      res.status(500).json({ message: err.message || "Migration failed" });
    }
  });

  // ==================== IMPORT ====================

  app.post(api.import.upload.path, requireAuth, upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const userId = (req.user as any).claims.sub;
      const ext = path.extname(file.originalname).toLowerCase();
      let rows: Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> = [];
      let rawText: string | undefined;

      if (ext === '.csv') {
        rows = parseCSV(file.buffer.toString('utf-8'));
      } else if (ext === '.xlsx' || ext === '.xls') {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = mapSpreadsheetData(XLSX.utils.sheet_to_json<any>(sheet));
      } else if (ext === '.pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        const pdfData = await pdfParse(file.buffer);
        rawText = pdfData.text || '';
        rows = parsePokerPdfText(rawText!);
        if (rows.length === 0) rows = tryParseText(rawText!);
      } else if (ext === '.docx' || ext === '.doc') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        rawText = result.value;
        rows = parsePokerPdfText(rawText);
        if (rows.length === 0) rows = tryParseText(rawText);
      } else if (ext === '.txt') {
        rawText = file.buffer.toString('utf-8');
        rows = parsePokerPdfText(rawText);
        if (rows.length === 0) rows = tryParseText(rawText);
      }

      const leagueId = req.body?.leagueId ? Number(req.body.leagueId) : null;
      let existingNames: string[] = [];
      
      if (leagueId) {
        const leaguePlayers = await storage.getLeaguePlayers(leagueId);
        existingNames = leaguePlayers.map(p => p.name.trim().toLowerCase());
      } else {
        const existingResults = await storage.getGameResults(userId);
        existingNames = Array.from(new Set(existingResults.map(r => r.playerName.trim().toLowerCase())));
      }

      res.json({ rows, rawText, existingNames });
    } catch (err: any) {
      console.error("Import upload error:", err);
      res.status(400).json({ message: err.message || "Failed to parse file" });
    }
  });

  app.post(api.import.save.path, requireAuth, async (req, res) => {
    try {
      const { rows, leagueId } = api.import.save.input.parse(req.body);
      const userId = (req.user as any).claims.sub;

      if (!rows || rows.length === 0) return res.status(400).json({ message: "No data to import" });

      const league = await storage.getLeague(leagueId);
      if (!league) return res.status(400).json({ message: "League not found" });

      const existingResults = await storage.getLeagueGameResults(leagueId);
      const existingSet = new Set<string>();
      for (const r of existingResults) {
        existingSet.add(`${r.playerName.trim().toLowerCase()}|${new Date(r.date).toISOString().split('T')[0]}|${r.buyIn}|${r.cashOut}`);
      }

      const existingPlayers = await storage.getLeaguePlayers(leagueId);
      const playerNameSet = new Set(existingPlayers.map(p => p.name.toLowerCase().trim()));

      const existingSessions = await storage.getLeagueSessions(leagueId);
      const sessionDateMap = new Map<string, boolean>();
      for (const s of existingSessions) {
        const dateStr = new Date(s.startTime).toISOString().split('T')[0];
        sessionDateMap.set(dateStr, true);
      }

      const playerNames = new Set<string>();
      let imported = 0;
      let skipped = 0;
      let sessionsCreated = 0;

      for (const row of rows) {
        const dateVal = new Date(row.date);
        if (isNaN(dateVal.getTime())) continue;

        const buyIn = Math.round(Number(row.buyIn) || 0);
        const cashOut = Math.round(Number(row.cashOut) || 0);
        const netProfit = cashOut - buyIn;
        const normalizedName = row.playerName.trim();

        const dupeKey = `${normalizedName.toLowerCase()}|${dateVal.toISOString().split('T')[0]}|${buyIn}|${cashOut}`;
        if (existingSet.has(dupeKey)) { skipped++; continue; }

        const dateStr = dateVal.toISOString().split('T')[0];
        if (!sessionDateMap.has(dateStr)) {
          const code = randomBytes(3).toString('hex').toUpperCase();
          const sessionDate = new Date(dateStr + 'T12:00:00Z');
          await storage.createSession({
            hostId: userId,
            leagueId,
            type: 'cash',
            config: { source: 'import', importDate: dateStr },
            code,
            startTime: sessionDate,
            status: 'completed',
            endTime: sessionDate,
          } as any);
          sessionDateMap.set(dateStr, true);
          sessionsCreated++;
        }

        if (!playerNameSet.has(normalizedName.toLowerCase())) {
          try {
            await storage.addLeaguePlayer({ leagueId, name: normalizedName, claimedByUserId: null });
            playerNameSet.add(normalizedName.toLowerCase());
          } catch (innerErr) {
            if (!isUniqueViolation(innerErr)) throw innerErr;
            playerNameSet.add(normalizedName.toLowerCase());
          }
        }

        playerNames.add(normalizedName);
        existingSet.add(dupeKey);

        await storage.addGameResult({
          userId, leagueId, playerName: normalizedName,
          date: dateVal, buyIn, cashOut, netProfit,
        });
        imported++;
      }

      res.status(201).json({ imported, skipped, sessionsCreated, players: Array.from(playerNames) });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Import save error:", err);
      res.status(400).json({ message: err.message || "Failed to save data" });
    }
  });

  app.get(api.import.history.path, requireAuth, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const results = await storage.getGameResults(userId);
    res.json(results);
  });

  app.post('/api/leagues/:leagueId/backfill-sessions', requireAuth, async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      const userId = (req.user as any).claims.sub;
      const isMember = await storage.isLeagueMember(leagueId, userId);
      if (!isMember) return res.status(401).json({ message: "Not a member" });

      const gameResults = await storage.getLeagueGameResults(leagueId);
      const uniqueDates = Array.from(new Set(gameResults.map(r => new Date(r.date).toISOString().split('T')[0])));

      const existingSessions = await storage.getLeagueSessions(leagueId);
      const existingSessionDates = new Set(
        existingSessions.map(s => new Date(s.startTime).toISOString().split('T')[0])
      );

      let created = 0;
      for (const dateStr of uniqueDates) {
        if (!existingSessionDates.has(dateStr)) {
          const code = randomBytes(3).toString('hex').toUpperCase();
          const sessionDate = new Date(dateStr + 'T12:00:00Z');
          await storage.createSession({
            hostId: userId,
            leagueId,
            type: 'cash',
            config: { source: 'import', importDate: dateStr },
            code,
            startTime: sessionDate,
            status: 'completed',
            endTime: sessionDate,
          } as any);
          created++;
        }
      }

      res.json({ created, totalUniqueDates: uniqueDates.length, existingSessionsBefore: existingSessions.length });
    } catch (err: any) {
      console.error("Backfill sessions error:", err);
      res.status(500).json({ message: err.message || "Failed to backfill sessions" });
    }
  });

  return httpServer;
}

// ==================== PARSERS ====================

function parseCSV(content: string): Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  const dateIdx = header.findIndex(h => h.includes('date'));
  const nameIdx = header.findIndex(h => h.includes('player') || h.includes('name'));
  const buyInIdx = header.findIndex(h => h.includes('buy') || h.includes('buyin') || h.includes('buy_in') || h.includes('buy-in'));
  const cashOutIdx = header.findIndex(h => h.includes('cash') || h.includes('cashout') || h.includes('cash_out') || h.includes('cash-out') || h.includes('payout') || h.includes('winnings'));

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    return {
      date: cols[dateIdx >= 0 ? dateIdx : 0] || '',
      playerName: cols[nameIdx >= 0 ? nameIdx : 1] || 'Unknown',
      buyIn: parseFloat(cols[buyInIdx >= 0 ? buyInIdx : 2]?.replace(/[$€£,]/g, '') || '0') || 0,
      cashOut: parseFloat(cols[cashOutIdx >= 0 ? cashOutIdx : 3]?.replace(/[$€£,]/g, '') || '0') || 0,
    };
  }).filter(r => r.date && r.playerName);
}

function mapSpreadsheetData(data: any[]): Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> {
  return data.map(row => {
    const keys = Object.keys(row);
    const findKey = (patterns: string[]) => keys.find(k => patterns.some(p => k.toLowerCase().includes(p)));

    const dateKey = findKey(['date', 'day', 'when']) || keys[0];
    const nameKey = findKey(['player', 'name', 'who']) || keys[1];
    const buyInKey = findKey(['buy', 'buyin', 'buy_in', 'buy-in', 'cost', 'entry']) || keys[2];
    const cashOutKey = findKey(['cash', 'cashout', 'cash_out', 'payout', 'winning', 'result', 'out']) || keys[3];

    let dateVal = row[dateKey];
    if (typeof dateVal === 'number') {
      const epoch = new Date((dateVal - 25569) * 86400 * 1000);
      dateVal = epoch.toISOString().split('T')[0];
    }

    return {
      date: String(dateVal || ''),
      playerName: String(row[nameKey] || 'Unknown'),
      buyIn: parseFloat(String(row[buyInKey] || 0).replace(/[$€£,]/g, '')) || 0,
      cashOut: parseFloat(String(row[cashOutKey] || 0).replace(/[$€£,]/g, '')) || 0,
    };
  }).filter(r => r.date && r.playerName);
}

function parsePokerPdfText(text: string): Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> {
  const rows: Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const dateHeaderPattern = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/;
  const entryWithEndstand = /^(.+?)\s+([\d.,]+)\s*[€$£]?\s+[Ee]ndstand\s*:?\s*([\d.,]+)\s*[€$£]?\s*$/;
  const entryBuyinCashout = /^(.+?)\s+([\d.,]+)\s*[€$£]\s+([\d.,]+)\s*[€$£]?\s*$/;
  const entrySimple = /^([A-Za-zÀ-ž]+(?:\s+[A-Za-zÀ-ž]+)*)\s+([\d.,]+)\s*[€$£]?\s*$/;

  let currentDate = '';

  for (const line of lines) {
    const dateMatch = line.match(dateHeaderPattern);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      let year = dateMatch[3];
      if (year.length === 2) year = '20' + year;
      currentDate = `${year}-${month}-${day}`;
      continue;
    }

    if (!currentDate) continue;

    const parseNum = (s: string) => parseFloat(s.replace(/,/g, '.')) || 0;

    let match = line.match(entryWithEndstand);
    if (match) {
      const name = match[1].trim();
      const buyIn = parseNum(match[2]);
      const cashOut = parseNum(match[3]);
      if (name && (buyIn > 0 || cashOut > 0)) rows.push({ date: currentDate, playerName: name, buyIn, cashOut });
      continue;
    }

    match = line.match(entryBuyinCashout);
    if (match) {
      const name = match[1].trim();
      const buyIn = parseNum(match[2]);
      const cashOut = parseNum(match[3]);
      if (name && (buyIn > 0 || cashOut > 0)) rows.push({ date: currentDate, playerName: name, buyIn, cashOut });
      continue;
    }

    match = line.match(entrySimple);
    if (match) {
      const name = match[1].trim();
      const buyIn = parseNum(match[2]);
      if (name && buyIn > 0) rows.push({ date: currentDate, playerName: name, buyIn, cashOut: 0 });
    }
  }

  return rows;
}

function tryParseText(text: string): Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> {
  const rows: Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{2,4})/i;
  const numberPattern = /[$€£]?\s*[\d,]+\.?\d*/g;

  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    const afterDate = line.substring(line.indexOf(dateStr) + dateStr.length);
    const numbers = Array.from(afterDate.matchAll(numberPattern))
      .map(m => parseFloat(m[0].replace(/[$€£,\s]/g, '')))
      .filter(n => !isNaN(n) && n > 0);
    if (numbers.length < 2) continue;

    const nameMatch = afterDate.match(/([A-Za-zÀ-ž][A-Za-zÀ-ž\s.'-]+)/);
    const playerName = nameMatch ? nameMatch[1].trim() : 'Unknown';

    rows.push({
      date: dateStr,
      playerName,
      buyIn: numbers[0],
      cashOut: numbers[1],
    });
  }

  return rows;
}
