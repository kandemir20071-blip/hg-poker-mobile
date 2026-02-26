# HomeGame Poker Tracker — Comprehensive Project Overview

## 1. Tech Stack & Architecture

### Frontend
- **Framework:** React 18 with TypeScript (client-side SPA)
- **Build Tool:** Vite
- **Routing:** Wouter (`client/src/App.tsx`)
  - `/` — Landing page
  - `/join` — Join session via code
  - `/dashboard` — Main user dashboard (authenticated)
  - `/import` — CSV/Excel/PDF data import wizard (authenticated)
  - `/session/:id` — Real-time session view (authenticated)
- **Styling:** Tailwind CSS with a dark "casino/sleek" theme, Shadcn UI (New York style) built on Radix UI primitives
- **State Management:**
  - Server state: `@tanstack/react-query` (v5, object-form API only)
  - Auth state: Custom `useAuth` hook (`client/src/hooks/use-auth.ts`)
  - Local UI state: React `useState`
  - Forms: `react-hook-form` with `zod` validation via `@hookform/resolvers/zod`
- **Charts:** Recharts (line charts, scatter plots, bar charts)
- **QR Codes:** `qrcode.react` for session join codes
- **Fonts:** Cinzel (headings), Inter (body)
- **Icons:** `lucide-react` for UI icons, `react-icons/si` for brand logos
- **Mobile UX:**
  - `ResponsiveModal` pattern: Bottom Sheet/Drawer on mobile (<768px), Dialog on desktop
  - Bottom navigation bar with glassmorphism and safe-area padding
  - Native momentum scrolling, hidden scrollbars on mobile
  - Minimum 48px touch targets on all interactive elements
- **Path Aliases:** `@/` (client/src), `@shared/` (shared), `@assets/` (attached_assets)

### Backend
- **Runtime:** Node.js with Express
- **Language:** TypeScript (executed via `tsx`)
- **API Pattern:** RESTful JSON API (`/api/*`) with Zod schemas for input validation
- **File Upload:** Multer (memory storage, 10MB limit)
- **Session Management:** `express-session` with `connect-pg-simple` (PostgreSQL session store)
- **Authentication:** Replit OpenID Connect (OIDC) via Passport.js
- **Real-time:** WebSockets (`ws`) for live game updates (e.g., Blind Clock sync)
- **Build:** esbuild for server bundle, Vite for client bundle

### Shared Code (`shared/`)
- **`shared/schema.ts`** — Drizzle ORM table definitions for all domain tables
- **`shared/routes.ts`** — Typed API endpoint contracts with Zod input/output schemas, shared between client and server
- **`shared/models/auth.ts`** — User and session table definitions for Replit Auth

### Database
- **Engine:** PostgreSQL (Replit provisioned, accessed via `DATABASE_URL`)
- **ORM:** Drizzle ORM with `drizzle-kit` for schema management (`npm run db:push`)
- **Tables & Relationships:**

| Table | PK | Description |
|---|---|---|
| `users` | `id` (varchar/uuid) | Auth user profiles (Replit Auth). Has `personalDisplayName` for dashboard greeting. |
| `sessions` | `sid` (varchar) | Express session storage (mandatory for Replit Auth). |
| `leagues` | `id` (serial) | League containers. Has `creatorId` (FK → users), `inviteCode`, `name`. |
| `league_members` | `id` (serial) | Junction: users ↔ leagues. Has `canHostSessions` boolean for admin permissions. |
| `league_players` | `id` (serial) | Player entities within a league. Can be "claimed" by a user via `claimedByUserId`. |
| `poker_sessions` | `id` (serial) | Game instances (cash or tournament). FK to `leagues` and `hostId` (user). Has `config` JSONB, `autoApproveTransactions`, `defaultBuyIn`. |
| `session_players` | `id` (serial) | Players in a specific session. Tracks `status` (active/cashed_out/busted). |
| `transactions` | `id` (serial) | Buy-ins and cash-outs. FK to `session_players` and `poker_sessions`. Has `status` (approved/pending/rejected). |
| `game_results` | `id` (serial) | Historical game results (often populated via imports). |

**Key Relationships:**
- User ↔ League: Many-to-Many via `league_members`
- League ↔ LeaguePlayer: One-to-Many
- User ↔ LeaguePlayer: One-to-One (optional "claim")
- League ↔ PokerSession: One-to-Many
- PokerSession ↔ SessionPlayer: One-to-Many
- SessionPlayer ↔ Transaction: One-to-Many

### Key Design Patterns
- **Typed API Contracts:** Route definitions in `shared/routes.ts` with Zod schemas enforce type safety across client/server boundary
- **Storage Interface:** `server/storage.ts` provides `IStorage` interface abstracting all DB operations
- **Custom Hooks:** Domain-specific React hooks wrapping TanStack Query (`use-leagues.ts`, `use-sessions.ts`, `use-stats.ts`, `use-transactions.ts`, `use-auth.ts`)
- **`data-testid` Convention:** All interactive and data-display elements have descriptive test IDs (`{action}-{target}` for buttons, `{type}-{content}` for display)

---

## 2. Core Features & Business Logic

### Authentication & Roles

**Auth Flow:**
- Replit OIDC → Passport.js → PostgreSQL session persistence
- Routes: `/api/login`, `/api/logout`, `/api/auth/user`
- Session secret via `SESSION_SECRET`, 7-day TTL, HTTP-only secure cookies
- Users can set a `personalDisplayName` via `PATCH /api/auth/user/display-name` (cosmetic only, does not affect league player names)

**Role Hierarchy:**
1. **Player (Regular User):** Can join leagues via invite code, claim a player name, view stats, and create self-transactions (buy-in/cash-out) during active sessions.
2. **Session Host / League Admin:** The user who started a session, OR any league member with `canHostSessions === true`. Can:
   - Toggle "Admin Mode" to manage all players' transactions
   - Approve/reject pending transactions
   - Add/remove players mid-game
   - End sessions and trigger settlement
   - Toggle "Self-Serve Transactions" mode
3. **League Creator (Super Admin):** The user who created the league (`league.creatorId`). Has all Admin rights across ALL sessions in their league, plus:
   - Edit/delete any game in the league (not just their own)
   - Manage league membership (grant/revoke hosting permissions, kick members)
   - Manage league player profiles (rename, merge, unclaim, delete)
   - Delete the entire league (high-friction confirmation requiring exact name match)

**Backend Authorization:**
- `isHostOrLeagueAdmin()` helper (server/routes.ts) checks: session host → league creator → `canHostSessions` member
- Transaction creation for non-admins is restricted to self-only (cannot create transactions for other players)

### Game Management

**Session Types:**
- **Cash Game:** Flexible buy-ins, cash out anytime, real-time liquidity tracking
- **Tournament:** Fixed buy-in, configurable rebuys (with time limits), multiple payout structures (Winner Takes All, Top 2, Top 3, Custom Split), blind timer, elimination tracking

**Session Lifecycle:**
1. **Create:** Host selects game type → chooses default buy-in (presets: $5, $10, $20, $30, $50, $100 or custom) → configures rules → session goes "active"
2. **Active Play:**
   - Players join via invite code or are added by host
   - Buy-ins and cash-outs tracked as transactions
   - Admin Mode: Host can manage all players' ledger entries via `ManagePlayerDialog` (includes $10/$20/$30/$40/$50 rebuy quick-select buttons when type is "Re-Buy")
   - Self-Serve Mode: Toggle that allows players to process their own transactions without host approval
   - Tournament: Blind timer with play/pause/next-level controls, player elimination with auto-placement, "Last Man Standing" auto-finish
3. **Settlement & Close:**
   - Cash games: Settlement Engine calculates minimum transactions to clear the board (`client/src/lib/settlements.ts`)
   - Ledger Reconciliation: If Total Buy-in ≠ Total Cash-out, offers "Tax the Winners" (proportional deficit split) or "Select Specific Player" resolution
   - Tournament: Auto-calculates payouts based on configured structure, supports custom chop override
   - Sessions marked as `completed` with end time

### Profile & Analytics

**Personal Stats (`/api/stats/personal`):**
- Total Profit, ROI, Total Buy-In, Total Cash-Out, Games Played
- Calculated across all claimed league player profiles
- Dynamic color: Profit/ROI values render `text-emerald-400` when positive, `text-red-500` when negative

**Dashboard Nickname:**
- `personalDisplayName` field on `users` table
- Greeting fallback chain: `personalDisplayName` → `firstName` → `"Player"`
- Inline edit UI with pencil icon, text input, checkmark save, X cancel

**Player Rivalries (`/api/stats/personal/rivalries`):**
- Analyzes `game_results` by shared sessions
- **Nemesis:** Opponent with highest cumulative profit in shared games
- **Target:** Opponent with lowest cumulative profit (your best matchup)
- **Recent Form Chart:** Line chart of last 10 games showing profit trajectory (emerald-only color scheme)

**League Analytics (`LeagueAnalytics.tsx`):**
- **Leaderboard:** Ranked player standings with tier-based mascot icons
- **Skill Map:** Scatter plot of Experience (Games Played) vs. Efficiency (ROI)
- **Volatility Index:** Bar chart showing each player's biggest win vs. biggest loss (min 3 games)
- **League Pulse:** Timeline of total money wagered across sessions
- **League Info:** Displays "Organized by: {creatorName}" with creator's display name

**Import Wizard:**
- Supports CSV, Excel (.xlsx/.xls), PDF, DOCX, TXT
- Regex parsers for poker app exports (Poker Analytics, Poker Bankroll Tracker formats)
- Populates `game_results` for historical data

---

## 3. UI/UX & Strict Design Rules

### Color Palette (STRICTLY ENFORCED)

| Purpose | Tailwind Classes | Hex/HSL |
|---|---|---|
| **Background (primary)** | `bg-background` | `hsl(222 47% 11%)` — Deep navy |
| **Card/Panel background** | `bg-card`, `bg-card/60` | `hsl(222 47% 14%)` — Slightly lighter navy |
| **Primary green (actions, positive)** | `text-primary`, `bg-primary` | Emerald/neon green |
| **Positive stats** | `text-emerald-400`, `text-emerald-500` | `#34d399` / `#10b981` |
| **Negative stats / destructive** | `text-red-500`, `text-red-400`, `text-destructive` | `#ef4444` / `#f87171` |
| **Secondary text / labels** | `text-muted-foreground` | `hsl(215 20% 55%)` — Muted gray |
| **Borders** | `border-white/[0.06]`, `border-white/[0.08]` | Subtle white transparency |
| **Admin Mode badge** | `bg-amber-500/20 text-amber-400` | Amber (only for admin indicator) |
| **Imported badge** | `bg-blue-500/20 text-blue-400` | Blue (only for imported data indicator) |

**CRITICAL GLOBAL RULE:** No new colors, hex values, or shades may be introduced outside this established palette. Red is ONLY permitted for negative financial values and destructive actions.

### Glassmorphism
- `glass-card` class: `backdrop-blur-xl` (24px), semi-transparent `bg-card/60`, subtle white border
- Used for all cards, panels, modals, and the bottom navigation bar

### Dynamic Mascot System
The app uses pixel-art frog mascots that react to player state:

| Asset | Usage | Display Mode |
|---|---|---|
| `frogMountainSrc` | Total Profit card (profit ≥ 0) | `landscapeIcon` — anchored right, full height |
| `frogSisyphusSrc` | Total Profit card (profit < 0) | `landscapeIcon` — anchored right, full height |
| `frogBalanceSrc` | Money Wagered stat card | Default square icon |
| `frogMoneyBagSrc` | Total Cash Out stat card | Default square icon |
| `frogClockSrc` | Games Played stat card | Default square icon |
| `frogCashGameSrc` | Cash Game selection card | Full-width centered |
| `frogGladiatorSrc` | Tournament selection card | Full-width centered |
| `frogKingpinSrc` | Leaderboard rank mascot | Varies |
| `frogGrinderSrc` | Mid-tier rank mascot | Varies |
| `frogBrokeSrc` | Low-tier rank mascot | Varies |
| `frogUnrankedSrc` | Unranked mascot | Varies |
| `frogBankerSrc` | Banker/host mascot | Varies |

**StatCard Image Modes (`StatCard.tsx`):**
- `customIconSrc` alone → Small square icon, centered right
- `landscapeIcon={true}` → Wide image anchored `right-0 top-0 h-full`
- `cinematicIcon={true}` → Full-card inset cover at 50% opacity

### Mascot Hover Glow Effect
All mascot `<img>` tags use:
```
group-hover:drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]
mix-blend-screen
border-none outline-none ring-0
transition-[filter] duration-500 ease-out
```
- `drop-shadow` (CSS filter) traces the PNG alpha channel for silhouette-shaped glow
- `mix-blend-screen` eliminates dark edge artifacts on dark backgrounds
- Applied directly to `<img>` tags, never parent wrappers (prevents rectangular bounding box glow)
- Game selection cards use `rgba(16,185,129,0.6)` (slightly lower opacity)

### Mobile-First Patterns
- **ResponsiveModal:** Drawer on mobile, Dialog on desktop (breakpoint: 768px)
- **Bottom Navigation:** Fixed, glassmorphism, `padding-bottom: env(safe-area-inset-bottom)`
- **Touch Targets:** `min-h-[44px]` on all buttons and inputs
- **Scrolling:** `-webkit-overflow-scrolling: touch`, hidden scrollbars
- **Typography:** `uppercase tracking-wider text-[10px] sm:text-xs` for labels

---

## 4. Pending / Incomplete Features

| Feature | Status | Notes |
|---|---|---|
| **Currency Toggle (`showCurrencySymbol`)** | Not implemented | Audit doc references it; app hardcodes `$` everywhere. Import parsers handle €/£ but live UI does not. |
| **Legacy Stats Endpoint** | Deprecated / backward compat | `server/routes.ts:1370` — Old stats route kept for backward compatibility with pre-league architecture. |
| **PDF Parse Types** | Stubbed with `@ts-ignore` | `server/routes.ts:1514` — `pdf-parse` import lacks TypeScript declarations. |
| **Type Safety Gaps** | Widespread `any` usage | Hundreds of `(req.user as any)`, `z.any()`, and untyped API responses throughout `server/routes.ts` and `shared/routes.ts`. |
| **Settlement Engine UI** | Partially implemented | Core calculation logic exists in `client/src/lib/settlements.ts`; some audit-described UX goals may exceed current implementation. |

---

## 5. Environment & Configuration

### Required Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Express session encryption key
- `ISSUER_URL` — Replit OIDC issuer URL
- `REPL_ID` — Replit environment identifier

### Key NPM Packages
`drizzle-orm`, `drizzle-kit`, `express`, `express-session`, `passport`, `openid-client`, `connect-pg-simple`, `@tanstack/react-query`, `recharts`, `qrcode.react`, `zod`, `drizzle-zod`, `wouter`, `multer`, `ws`, `pdf-parse`, `lucide-react`

### Development
- `npm run dev` starts Express backend + Vite frontend on port 5000
- `npm run db:push` syncs Drizzle schema to PostgreSQL
- Vite handles HMR, path aliases, and asset imports
