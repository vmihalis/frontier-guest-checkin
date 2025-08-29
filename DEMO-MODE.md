# 🎭 DEMO MODE TOGGLE

**SURGICAL AUTHENTICATION BYPASS FOR HACKATHON DEMO**

## 🚀 Quick Start

### Enable Demo Mode (Hackathon)
```bash
# Option 1: Environment variable
export DEMO_MODE=true
npm run dev

# Option 2: Start with demo mode
DEMO_MODE=true npm run dev
```

### Disable Demo Mode (Production)
```bash
# Option 1: Remove environment variable
unset DEMO_MODE
npm run dev

# Option 2: Explicitly disable
DEMO_MODE=false npm run dev

# Option 3: No env var (defaults to false)
npm run dev
```

## 🎯 What Demo Mode Does

### ✅ BYPASSED (Demo Mode ON)
- ❌ **No login required** - All routes accessible
- ❌ **No JWT validation** - API routes accept all requests  
- ❌ **No middleware redirects** - Direct access to /invites, /checkin
- ❌ **No authentication errors** - Mock user used everywhere

### 🔒 ENFORCED (Demo Mode OFF)
- ✅ **Full authentication** - Login required for protected routes
- ✅ **JWT token validation** - API routes require valid tokens
- ✅ **Middleware protection** - Redirects to login when needed
- ✅ **Database user lookup** - Real authentication flow

## 🎭 Demo User Profile
When demo mode is active, all requests use the **first real host user** from your seeded database:
- ✅ **Real database user** - Not a fake/mock user
- ✅ **Actual host permissions** - Full access to create invitations
- ✅ **Database relationships work** - All foreign keys valid
- ✅ **No contrived data** - Uses your actual seeded host users

## 🛡️ Production Safety

### Build-Time Protection
- ✅ Production builds with `DEMO_MODE=true` will **fail**
- ✅ Prevents accidental demo deployment

### Runtime Warnings
- 🎭 Demo mode logs all bypassed auth checks (development only)
- 📝 Clear console indicators when demo mode is active

## 📁 Files Modified

### Core Auth System
- `src/lib/demo-config.ts` - Demo mode configuration and controls
- `src/lib/auth.ts` - Auth functions with demo bypasses
- `src/middleware.ts` - Route protection with demo bypasses

### No API Route Changes
- ✅ **Zero changes** to existing API route files
- ✅ **Surgical injection** via auth library
- ✅ **Complete preservation** of production auth logic

## 🔥 Hackathon Workflow

### Pre-Demo (Enable Demo Mode)
```bash
# 1. Enable demo mode
export DEMO_MODE=true

# 2. Start app - no auth required
npm run dev

# 3. Verify demo mode active (check console for 🎭 logs)
```

### Post-Hackathon (Production Ready)
```bash
# 1. Disable demo mode  
unset DEMO_MODE

# 2. Build for production
npm run build

# 3. Deploy - full authentication restored
npm start
```

## ⚡ Emergency Production Toggle

If demo mode accidentally gets to production:

### Environment Variables
```bash
# Heroku/Vercel
DEMO_MODE=false

# Docker
ENV DEMO_MODE=false

# Local
export DEMO_MODE=false
```

### Code Toggle (Emergency)
```typescript
// src/lib/demo-config.ts line 27
const FORCE_DEMO_MODE = false; // <- Set to false
```

## 🧪 Testing Both Modes

### Test Demo Mode
```bash
DEMO_MODE=true npm run dev
# Should access /invites directly without login
```

### Test Production Mode  
```bash
DEMO_MODE=false npm run dev
# Should redirect to /login when accessing /invites
```

## 🎖️ Benefits

✅ **Zero code deletion** - All auth code preserved  
✅ **Instant toggle** - Single environment variable  
✅ **Safe production** - Build-time protection  
✅ **Clean rollback** - One-line change to restore auth  
✅ **Type safe** - Full TypeScript support maintained  

---

**🏆 WIN THE HACKATHON → FLIP THE SWITCH → PRODUCTION READY**