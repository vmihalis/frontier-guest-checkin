# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
BerlinHouse Members visitor management system - a Next.js application for managing guest check-ins across multiple tower locations with QR code scanning, role-based access, and comprehensive visit tracking.

## Development Commands

### Core Development
```bash
npm run dev           # Start development server with Turbopack
npm run build         # Production build with Turbopack  
npm run start         # Start production server
npm run lint          # Run ESLint
```

### Database Operations (Prisma)
```bash
npm run db:generate   # Generate Prisma client
npm run db:push      # Push schema changes to database
npm run db:migrate   # Create and run migrations
npm run db:reset     # Reset database and run all migrations
npm run db:studio    # Open Prisma Studio GUI
```

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Database**: Prisma ORM with PostgreSQL
- **QR Scanning**: qr-scanner library with iPad Safari optimization
- **Authentication**: Supabase Auth (integration in progress)

## Database Architecture

### Current Schema (Production-Ready Foundation)
- **users** - Hosts, admins, security staff with role-based permissions (UserRole enum)
- **guests** - Visitors with terms acceptance tracking and blacklist status
- **visits** - Core relationship linking guest + host with timestamps for state tracking
- **policies** - Global configuration for limits (guest monthly, host concurrent)

### Planned Expansion
- **locations** - Tower buildings (A, B, Main Lobby, etc.) for multi-location support

### Key Design Principles
- **Simple state tracking**: NULL timestamps indicate state (not checked in/out)
- **Clean joins**: Natural relationships without complex state machines
- **24/7 operation**: No artificial midnight cutoffs or expiry logic
- **UUID primary keys**: Database-generated with proper indexing

### Business Rules
- Guest monthly limit: Max visits per rolling 30 days (default: 3)
- Host concurrent limit: Max active guests per host (default: 3)
- Terms acceptance required before any visit creation
- Blacklist enforcement at both invitation and check-in levels

## Project Structure

### App Router Pages
- `/` - Landing page (placeholder)
- `/login` - Host authentication with form validation
- `/checkin` - QR code scanner with camera selection and iPad optimization

### Key Directories
- `lib/` - Database (Prisma) client configuration
- `src/components/ui/` - shadcn/ui components (Button, Card, Input, Label)
- `prisma/` - Database schema and migrations
- `api/` - Empty directory for future API routes

## Current Implementation Status

### ✅ Completed Foundation
- Prisma schema with proper relationships and indexing
- QR scanning with multi-camera support and iPad Safari compatibility
- Login form with validation and error handling
- UI component library setup with shadcn/ui

### 🚧 Planned Implementation
- **Locations table**: Multiple tower buildings support
- **Host App**: Invite guests, generate QR codes, view capacity
- **Kiosk Interface**: Manual lookup, override mode, badge printing
- **Admin Dashboard**: Analytics, policy settings, blacklist management

### Core Queries Pattern
All operations map to simple SQL patterns:
```sql
-- Monthly limit check
SELECT COUNT(*) FROM visits 
WHERE guest_id = $1 AND checked_in_at >= now() - interval '30 days';

-- Active guests per host
SELECT COUNT(*) FROM visits
WHERE host_id = $1 AND checked_in_at IS NOT NULL AND checked_out_at IS NULL;

-- Tower occupancy
SELECT l.name, COUNT(*) FROM visits v
JOIN locations l ON v.location_id = l.id
WHERE checked_in_at IS NOT NULL AND checked_out_at IS NULL
GROUP BY l.id, l.name;
```

## Development Guidelines

### Database Operations
- Always use Prisma client from `lib/prisma.ts`
- UUID primary keys with `@default(dbgenerated("gen_random_uuid()"))` 
- Use `@map` directives for snake_case database columns
- Proper indexing on frequently queried fields (guestId, hostId, checkedInAt)

### QR Scanner Implementation
- Uses qr-scanner library for broad device compatibility
- Prefers back/rear/environment cameras for better scanning
- Handles camera permissions gracefully with retry mechanism
- Optimized for iPad Safari (primary deployment target)

### Environment Setup
Required environment variables:
- `DATABASE_URL` - PostgreSQL database connection
- `DIRECT_URL` - Direct database connection for migrations

## Key Design Decisions
- **Prisma-first approach**: No Next.js built-in DB tools, pure Prisma workflow
- **Simple state management**: Timestamp-based state tracking, no complex state machines
- **24/7 building operation**: No overnight blocking logic
- **Clean data model**: Natural relationships, intuitive queries
- **Touch-optimized**: Designed for kiosk and iPad deployment
- **Role-based access**: Security through database-level permissions

## Immediate Next Steps
1. Implement locations table for multi-tower support
2. Build host invitation flow with QR code generation
3. Complete check-in logic with comprehensive limit enforcement
4. Add admin dashboard for policy and blacklist management
5. Create comprehensive mock data covering all edge cases