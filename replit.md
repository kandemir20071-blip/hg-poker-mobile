# HomeGame Poker Tracker

## Overview

HomeGame Poker Tracker is a mobile-first web application designed to manage and track home poker games across multiple leagues. It functions as a digital bank and tournament manager, allowing users to create or join leagues via invite codes, claim player names, and track both personal and league-specific statistics. The application supports host-driven or collaborative data entry for sessions and features a settlement flow for optimal payout calculation. Key capabilities include comprehensive league management, an "Admin Mode" for hosts to manage game details manually, a League Admin Dashboard for managing players within a league (unclaiming, merging, renaming, sorting), a "Fast Start" system with default buy-ins and roster management, a robust cash game engine with real-time liquidity metrics, and an analytics engine for visualizing player performance and league trends. It also supports PDF data import for historical game results and offers full session management capabilities (edit/delete). The Manage Players dialog supports sorting by "A-Z" (claimed first, then alphabetical) or "Most Active" (descending session count with game count badges), player search, inline rename, unclaim, merge, and delete operations with confirmation dialogs and cascading data cleanup. Tournament Mode supports configurable re-buys with time limits, multiple payout structures (winner takes all, top 2/3, custom split), live prize pool tracking, player elimination with automatic placement assignment, tournament-specific result views, custom chop override for manual payout adjustments, an optional Blind Timer with play/pause/next-level controls and standard poker blind progression, and "Last Man Standing" auto-finish logic that automatically ends the tournament when only one player remains, calculates payouts, records cash-out transactions for leaderboard integration, and generates game results. League membership management includes "Leave League" (members can leave with confirmation, historical data preserved) and "Delete League" (creator-only, high-friction confirmation requiring exact league name, cascading deletion of all associated data). Cash game ledger reconciliation supports "Tax the Winners" (proportional deficit split) and "Select Specific Player" resolution modes when ending sessions with mismatched books.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React with TypeScript (client-side SPA)
- **Routing:** Wouter
- **Styling:** Tailwind CSS with a dark "casino/sleek" theme, complemented by shadcn/ui (New York style) built on Radix UI.
- **Data Fetching:** TanStack React Query for server state management.
- **Charts:** Recharts for data visualization.
- **QR Codes:** qrcode.react for session join codes.
- **Fonts:** Cinzel (headings) and Inter (body).
- **Mobile UX:** ResponsiveModal pattern (Drawer on mobile <768px, Dialog on desktop), bottom navigation with safe-area padding, native scrolling, 48px touch targets.
- **Responsive Components:** `ResponsiveModal` (`@/components/ui/responsive-modal`), `useMediaQuery` (`@/hooks/use-media-query`).
- **Build Tool:** Vite.

### Backend
- **Runtime:** Node.js with Express.
- **Language:** TypeScript (executed via `tsx`).
- **API Pattern:** RESTful JSON API (`/api/*`) with Zod schemas for validation.
- **File Upload:** Multer for import functionality.
- **Session Management:** `express-session` with `connect-pg-simple`.
- **Authentication:** Replit OpenID Connect (OIDC) via Passport.js.
- **Build:** esbuild for server, Vite for client.

### Shared Code
- **Location:** `shared/` directory.
- **Schema:** `shared/schema.ts` defines Drizzle ORM tables.
- **Routes:** `shared/routes.ts` defines typed API endpoint contracts with Zod validation.
- **Auth Models:** `shared/models/auth.ts` defines user and session tables for Replit Auth.

### Database
- **Database:** PostgreSQL (Replit provisioned).
- **ORM:** Drizzle ORM with `drizzle-kit` for schema management.
- **Key Tables:** `users`, `sessions` (auth), `leagues`, `league_members`, `league_players`, `poker_sessions`, `session_players`, `transactions`, `game_results`.

### Key Design Patterns
- **Typed API Contracts:** Shared route definitions with Zod schemas for both client and server.
- **Custom Hooks:** Domain-specific React hooks wrapping TanStack Query.
- **Storage Interface:** `server/storage.ts` provides an `IStorage` interface.
- **Path Aliases:** `@/`, `@shared/`, `@assets/`.

### Authentication
- Replit OIDC-based authentication.
- Passport.js strategy with PostgreSQL session persistence.
- Routes: `/api/login`, `/api/logout`, `/api/auth/user`.
- Session secret via `SESSION_SECRET`, 7-day TTL with HTTP-only secure cookies.

## External Dependencies

### Required Environment Variables
- `DATABASE_URL`
- `SESSION_SECRET`
- `ISSUER_URL`
- `REPL_ID`

### Third-Party Services
- **Replit Auth (OIDC):** User authentication.
- **PostgreSQL:** Primary database.

### Key NPM Packages
- `drizzle-orm`, `drizzle-kit`
- `express`, `express-session`
- `passport`, `openid-client`, `connect-pg-simple`
- `@tanstack/react-query`
- `recharts`
- `qrcode.react`
- `zod`, `drizzle-zod`
- `wouter`
- `multer`
- `shadcn/ui` (Radix UI)