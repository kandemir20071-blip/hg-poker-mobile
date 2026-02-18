import { z } from 'zod';
import { insertPokerSessionSchema, insertSessionPlayerSchema, insertTransactionSchema, pokerSessions, sessionPlayers, transactions } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  sessions: {
    create: {
      method: 'POST' as const,
      path: '/api/sessions' as const,
      input: z.object({
        type: z.enum(['cash', 'tournament']),
        leagueId: z.number().optional(),
        config: z.any().optional(),
        defaultBuyIn: z.number().gt(0).optional(),
      }),
      responses: {
        201: z.custom<typeof pokerSessions.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/sessions' as const,
      responses: {
        200: z.array(z.custom<typeof pokerSessions.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/sessions/:id' as const,
      responses: {
        200: z.object({
          session: z.custom<typeof pokerSessions.$inferSelect>(),
          players: z.array(z.custom<typeof sessionPlayers.$inferSelect & {
            totalBuyIn: number;
            totalCashOut: number;
            netProfit: number;
          }>()),
          transactions: z.array(z.custom<typeof transactions.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/sessions/join' as const,
      input: z.object({
        code: z.string(),
      }),
      responses: {
        200: z.object({
          session: z.custom<typeof pokerSessions.$inferSelect>(),
          player: z.custom<typeof sessionPlayers.$inferSelect>(),
        }),
        404: errorSchemas.notFound,
      },
    },
    addPlayer: {
      method: 'POST' as const,
      path: '/api/sessions/:id/players' as const,
      input: z.object({
        name: z.string().min(1, 'Name is required'),
      }),
      responses: {
        201: z.custom<typeof sessionPlayers.$inferSelect>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    end: {
      method: 'POST' as const,
      path: '/api/sessions/:id/end' as const,
      input: z.object({
        cashOuts: z.array(z.object({
          playerId: z.number(),
          amount: z.number(),
        })).optional(),
      }),
      responses: {
        200: z.custom<typeof pokerSessions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/sessions/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  transactions: {
    create: {
      method: 'POST' as const,
      path: '/api/sessions/:sessionId/transactions' as const,
      input: z.object({
        playerId: z.number(),
        type: z.enum(['buy_in', 'cash_out']),
        amount: z.number().min(0, 'Amount cannot be negative').lt(100000, 'Amount must be less than $100,000'),
      }).refine(
        (data) => data.type === 'cash_out' || data.amount > 0,
        { message: 'Buy-in amount must be greater than 0', path: ['amount'] }
      ),
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/transactions/:id' as const,
      input: z.object({
        amount: z.number().min(0, 'Amount cannot be negative').lt(100000, 'Amount must be less than $100,000').optional(),
        type: z.enum(['buy_in', 'cash_out']).optional(),
      }),
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/transactions/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/transactions/:id/status' as const,
      input: z.object({
        status: z.enum(['approved', 'rejected']),
      }),
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  stats: {
    personal: {
      method: 'GET' as const,
      path: '/api/stats/personal' as const,
      responses: {
        200: z.object({
          totalGames: z.number(),
          totalProfit: z.number(),
          totalBuyIn: z.number(),
          totalCashOut: z.number(),
          roi: z.number(),
          bankrollHistory: z.array(z.object({
            date: z.string(),
            profit: z.number(),
            cumulative: z.number(),
          })),
          recentGames: z.array(z.object({
            date: z.string(),
            leagueName: z.string(),
            profit: z.number(),
          })),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    league: {
      method: 'GET' as const,
      path: '/api/stats/league/:leagueId' as const,
      responses: {
        200: z.object({
          totalGames: z.number(),
          totalMoneyWagered: z.number(),
          totalPot: z.number(),
          totalPlayerEntries: z.number(),
          playerProfitHistory: z.array(z.object({
            playerName: z.string(),
            totalProfit: z.number(),
            points: z.array(z.object({
              date: z.string(),
              cumulative: z.number(),
              profit: z.number(),
            })),
          })),
          playerAnalytics: z.array(z.object({
            playerName: z.string(),
            gamesPlayed: z.number(),
            totalBuyIn: z.number(),
            totalProfit: z.number(),
            roi: z.number(),
            biggestWin: z.number(),
            biggestLoss: z.number(),
          })),
          sessionHistory: z.array(z.object({
            date: z.string(),
            totalWagered: z.number(),
          })),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/stats' as const,
      responses: {
        200: z.object({
          totalGames: z.number(),
          totalProfit: z.number(),
          roi: z.number(),
          bankrollHistory: z.array(z.object({
            date: z.string(),
            profit: z.number(),
            cumulative: z.number(),
          })),
          playerProfitHistory: z.array(z.object({
            playerName: z.string(),
            totalProfit: z.number(),
            points: z.array(z.object({
              date: z.string(),
              cumulative: z.number(),
              profit: z.number(),
            })),
          })),
        }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  leagues: {
    create: {
      method: 'POST' as const,
      path: '/api/leagues' as const,
      input: z.object({
        name: z.string().min(1, 'League name is required'),
      }),
      responses: {
        201: z.any(),
        401: errorSchemas.unauthorized,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/leagues' as const,
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/leagues/:id' as const,
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/leagues/join' as const,
      input: z.object({
        inviteCode: z.string().min(1),
      }),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    players: {
      method: 'GET' as const,
      path: '/api/leagues/:id/players' as const,
      responses: {
        200: z.array(z.any()),
      },
    },
    claimPlayer: {
      method: 'POST' as const,
      path: '/api/leagues/:id/claim' as const,
      input: z.object({
        playerId: z.number(),
      }),
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
      },
    },
    unclaimPlayer: {
      method: 'POST' as const,
      path: '/api/leagues/:id/unclaim' as const,
      input: z.object({
        playerId: z.number(),
      }),
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    mergePlayers: {
      method: 'POST' as const,
      path: '/api/leagues/:id/merge-players' as const,
      input: z.object({
        sourcePlayerId: z.number(),
        targetPlayerId: z.number(),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    renamePlayer: {
      method: 'POST' as const,
      path: '/api/leagues/:id/rename-player' as const,
      input: z.object({
        playerId: z.number(),
        newName: z.string().min(1).max(50),
      }),
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    deletePlayer: {
      method: 'POST' as const,
      path: '/api/leagues/:id/delete-player' as const,
      input: z.object({
        playerId: z.number(),
      }),
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    kickMember: {
      method: 'DELETE' as const,
      path: '/api/leagues/:leagueId/members/:userId' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    leave: {
      method: 'DELETE' as const,
      path: '/api/leagues/:id/leave' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/leagues/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  import: {
    upload: {
      method: 'POST' as const,
      path: '/api/import/upload' as const,
      responses: {
        200: z.object({
          rows: z.array(z.object({
            date: z.string(),
            playerName: z.string(),
            buyIn: z.number(),
            cashOut: z.number(),
          })),
          rawText: z.string().optional(),
          existingNames: z.array(z.string()).optional(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    save: {
      method: 'POST' as const,
      path: '/api/import/save' as const,
      input: z.object({
        leagueId: z.number(),
        rows: z.array(z.object({
          date: z.string(),
          playerName: z.string(),
          buyIn: z.number(),
          cashOut: z.number(),
        })),
      }),
      responses: {
        201: z.object({
          imported: z.number(),
          skipped: z.number(),
          players: z.array(z.string()),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/import/history' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          playerName: z.string(),
          date: z.string(),
          buyIn: z.number(),
          cashOut: z.number(),
          netProfit: z.number(),
          importedAt: z.string(),
        })),
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
