# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Frontier Tower visitor management system - a Next.js application for QR code guest check-ins with business rule validation, override system for security staff, and comprehensive email notifications.

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
npm run test:multi      # Guest batch checkin scenarios
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
- **Styling**: Tailwind CSS 4, shadcn/ui components with custom design system
- **Database**: Prisma ORM with PostgreSQL (no migrations, uses db:push)
- **Email**: Resend API with React Email templates
- **QR Scanning**: qr-scanner library with iPad Safari optimization
- **Authentication**: JWT-only production auth with DEMO_MODE bypass (see DEMO-MODE.md)
- **Testing**: Multi-environment test suite with Faker.js

## Database Architecture

### Production Schema
- **users** - Hosts, admins, security staff with role-based permissions (host/admin/security)
- **guests** - Visitors with blacklist status, contact methods, terms acceptance tracking
- **visits** - Core relationship linking guest + host with override tracking and expiration
- **invitations** - QR-enabled invitations with status tracking (PENDING/ACTIVATED/CHECKED_IN/EXPIRED)
- **acceptances** - Terms and visitor agreement acceptance records
- **discounts** - Third-visit discount tracking with email confirmation
- **policies** - Global configuration (guest monthly: 3, host concurrent: 3)

### Key Design Principles
- **Simple state tracking**: NULL timestamps indicate state (not checked in/out)
- **Clean joins**: Natural relationships without complex state machines
- **12-hour visit expiration**: Automatic expiry without manual checkout
- **UUID primary keys**: Database-generated with proper indexing
- **Override system**: Security staff can bypass capacity limits with reason/password

### Business Rules
- Guest monthly limit: Max 3 visits per rolling 30 days
- Host concurrent limit: Max 3 active guests per host (can be overridden)
- Terms acceptance required before any visit creation
- Blacklist enforcement at check-in level
- Third lifetime visit triggers discount email

## Project Structure

### App Router Pages
- `/` - Landing page (placeholder)
- `/login` - Host authentication with form validation
- `/checkin` - **QR CODE SCANNER** - Multi-camera QR scanning with override system for security staff
- `/invites` - **HOST DASHBOARD** - Complete invitation management interface for hosts
- **PLANNED**: Admin console for analytics, policy management, blacklist administration

### API Routes (Current)
- `POST /api/checkin` - **UNIFIED CHECK-IN API** - Handles single and multiple guest check-ins with overrides
- `POST /api/invitations` - Create guest invitations with email notifications
- `POST /api/invitations/[id]/accept` - Guest acceptance flow
- `POST /api/invitations/[id]/activate` - QR code activation
- `POST /api/invitations/[id]/admit` - Check-in processing
- `GET /api/guests/history` - Guest visit history and analytics
- `GET /api/auth/me` - Current user info
- `POST /api/auth/login` - Authentication
- `POST /api/auth/logout` - Sign out

### QR Code Format Handling (Critical)
**IMPORTANT**: The `/api/checkin` endpoint must support ALL QR code formats to prevent parsing failures:

#### Supported QR Formats:
1. **Raw JSON Guest Batch** (sent as `token` field):
   ```json
   {"guests":[{"e":"email@domain.com","n":"Full Name"},{"e":"email2@domain.com","n":"Name Two"}]}
   ```
2. **Base64 Single Guest Token** (legacy format):
   ```
   eyJpbnZpdGVJZCI6IjEyMyIsImZdZXN0RW1haWwiOiJ0ZXN0QGVtYWlsLmNvbSJ9...
   ```
3. **Direct Guest Object** (sent as `guest` field):
   ```json
   {"e":"email@domain.com","n":"Full Name"}
   ```
4. **Guest Array** (sent as `guests` field):
   ```json
   [{"e":"email1@domain.com","n":"Name 1"},{"e":"email2@domain.com","n":"Name 2"}]
   ```

#### Implementation Requirements:
- **Frontend**: Must attempt parsing but NEVER fail on unknown formats - always fallback to sending raw data to API
- **Backend**: Must try JSON parsing first, then base64 decoding as fallback
- **Error Handling**: Provide specific business rule error messages, not generic "invalid format"
- **Logging**: Include detailed QR parsing logs for debugging format issues

### Key Components
- **OverrideDialog** - Security override UI for capacity limits with password validation
- **GuestSelection** - Guest batch QR code selection interface
- **QR Scanner** - Camera-optimized scanning with device selection
- **Design System** - Comprehensive UI kit documented in DESIGN_SYSTEM.md

### Core Libraries
- `src/lib/validations.ts` - **CRITICAL** - All business rule validation logic
- `src/lib/qr-token.ts` - QR code parsing and guest data handling
- `src/lib/email.ts` - Resend integration with React Email templates
- `src/lib/auth.ts` - Authentication with DEMO_MODE bypass capability
- `src/lib/demo-config.ts` - Hackathon/demo mode configuration
- `src/lib/timezone.ts` - LA timezone utilities and visit expiration calculation
- `src/lib/prisma.ts` - Database client

## Current Implementation Status

### ✅ Production-Ready Features
- **QR Code Check-in System**: Multi-camera scanning optimized for iPad Safari
- **Business Rule Validation**: Rolling limits, capacity checks, blacklist enforcement
- **Security Override System**: Password-protected capacity limit bypasses with audit trail
- **Email Integration**: Invitation emails and discount notifications via Resend API
- **Demo Mode Toggle**: Hackathon-ready authentication bypass (see DEMO-MODE.md)
- **Batch Guest QR Support**: Single QR codes for multiple visitors
- **12-hour Visit Expiry**: Automatic visit expiration without manual checkout
- **Discount System**: Third-visit discount emails with tracking
- **Design System**: Comprehensive UI components with Frontier Tower branding

### ✅ API Route Status
- **Unified Check-in API** - `/api/checkin` handles both single and multiple guest scenarios
- **Simplified Architecture** - Single endpoint eliminated complexity and user confusion
- **Backward Compatible** - Supports legacy QR tokens and new guest batch formats

### 🔧 Demo/Hackathon Mode
- **DEMO_MODE Environment Variable**: Bypasses authentication for demonstrations
- **Production Safety**: Build fails if DEMO_MODE=true in production
- **Surgical Bypass**: No API route changes, only auth library modifications
- **Real Database Users**: Uses actual seeded host users, not mock data

### 📋 Testing Infrastructure
- **Battle-tested QR Codes**: 3 demo QR codes with realistic success/failure scenarios
- **Multi-environment**: Development and staging integration tests
- **Comprehensive Coverage**: Business logic, API endpoints, database operations

### 🚧 Planned Implementation
- **Admin Console**: Analytics dashboard, policy management, blacklist administration, user management
- **Locations Table**: Multiple tower buildings support for multi-location deployments  
- **Kiosk Interface**: Manual guest lookup, walk-in registration, badge printing capabilities
- **Advanced Features**: Visit analytics, capacity reporting, guest history search

## Development Guidelines

### Code Quality & Testing Principles
- **Surgical Integration**: NEVER create massive functions or blow up line counts - integrate changes into existing code surgically
- **Test Coverage**: Add regression tests by enhancing existing test functions, not creating new 150+ line test monsters
- **Data Consistency**: Use atomic transactions for multi-table operations (visits + invitation status updates)
- **Implementation Over Analysis**: Focus on code changes and real fixes, not lengthy planning documents

### Database Operations
- **No migrations**: Uses `npm run db:push` for schema changes
- **UUID primary keys**: Database-generated with `@default(dbgenerated("gen_random_uuid("))` 
- **Snake_case mapping**: Use `@map` directives for database columns
- **Proper indexing**: On guestId, hostId, checkedInAt, qrToken fields
- **Atomic Transactions**: Critical for data integrity - visit creation must update invitation status atomically

### QR Scanner Implementation
- **Primary deployment target**: iPad Safari
- **Camera selection**: Prefers back/rear/environment cameras
- **Permission handling**: Graceful retry mechanism for camera access
- **Multi-format support**: QR codes, barcodes, and major code formats

### Business Logic Validation
- **Central validation**: All rules in `src/lib/validations.ts`
- **Override system**: Security/admin roles can bypass capacity limits
- **Audit trail**: All overrides logged with reason, password, and user
- **Time cutoff**: 11:59 PM entry cutoff (configurable)

### Email System
- **Resend API**: Production-ready email service
- **React Email Templates**: InvitationEmail and DiscountEmail
- **Non-blocking**: Email failures don't block check-ins
- **Discount trigger**: Automatic on third lifetime visit

### Environment Setup
Use `.env.example` as the source of truth. Minimum required:
- `DATABASE_URL` — PostgreSQL connection (single var across environments)
- `JWT_SECRET` — long random string for JWT signing
- `NEXT_PUBLIC_APP_URL` — base URL for links/emails
- For email: `RESEND_API_KEY`, `EMAIL_FROM`

Optional:
- `DIRECT_URL` — direct DB connection for Prisma migrations (no pooling)
- `TEST_DATABASE_URL` — isolated DB for tests (otherwise uses `DATABASE_URL`)
- `OVERRIDE_PASSWORD` — capacity override approval at kiosk
- `DEMO_MODE` — dev-only bypass; build asserts if enabled for prod
- `DEBUG` — extra logging in dev/tests

## Authentication Strategy

### Production Authentication (JWT-Only)
- **Token Storage**: Client-side localStorage (`auth-token`)
- **API Authentication**: `Authorization: Bearer <token>` headers only
- **No Cookies**: Completely eliminated server-side cookie handling
- **Token Lifecycle**: 24-hour expiration, client-side logout clears localStorage
- **Security**: All API routes require valid JWT tokens for authentication

### Demo Mode (Development Only)
- **Environment Toggle**: `DEMO_MODE=true` enables permissive authentication
- **Fallback Behavior**: Uses real database users when JWT missing/invalid
- **User Validation**: Still verifies user emails exist in database
- **Build Safety**: Production builds fail if DEMO_MODE enabled
- **Use Case**: Hackathons, demos, development without complex auth setup

### API Route Authentication
All protected routes use unified `getCurrentUserId(request)` which:
1. **Production Mode**: Requires valid JWT token, returns user ID or throws error
2. **Demo Mode**: Tries JWT first, falls back to first available host user
3. **Consistent Interface**: Same function signature regardless of mode

## Architectural Notes

### Application Architecture
1. **QR Check-in Flow**: `/checkin` page with scanner → `/api/checkin` → database
2. **Host Invitation Flow**: `/invites` dashboard → invitation APIs → email notifications
3. **Admin Management**: Planned admin console for analytics and policy management
4. **Unified API**: Single endpoint handles all guest check-in scenarios

### Override System
- **Capacity limits** can be overridden by security/admin staff
- **Password required** for override approval
- **Reason required** for audit compliance
- **All overrides logged** with user, timestamp, and justification

### Design Philosophy
- **Touch-optimized interfaces** for kiosk deployment
- **iPad Safari primary target** for QR scanning
- **Clean, professional aesthetic** suitable for office environments
- **Comprehensive design system** documented in DESIGN_SYSTEM.md

## Key Files Modified Recently
- Modified files per git status: unified check-in route, QR scanner page, validations
- New files: OverrideDialog component, DESIGN_SYSTEM.md documentation

## Core Application Features
1. **QR Code Check-in** (`/checkin`) - Multi-camera scanner with security override system
2. **Host Dashboard** (`/invites`) - Complete invitation management for hosts 
3. **Admin Console** (planned) - Analytics, policy management, blacklist administration
4. **API Layer** - Comprehensive REST endpoints for all workflows
5. **Email System** - Automated invitations and discount notifications

## Immediate Development Priorities
1. **Admin Console Implementation** - Analytics dashboard, user management, policy settings
2. **Enhanced Security Features** - Improved override workflows and audit trails  
3. **Performance Optimization** - Database query optimization and UI responsiveness
4. **Multi-Location Support** - Locations table for multiple tower buildings
5. **Advanced Analytics** - Visit analytics, capacity reporting, guest history search