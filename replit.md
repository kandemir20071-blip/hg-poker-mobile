# HomeGame Poker Tracker

## Overview

HomeGame Poker Tracker is a mobile-first web application designed to manage and track home poker games across multiple leagues. It functions as a digital bank and tournament manager, allowing users to create or join leagues via invite codes, claim player names, and track both personal and league-specific statistics. The application supports host-driven or collaborative data entry for sessions and features a settlement flow for optimal payout calculation. Key capabilities include comprehensive league management, an "Admin Mode" for hosts to manage game details manually, a League Admin Dashboard for managing players within a league (unclaiming, merging, renaming, sorting), a "Fast Start" system with default buy-ins and roster management, a robust cash game engine with real-time liquidity metrics, an analytics engine for visualizing player performance and league trends, and a Player Rivalries system with "Recent Form (Last 10 Games)" profit line chart and Nemesis/Target cards showing head-to-head opponent performance across shared sessions. It also supports PDF data import for historical game results and offers full session management capabilities (edit/delete). The Manage Players dialog supports sorting by "A-Z" (claimed first, then alphabetical) or "Most Active" (descending session count with game count badges), player search, inline rename, unclaim, merge, and delete operations with confirmation dialogs and cascading data cleanup. Tournament Mode supports configurable re-buys with time limits, multiple payout structures (winner takes all, top 2/3, custom split), live prize pool tracking, player elimination with automatic placement assignment, tournament-specific result views, custom chop override for manual payout adjustments, an optional Blind Timer with play/pause/next-level controls and standard poker blind progression, and "Last Man Standing" auto-finish logic that automatically ends the tournament when only one player remains, calculates payouts, records cash-out transactions for leaderboard integration, and generates game results. A "Self-Serve Transactions" toggle (autoApproveTransactions on pokerSessions) allows the host to enable instant processing of player rebuys and cashouts without requiring manual approval; players see updated button text ("Instant Re-Buy") and a green unlock indicator when self-serve is active. League membership management includes "Leave League" (members can leave with confirmation, historical data preserved) and "Delete League" (creator-only, high-friction confirmation requiring exact league name, cascading deletion of all associated data). Cash game ledger reconciliation supports "Tax the Winners" (proportional deficit split) and "Select Specific Player" resolution modes when ending sessions with mismatched books.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React with TypeScript (client-side SPA)
- **Routing:** Wouter (hash-based routing on native via `useHashLocation`, History API on web)
- **Styling:** Tailwind CSS with a dark "casino/sleek" theme, complemented by shadcn/ui (New York style) built on Radix UI.
- **Data Fetching:** TanStack React Query for server state management.
- **Charts:** Recharts for data visualization.
- **QR Codes:** qrcode.react for session join codes.
- **Fonts:** Inter (body). Loaded via CSS `@import` in `index.css`.
- **Mobile UX:** ResponsiveModal pattern (Drawer on mobile <768px, Dialog on desktop), bottom navigation with safe-area padding (top + bottom via `pt-safe`/`pb-safe` CSS classes using `env(safe-area-inset-*)`), native scrolling, 48px touch targets, `active:scale-95`/`active:scale-[0.98]` touch feedback on all buttons and nav items, `overscroll-behavior-y: none` to prevent pull-to-refresh bounce.
- **PWA:** `manifest.json` with `display: standalone`, `theme_color: #0f1729`, Apple meta tags (`apple-mobile-web-app-capable`, `black-translucent` status bar). Ready for Capacitor wrapping.
- **Responsive Components:** `ResponsiveModal` (`@/components/ui/responsive-modal`), `useMediaQuery` (`@/hooks/use-media-query`).
- **Build Tool:** Vite.
- **Native Wrapper:** Capacitor (`capacitor.config.ts`), bundle ID `com.hgpoker.tracker`, web dir `dist/public`. Native projects: `ios/` (Xcode) and `android/` (Gradle). Build workflow: `npm run build` → `npx cap sync` → open in Xcode/Android Studio.
- **Native API Routing:** `client/src/lib/api-base.ts` exports `getApiBase()` — returns `VITE_API_BASE_URL` on native (Capacitor), empty string on web. All `fetch()` calls and auth redirects prepend this base URL.
- **Native OAuth:** On native, login/logout use `@capacitor/browser` plugin to open OAuth in a secure in-app browser (Apple requirement). On web, standard `window.location.href` redirects.

### Backend
- **Runtime:** Node.js with Express.
- **Language:** TypeScript (executed via `tsx`).
- **API Pattern:** RESTful JSON API (`/api/*`) with Zod schemas for validation.
- **File Upload:** Multer for import functionality.
- **Session Management:** `express-session` with `connect-pg-simple`. Cookies: `httpOnly`, `secure`, `sameSite: "none"` (required for cross-origin Capacitor native requests).
- **CORS:** `cors` middleware allows origins `capacitor://localhost`, `http://localhost`, `https://localhost` with credentials. Same-origin web requests pass through unchanged.
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
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_PRO`
- `VITE_API_BASE_URL` (production server URL for native Capacitor builds, e.g. `https://your-app.replit.app`)

### Third-Party Services
- **Replit Auth (OIDC):** User authentication.
- **PostgreSQL:** Primary database.
- **Stripe:** Pro subscription checkout via Stripe Checkout Sessions (recurring subscription, web only). Endpoints: `POST /api/create-checkout-session`, `GET /api/verify-session`. PaywallOverlay redirects to Stripe; Dashboard handles success redirect verification and updates `subscriptionTier` to `'pro'`.
- **RevenueCat:** Native mobile (Capacitor) in-app purchase billing. Endpoints: `POST /api/revenuecat-webhook` (server-to-server), `POST /api/revenuecat-activate` (client-side activation after purchase). The `useBilling` hook (`client/src/hooks/use-billing.ts`) handles platform detection via `Capacitor.isNativePlatform()` and routes to RevenueCat (native) or Stripe (web) accordingly. Dynamic pricing: $6.99/mo native, $5.00/mo web.

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
- `stripe`
- `@capacitor/core`, `@capacitor/browser`, `@revenuecat/purchases-capacitor`