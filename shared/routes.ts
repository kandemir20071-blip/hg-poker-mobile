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
        config: z.any().optional(),
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
        name: z.string(),
      }),
      responses: {
        200: z.object({
          session: z.custom<typeof pokerSessions.$inferSelect>(),
          player: z.custom<typeof sessionPlayers.$inferSelect>(),
        }),
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
        400: errorSchemas.validation, // e.g. totals don't match
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
        amount: z.number(),
        paymentMethod: z.enum(['cash', 'digital']),
      }),
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
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
        }),
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
