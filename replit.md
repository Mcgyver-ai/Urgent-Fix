# UrgentFix — Emergency Home Repair Platform

## Overview
UrgentFix is a production-style MVP web application for on-demand emergency home repairs. Customers book urgent plumbing, electrical, locksmith, and boiler/heating jobs. Providers accept and complete jobs. Admins verify providers and manage the platform.

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect)
- **State**: TanStack Query (React Query)

## Architecture
```
/client/src
  /components
    /layout       — Navbar, StatusBadge
    /ui           — shadcn/ui components
  /hooks          — useAuth
  /lib            — queryClient, auth-utils
  /pages          — All page components
/server
  /replit_integrations/auth  — Replit Auth OIDC setup
  db.ts           — Database connection (Drizzle)
  routes.ts       — All API routes
  storage.ts      — Database storage layer (IStorage interface)
  index.ts        — Server entry point + seeding
/shared
  schema.ts       — Drizzle schema + all TypeScript types
  /models/auth.ts — Auth-specific tables (users, sessions)
```

## User Roles
1. **Customer** — Books emergency repairs, views bookings, approves quotes, leaves reviews
2. **Provider** — Accepts jobs, updates status, submits quotes, completes work
3. **Admin** — Verifies providers, monitors bookings, resolves disputes

**Switching roles**: Users can change their role in the Profile page (for demo purposes).

## Key Features
- Full booking lifecycle: draft → requested → accepted → en_route → arrived → diagnosing → quote_pending → quote_approved → in_progress → completed/cancelled/disputed
- Provider onboarding with document verification
- Quote submission and approval flow
- Review and rating system
- Dispute resolution
- Notification system
- Admin dashboard with stats, provider verification queue, booking oversight, and dispute center

## Database Tables
`service_categories`, `user_profiles`, `providers`, `provider_documents`, `provider_services`, `addresses`, `bookings`, `booking_photos`, `quotes`, `payments`, `reviews`, `disputes`, `notifications`, `users` (auth), `sessions` (auth)

## API Endpoints
- `GET /api/categories` — Service categories (public)
- `GET /api/me`, `PATCH /api/me` — User profile
- `GET /api/provider/me` — Provider profile
- `POST /api/provider/onboard` — Provider onboarding
- `PATCH /api/provider/availability` — Toggle availability
- `GET /api/provider/available-jobs` — Jobs matching provider's categories
- `GET /api/provider/my-jobs` — Provider's accepted jobs
- `POST /api/bookings` — Create booking
- `GET /api/bookings/my` — Customer's bookings
- `GET /api/bookings/:id` — Booking detail (with access control)
- `POST /api/bookings/:id/accept` — Provider accepts job
- `PATCH /api/bookings/:id/status` — Update booking status
- `POST /api/bookings/:id/quotes` — Submit quote
- `POST /api/quotes/:id/approve` — Customer approves quote
- `POST /api/bookings/:id/reviews` — Leave review
- `POST /api/bookings/:id/disputes` — Open dispute
- `GET/PATCH /api/notifications` — Notification management
- `GET /api/admin/stats` — Admin stats
- `GET /api/admin/providers` — All providers (admin)
- `PATCH /api/admin/providers/:id/verify` — Verify/unverify provider
- `GET /api/admin/bookings` — All bookings (admin)
- `GET /api/admin/disputes` — All disputes (admin)
- `PATCH /api/admin/disputes/:id` — Resolve dispute

## Design System
- **Brand color**: Warm orange (`hsl(14 90% 45%)`) for primary
- **Font**: Open Sans
- **Mobile-first** responsive layouts
- **Theme**: Light/dark mode supported via CSS variables

## Development Notes
- Service categories are seeded automatically on first startup
- Users set their role via the Profile page (admin/provider/customer)
- Providers must be verified by an admin before accepting jobs
- Stripe payment structure is ready (records exist) but live Stripe keys not integrated yet

## V2 Upgrade Ideas
1. Live Stripe checkout with payment intents
2. Real-time geolocation with provider distance ranking (Google Maps API)
3. WebSocket-based real-time booking status updates
4. File upload for booking photos and provider documents (S3/Cloudflare)
5. Push notifications (web push / email)
6. Provider earnings dashboard with payout tracking
7. Customer support chat
8. SMS notifications for ASAP bookings
