# Frontier Guest Check‑In

Production‑ready visitor management with QR scanning, capacity rules, and email flows.

### TL;DR
```bash
cp .env.example .env.local   # fill values (see Env)
npm install
npm run db:push
npm run db:seed
npm run dev
```
Open `/checkin` (scanner) and `/invites` (host dashboard).

### Env
Copy `.env.example` to `.env.local` and set at minimum:
- `DATABASE_URL` (PostgreSQL)
- `JWT_SECRET` (long random string)
- `NEXT_PUBLIC_APP_URL` (e.g. http://localhost:3000)
- For email: `RESEND_API_KEY` and `EMAIL_FROM`

We prefer a single DB var: `DATABASE_URL`. Optional: `DIRECT_URL` (Prisma migrations), `TEST_DATABASE_URL` (tests only), `OVERRIDE_PASSWORD` (capacity override), `DEMO_MODE` (dev only), `DEBUG`.

### Scripts
```bash
npm run dev            # Next.js dev (Turbopack)
npm run build          # Production build
npm run start          # Serve build

npm run db:generate    # Prisma client
npm run db:push        # Apply schema
npm run db:reset       # Reset DB locally
npm run db:studio      # Prisma Studio
npm run db:seed        # Seed demo data

npm run test:multi     # Guest batch scenarios
npm run test:scenarios # Business rules
npm run test:staging   # Integration (requires non-prod DB)
```

### System
- Next.js 15, React 19, TypeScript
- Prisma + PostgreSQL
- Tailwind CSS 4 + shadcn/ui
- Email via Resend

### What and Why
- This is a production-style guest check‑in for offices with security desks.
- Optimizes for kiosk/iPad scanning, fast admits, and auditable overrides.
- Encodes business rules in one place so policy changes are predictable and testable.

### Personas
- **Host**: invites guests, sees visit history.
- **Security**: operates scanner, approves overrides with password and reason.
- **Guest**: receives invite, accepts terms, presents QR code.

### Core Flows
- **Invitation**: Host creates invite → email with link → guest accepts terms.
- **Activation**: Invite gets QR (time‑boxed token) → guest arrives.
- **Check‑in**: Security scans QR → rules validated → visit created or re‑entry recognized.
- **Override**: If host capacity exceeded, security can approve with `OVERRIDE_PASSWORD` and reason.
- **Expiry**: Visits auto‑expire after 12 hours; no manual checkout required.

### Core Rules
- Guest monthly limit: max 3 visits in rolling 30 days.
- Host concurrent limit: max 3 active guests; overrideable with reason/password.
- Blacklist enforced at check‑in.
- Terms must be accepted before any visit is created.
- Third lifetime visit triggers discount email.

### Key Files
- API: `app/api/checkin/route.ts` — unified check‑in endpoint (single/batch guests, override + discount).
- Rules: `src/lib/validations.ts` — business rule evaluation.
- Auth: `src/lib/auth.ts`, `src/lib/demo-config.ts` — JWT + demo bypass.
- Email: `src/lib/email.ts`, templates in `src/lib/email-templates/`.
- QR: `src/lib/qr-token.ts` and scanner UI under `app/checkin/`.
- DB: `prisma/schema.prisma`, client in `src/lib/prisma.ts`.

### Demo Mode (dev only)
Set `DEMO_MODE=true` to bypass auth using seeded users. Do not enable in production; build will assert.

### Email
Set `RESEND_API_KEY` and `EMAIL_FROM`. Links use `NEXT_PUBLIC_APP_URL`.

### Deploy
1) Set env on your platform: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, optionally `DIRECT_URL`. Ensure `DEMO_MODE` is not enabled.
2) `npm run build && npm run start` or your platform’s Next.js adapter.
3) Run `npm run db:push` (or migrations pipeline) against your managed Postgres.

### Troubleshooting
- Missing `DATABASE_URL` or `RESEND_API_KEY` → startup/email warnings.
- Emails not sending → verify `EMAIL_FROM` and domain with Resend.
- Capacity override requires `OVERRIDE_PASSWORD` when enforced.

See `prisma/schema.prisma` for models and `test/` for flows.
