# HomeGame Poker Tracker

## Overview

HomeGame Poker Tracker is a mobile-first web application that serves as a digital bank and tournament manager for home poker games. It supports multi-league organization where users can create/join poker leagues via invite codes, claim their player names within leagues, and track both personal stats across all leagues and league-specific stats.

The app supports two input modes: **Host Mode** (host enters all data manually) and **Collaborative Mode** (players join via session code/QR and submit buy-in requests that the host approves). Sessions end with a settlement flow that validates totals and calculates optimal payouts (banker or peer-to-peer).

### Multi-League System
- **Leagues:** Users create leagues with auto-generated 6-character invite codes; others join via code
- **Tables:** `leagues`, `league_members`, `league_players` in the database
- **Player Claiming:** Each league has players (from imports or sessions); users claim their name to link it to their account
- **Personal Stats:** `GET /api/stats/personal` aggregates data across all leagues where user has claimed a name
- **League Stats:** `GET /api/stats/league/:leagueId` shows all player performance within a league
- **League Sessions:** `GET /api/leagues/:id/sessions` returns all sessions in a league (membership-gated)
- **Data Migration:** `POST /api/migrate-to-league` moves existing game_results into a league, creating unclaimed players
- **Invite Code Visibility:** Invite code shown to ALL league members (not just creators) in both the top bar copy button and the League Info card, so any member can invite others
- **Dashboard Tabs:** "My Profile" (personal cross-league stats) and "My Leagues" (league selector + league-specific stats + sessions)
- **Authorization:** All league endpoints check membership before returning data
- **Hooks:** `client/src/hooks/use-leagues.ts` has useLeagues, useLeague, useLeagueSessions, useLeagueStats, usePersonalStats, useCreateLeague, useJoinLeague, useClaimPlayer, useMigrateToLeague

### Game Master (Admin) Mode
- **Toggle:** Host can enable "Admin Mode" via a button in the Session Header to reveal manual controls
- **Manual Player Entry:** Host can add players by name without requiring them to join via code (creates guest players with null userId)
- **Centralized Ledger Control:** "Manage" button per player opens a dialog to view/add/edit/delete all transactions for that player
- **Full Editability:** Every transaction (buy-in/cash-out) can be edited or deleted at any time, including after session ends
- **Ledger Edits:** The ledger panel also supports inline editing and deletion in admin mode
- **Cash Out & Leave:** Admin can cash out individual players mid-session via "Cash Out" button; creates cash_out transaction + updates player status to `cashed_out`; player moves to "Finished Players" section with "LEFT" badge
- **API Endpoints:** `POST /api/sessions/:id/players` (add player), `POST /api/sessions/:id/players/:playerId/cashout` (cash out & leave), `PATCH /api/transactions/:id` (edit), `DELETE /api/transactions/:id` (delete) — all host-only
- **Components:** `AddPlayerDialog`, `ManagePlayerDialog`, `CashOutDialog` (inline in PlayerList) in `client/src/components/game/`

### Cash Game Engine
- **Liquidity Metrics:** Session header shows "Wagered" (sum of all buy-ins) and "In Play" (wagered minus cash-outs) as separate stats
- **Optimistic Updates:** Buy-in/cash-out transactions appear instantly in the UI via React Query cache injection, with automatic rollback on server error
- **Server Validation:** Transaction amounts validated server-side: must be > 0 and < 100,000 (via Zod on create and update schemas)
- **Profit Colors:** Standardized across all components: emerald-500 (profit), red-500 (loss), muted-foreground (even)
- **Player Separation:** Active players shown at top sorted by net profit; cashed-out players shown in "Finished Players" section below

### League Analytics Engine
- **Component:** `LeagueAnalytics` in `client/src/components/LeagueAnalytics.tsx` with 4 visualization modes via dropdown
- **Player Performance:** Multi-line cumulative profit chart (Recharts LineChart) with filters: Top 10, Heroes & Villains, All Players, Select Player — embedded from `PlayerProfitChart` component
- **Skill Map:** Scatter plot (ScatterChart) — X: Games Played, Y: ROI% — bubble size scales with experience; green = profitable, red = losing; filterable by min games (All/5+/10+)
- **Volatility Index:** Bar chart showing each player's biggest single-session win (green) vs biggest loss (red); sortable by biggest win, biggest loss, or most stable
- **League Pulse:** Area chart tracking pot size (total wagered) per session date over time; filterable by last 10 sessions, last year, all time
- **Help Bubbles:** Each view has a tooltip explaining what the chart shows and how to interpret it
- **API:** `GET /api/stats/league/:leagueId` returns `playerAnalytics` (gamesPlayed, totalBuyIn, totalProfit, roi, biggestWin, biggestLoss per player), `sessionHistory` (date + totalWagered), `totalPlayerEntries`, plus existing `playerProfitHistory`
- **Stat Cards:** 3 cards — Games Played, Total Money Wagered (with pot/diff subtitle), Avg Buy-in (with info tooltip explaining "weight class")
- **Recent Games:** Scrollable list (fixed 400px height), no limit, clickable rows navigate to session, "Cash" renamed to "Cash Game"

### Session Management (Edit/Delete)
- **Edit:** Pencil icon on completed sessions navigates to `/session/:id?admin=true` to reopen in Admin Mode
- **Delete:** Trash icon opens confirmation dialog requiring user to type "DELETE" before proceeding
- **Cascade:** Delete removes all transactions, session_players, and the session itself in a database transaction
- **Cache:** Invalidates sessions list, per-session data, and stats queries on delete
- **Mobile:** Controls always visible on mobile, hover-reveal on desktop
- **API:** `DELETE /api/sessions/:id` (host-only, cascade delete)
- **Storage:** `deleteSession(id)` uses Drizzle transaction with `inArray` for batch transaction deletion

### PDF Data Import
- **PDF Parser:** Regex-based engine handles German poker format: date headers (dd.mm.yyyy) grouping player entries like `Name Buy-in€ Endstand: Cash-out€`
- **Fallback Parser:** Generic text parser for other formats (CSV, Excel, Word, plain text also supported)
- **Duplicate Prevention:** On save, each row is checked against existing game_results using normalized key (name+date+buyIn+cashOut); exact duplicates are skipped
- **Name Normalization:** Names are lowercased and trimmed before comparison to prevent duplicate player records
- **Staging Table:** Parsed data shown in editable review table before committing — user can fix amounts, names, dates
- **Name Matching Indicators:** Each row shows "Exists" (green) or "New" (amber) badge based on cross-reference with database
- **Data Integrity Disclaimer:** Prominent notice explaining name matching behavior
- **Template Tooltip:** Info icon shows example of perfect PDF format
- **API:** `POST /api/import/upload` (parse file, return rows + existingNames), `POST /api/import/save` (commit with dupe check)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React with TypeScript (no RSC/SSR — client-side SPA)
- **Routing:** Wouter (lightweight client-side router)
- **Styling:** Tailwind CSS with a dark "casino/sleek" theme (deep blacks, gold accents, green for wins, red for losses)
- **UI Components:** shadcn/ui (new-york style) built on Radix UI primitives, with custom casino-themed CSS variables
- **Data Fetching:** TanStack React Query for server state management with polling (5s intervals for live session data)
- **Charts:** Recharts for bankroll history line charts and statistics visualization
- **QR Codes:** qrcode.react for generating session join codes
- **Fonts:** Cinzel (display/headings) and Inter (body text)
- **Build Tool:** Vite with React plugin

### Backend
- **Runtime:** Node.js with Express
- **Language:** TypeScript, executed via tsx
- **API Pattern:** RESTful JSON API under `/api/*` prefix, with Zod schemas for input validation defined in `shared/routes.ts`
- **File Upload:** Multer (memory storage) for CSV/Excel/PDF import functionality
- **Session Management:** express-session with connect-pg-simple (PostgreSQL-backed sessions)
- **Authentication:** Replit OpenID Connect (OIDC) integration via Passport.js — users authenticate through Replit's auth flow
- **Build:** esbuild for server bundling, Vite for client bundling; output goes to `dist/`

### Shared Code
- **Location:** `shared/` directory contains schema definitions and API route contracts
- **Schema:** `shared/schema.ts` defines all database tables using Drizzle ORM
- **Routes:** `shared/routes.ts` defines API endpoint contracts with Zod validation schemas, shared between client and server
- **Auth Models:** `shared/models/auth.ts` defines user and session tables required by Replit Auth

### Database
- **Database:** PostgreSQL (required — provisioned via Replit)
- **ORM:** Drizzle ORM with `drizzle-kit` for schema management
- **Schema Push:** Use `npm run db:push` (drizzle-kit push) to sync schema to database — no migration files needed for development
- **Connection:** `DATABASE_URL` environment variable, using `pg.Pool`
- **Key Tables:**
  - `users` — User accounts (Replit Auth managed)
  - `sessions` (auth) — Express session storage
  - `leagues` — Poker leagues with invite codes, creator reference
  - `league_members` — League membership (userId + leagueId)
  - `league_players` — Player names within a league, with optional `claimedByUserId` link
  - `poker_sessions` — Game sessions with type (cash/tournament), status, host, join code, optional `leagueId`, and config (JSON for blind structure etc.)
  - `session_players` — Players in a session with status tracking (active/busted/cashed_out), tournament placement, and stack tracking
  - `transactions` — Buy-in and cash-out ledger entries with payment method (cash/digital), approval status (pending/approved/rejected)
  - `game_results` — Historical game results for stats/leaderboard with optional `leagueId` for league-scoped data

### Key Design Patterns
- **Typed API Contracts:** Route definitions in `shared/routes.ts` include method, path, Zod input schema, and response schemas — used by both server handlers and client hooks
- **Custom Hooks Pattern:** Each domain area has its own React hook (`use-sessions`, `use-transactions`, `use-stats`, `use-auth`) wrapping TanStack Query
- **Storage Interface:** `server/storage.ts` defines an `IStorage` interface with a `DatabaseStorage` implementation, allowing for potential swapping of storage backends
- **Path Aliases:** `@/` maps to `client/src/`, `@shared/` maps to `shared/`, `@assets/` maps to `attached_assets/`

### Authentication
- Replit OIDC-based authentication (OpenID Connect)
- Passport.js strategy with session persistence in PostgreSQL
- Auth routes: `/api/login`, `/api/logout`, `/api/auth/user`
- Session secret via `SESSION_SECRET` environment variable
- 7-day session TTL with HTTP-only secure cookies

## External Dependencies

### Required Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (provisioned by Replit)
- `SESSION_SECRET` — Secret for signing express sessions
- `ISSUER_URL` — OIDC issuer URL (defaults to `https://replit.com/oidc`)
- `REPL_ID` — Replit environment identifier (auto-set by Replit)

### Third-Party Services
- **Replit Auth (OIDC):** User authentication via Replit's OpenID Connect provider
- **PostgreSQL:** Primary data store for all application data and session storage

### Key NPM Packages
- `drizzle-orm` + `drizzle-kit` — Database ORM and schema management
- `express` + `express-session` — HTTP server and session handling
- `passport` + `openid-client` — Authentication
- `connect-pg-simple` — PostgreSQL session store
- `@tanstack/react-query` — Client-side data fetching/caching
- `recharts` — Data visualization (bankroll charts, leaderboards)
- `qrcode.react` — QR code generation for session joining
- `zod` + `drizzle-zod` — Runtime validation
- `wouter` — Client-side routing
- `multer` — File upload handling for data import
- `shadcn/ui` components (Radix UI primitives) — UI component library