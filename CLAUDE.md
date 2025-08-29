# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Frontier Tower visitor management system - a Next.js application for managing guest check-ins across multiple tower locations with QR code scanning, role-based access, and comprehensive visit tracking.

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
npm run db:seed      # Populate database with test data
```

### Testing & Development
```bash
# Development Testing
npm run test:multi      # Multi-guest checkin scenarios
npm run test:scenarios  # Business logic scenarios  
npm run test:generate   # Generate test data
npm run test:all        # Run all development tests

# Integration Testing (requires staging DB)
npm run test:staging        # Basic staging environment tests
npm run test:staging:verify # Database connectivity verification
npm run test:staging:qr     # QR code workflow testing
npm run test:staging:full   # Complete integration test suite
```

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Database**: Prisma ORM with PostgreSQL
- **Email**: Resend API with React Email templates
- **QR Scanning**: qr-scanner library with iPad Safari optimization
- **Authentication**: Supabase Auth (integration in progress)
- **Testing**: Multi-environment test suite with Faker.js

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
- `/invites` - Host invitation management interface

### API Routes
- `POST /api/invitations` - Create guest invitations with email notifications
- `POST /api/invitations/[id]/accept` - Guest acceptance flow
- `POST /api/invitations/[id]/activate` - QR code activation
- `POST /api/invitations/[id]/admit` - Check-in processing
- `GET /api/guests/history` - Guest visit history and analytics
- `POST /api/checkin` - QR code check-in with email notifications

### Key Directories
- `src/lib/` - Core utilities (Prisma, email, QR, validation, timezone)
- `src/lib/email-templates/` - React Email components (InvitationEmail, DiscountEmail)
- `src/components/ui/` - shadcn/ui components (Button, Card, Input, Dialog, Table, etc.)
- `prisma/` - Database schema, migrations, and seed data
- `test/` - Development test suite with scenarios and utilities
- `test/integration/` - Staging environment integration tests

## Current Implementation Status

### ✅ Production-Ready Features
- **Database Foundation**: Prisma schema with relationships and indexing
- **QR Code System**: Multi-camera scanning with iPad Safari optimization  
- **Host Invitation App**: Complete invitation management at `/invites`
- **Email Integration**: Resend API with React Email templates
- **API Layer**: Full REST endpoints for invitations and check-in workflow
- **Testing Framework**: Multi-environment test suite with staging integration
- **UI Components**: Comprehensive shadcn/ui component library
- **Authentication Forms**: Login with validation and error handling
- **Guest Management**: History tracking, capacity limits, discount system

### 🚧 Planned Implementation
- **Locations table**: Multiple tower buildings support  
- **Kiosk Interface**: Manual lookup, override mode, badge printing
- **Admin Dashboard**: Analytics, policy settings, blacklist management
- **Production Auth**: Complete Supabase integration replacing mock auth

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

### Email System
- **Resend API Integration**: Production-ready email service with React Email templates
- **Template Components**: InvitationEmail and DiscountEmail with responsive design
- **Non-blocking Architecture**: Emails sent asynchronously with comprehensive error handling
- **Error Recovery**: Graceful fallbacks when email service unavailable
- **Template Features**: QR code display, countdown timers, branded styling

### Environment Setup
Required environment variables:
- `DATABASE_URL` - PostgreSQL database connection
- `DIRECT_URL` - Direct database connection for migrations
- `RESEND_API_KEY` - Resend API key for email notifications
- `EMAIL_FROM` - From address for system emails (e.g., noreply@yourdomain.com)

## Key Design Decisions
- **Prisma-first approach**: No Next.js built-in DB tools, pure Prisma workflow
- **Simple state management**: Timestamp-based state tracking, no complex state machines
- **24/7 building operation**: No overnight blocking logic
- **Clean data model**: Natural relationships, intuitive queries
- **Touch-optimized**: Designed for kiosk and iPad deployment
- **Role-based access**: Security through database-level permissions

## Immediate Next Steps
1. **Locations Table Implementation**: Add multi-tower building support to database schema
2. **Production Authentication**: Complete Supabase integration to replace mock auth system
3. **Kiosk Interface**: Build manual lookup and override functionality for security staff
4. **Admin Dashboard**: Create analytics, policy management, and blacklist administration
5. **Mobile Optimization**: Enhance responsive design for various device sizes
6. **Performance Optimization**: Implement caching and database query optimization
7. **Monitoring & Logging**: Add comprehensive error tracking and performance monitoring