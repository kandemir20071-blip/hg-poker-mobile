import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import multer from "multer";
import path from "path";

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
  // Setup Auth FIRST
  await setupAuth(app);
  registerAuthRoutes(app);

  // Helper to check auth
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // --- Sessions ---

  app.post(api.sessions.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.sessions.create.input.parse(req.body);
      const hostId = (req.user as any).claims.sub;
      const code = randomBytes(3).toString('hex').toUpperCase(); // 6 char code

      const session = await storage.createSession({
        ...input,
        hostId,
        code,
      });

      // Add host as a player automatically? Maybe not strictly required, but good UX if they are playing.
      // But maybe they are just hosting. Let's let them join explicitly if they want.

      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
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
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const players = await storage.getSessionPlayers(sessionId);
    const transactions = await storage.getSessionTransactions(sessionId);

    // Calculate derived stats for players
    const playersWithStats = players.map(p => {
      const playerTransactions = transactions.filter(t => t.playerId === p.id && t.status === 'approved');
      const totalBuyIn = playerTransactions
        .filter(t => t.type === 'buy_in')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalCashOut = playerTransactions
        .filter(t => t.type === 'cash_out')
        .reduce((sum, t) => sum + t.amount, 0);
      const netProfit = totalCashOut - totalBuyIn;

      return {
        ...p,
        totalBuyIn,
        totalCashOut,
        netProfit
      };
    });

    res.json({ session, players: playersWithStats, transactions });
  });

  app.post(api.sessions.join.path, async (req, res) => {
    try {
      const { code, name } = api.sessions.join.input.parse(req.body);
      const session = await storage.getSessionByCode(code.toUpperCase());
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (session.status === 'completed') {
        return res.status(400).json({ message: "Session completed" });
      }

      const userId = req.isAuthenticated() ? (req.user as any).claims.sub : undefined;

      // Check if already joined
      let player;
      if (userId) {
        player = await storage.getPlayerBySessionAndUser(session.id, userId);
      }
      
      // If not joined (or guest), create player
      if (!player) {
        player = await storage.addPlayer({
          sessionId: session.id,
          name,
          userId,
        });
      }

      res.json({ session, player });
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.sessions.end.path, requireAuth, async (req, res) => {
    const sessionId = Number(req.params.id);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    
    // Verify host
    if (session.hostId !== (req.user as any).claims.sub) {
      return res.status(401).json({ message: "Only host can end session" });
    }

    // Process final cashouts if provided
    if (req.body.cashOuts) {
      for (const cashOut of req.body.cashOuts) {
        await storage.addTransaction({
          sessionId,
          playerId: cashOut.playerId,
          type: 'cash_out',
          amount: cashOut.amount,
          paymentMethod: 'cash', // Default
          status: 'approved',
        });
      }
    }

    // Update status
    const updated = await storage.updateSessionStatus(sessionId, 'completed', new Date());
    res.json(updated);
  });

  // --- Transactions ---

  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const input = api.transactions.create.input.parse(req.body);
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      // If host is making the request, auto-approve. If guest/player, pending.
      // We need to check if the user is the host.
      const userId = req.isAuthenticated() ? (req.user as any).claims.sub : null;
      const isHost = userId && userId === session.hostId;
      const status = isHost ? 'approved' : 'pending';

      const transaction = await storage.addTransaction({
        sessionId,
        ...input,
        status,
      });

      res.status(201).json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.patch(api.transactions.updateStatus.path, requireAuth, async (req, res) => {
    try {
      const transactionId = Number(req.params.id);
      const input = api.transactions.updateStatus.input.parse(req.body);
      
      // TODO: Verify user is host of the session this transaction belongs to
      // For now, assume auth is enough for MVP, or we'd need to fetch tx -> session -> check host.
      
      const updated = await storage.updateTransactionStatus(transactionId, input.status);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // --- Stats ---

  app.get(api.stats.get.path, requireAuth, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const sessions = await storage.getUserSessions(userId);
    const importedResults = await storage.getGameResults(userId);
    
    // Build bankroll history from imported results
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
    
    res.json({
      totalGames: sessions.length + importedResults.length,
      totalProfit,
      roi,
      bankrollHistory,
    });
  });

  // --- Import ---

  app.post(api.import.upload.path, requireAuth, upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const ext = path.extname(file.originalname).toLowerCase();
      let rows: Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> = [];
      let rawText: string | undefined;

      if (ext === '.csv') {
        const content = file.buffer.toString('utf-8');
        rows = parseCSV(content);
      } else if (ext === '.xlsx' || ext === '.xls') {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any>(sheet);
        rows = mapSpreadsheetData(data);
      } else if (ext === '.pdf') {
        const pdfModule = await import('pdf-parse');
        const pdfParse = pdfModule.default || pdfModule;
        const pdfData = await pdfParse(file.buffer);
        rawText = pdfData.text;
        rows = tryParseText(rawText);
      } else if (ext === '.docx' || ext === '.doc') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        rawText = result.value;
        rows = tryParseText(rawText);
      } else if (ext === '.txt') {
        rawText = file.buffer.toString('utf-8');
        rows = tryParseText(rawText);
      }

      res.json({ rows, rawText });
    } catch (err: any) {
      console.error("Import upload error:", err);
      res.status(400).json({ message: err.message || "Failed to parse file" });
    }
  });

  app.post(api.import.save.path, requireAuth, async (req, res) => {
    try {
      const { rows } = api.import.save.input.parse(req.body);
      const userId = (req.user as any).claims.sub;

      if (!rows || rows.length === 0) {
        return res.status(400).json({ message: "No data to import" });
      }

      const playerNames = new Set<string>();

      for (const row of rows) {
        const dateVal = new Date(row.date);
        if (isNaN(dateVal.getTime())) continue;

        const buyIn = Math.round(Number(row.buyIn) || 0);
        const cashOut = Math.round(Number(row.cashOut) || 0);
        const netProfit = cashOut - buyIn;
        
        playerNames.add(row.playerName);

        await storage.addGameResult({
          userId,
          playerName: row.playerName.trim(),
          date: dateVal,
          buyIn,
          cashOut,
          netProfit,
        });
      }

      res.status(201).json({
        imported: rows.length,
        players: Array.from(playerNames),
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Import save error:", err);
      res.status(400).json({ message: err.message || "Failed to save data" });
    }
  });

  app.get(api.import.history.path, requireAuth, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const results = await storage.getGameResults(userId);
    res.json(results);
  });

  return httpServer;
}

// --- Helper: CSV Parser ---
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

// --- Helper: Map spreadsheet rows ---
function mapSpreadsheetData(data: any[]): Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> {
  return data.map(row => {
    const keys = Object.keys(row);
    const findKey = (patterns: string[]) => keys.find(k => 
      patterns.some(p => k.toLowerCase().includes(p))
    );

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

// --- Helper: Try parse text from PDF/Word ---
function tryParseText(text: string): Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> {
  const rows: Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Try to find lines that match patterns like: "2023-01-15  John  $50  $120"
  // or "Jan 15, 2023 | John | 50 | 120"
  const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{2,4})/i;
  const numberPattern = /[$€£]?\s*[\d,]+\.?\d*/g;

  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    const afterDate = line.substring(line.indexOf(dateStr) + dateStr.length);
    
    const numbers = afterDate.match(numberPattern)?.map(n => 
      parseFloat(n.replace(/[$€£,\s]/g, ''))
    ).filter(n => !isNaN(n) && n > 0) || [];

    if (numbers.length < 2) continue;

    // Try to extract player name: text between date and first number
    const firstNumIdx = afterDate.search(/[$€£]?\s*\d/);
    let playerName = 'Unknown';
    if (firstNumIdx > 0) {
      playerName = afterDate.substring(0, firstNumIdx).replace(/[|,;:\t]+/g, ' ').trim() || 'Unknown';
    }

    rows.push({
      date: dateStr,
      playerName,
      buyIn: numbers[0],
      cashOut: numbers[1],
    });
  }

  return rows;
}
