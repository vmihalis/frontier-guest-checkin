# Frontier Tower Guest Check-In

Production-ready visitor management system with QR code scanning, multi-guest support, and comprehensive business rule validation.

## Quick Start

```bash
npm install
npm run db:push      # Setup database
npm run db:seed      # Populate with test data
npm run dev          # Start development server
```

Navigate to `/checkin` for QR scanner or `/invites` for host dashboard.

## Battle-Tested Demo

Three QR codes ready for demo scenarios:

- **✅ Ms. Vicki Bruen** (`Shaun79@gmail.com`) - New check-in success
- **✅ Jorge Aufderhar** (`Javonte.Feil-Koelpin@hotmail.com`) - Re-entry success  
- **❌ Alexis Thiel** (`Alexanne19@suspicious`) - Blacklisted rejection

Perfect 2:1 success-to-failure ratio with realistic error handling.

## Key Features

- **Unified QR System** - Single multi-guest API handles individual and group scanning
- **Business Logic Validation** - Rolling 30-day limits, concurrent capacity, blacklist enforcement
- **12-Hour Visit Expiry** - Natural expiration without manual checkout
- **iPad Optimized Scanner** - Camera selection with Safari compatibility
- **Email Integration** - React Email templates with Resend API
- **Comprehensive Testing** - Multi-environment test suite with staging integration

## Architecture

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Database**: Prisma ORM + PostgreSQL/Supabase  
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **QR Scanning**: qr-scanner library with device optimization

## Database Commands

```bash
npm run db:generate   # Generate Prisma client
npm run db:push      # Push schema changes
npm run db:reset     # Reset and migrate
npm run db:studio    # Open database GUI
npm run db:seed      # Populate test data
```

## Testing

```bash
npm run test:multi      # Multi-guest scenarios
npm run test:scenarios  # Business logic validation
npm run test:staging    # Integration tests
```

---

See [CLAUDE.md](./CLAUDE.md) for complete development documentation.
