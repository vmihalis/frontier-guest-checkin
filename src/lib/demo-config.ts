/**
 * Demo Mode Configuration
 * 
 * SURGICAL DEMO TOGGLE - Preserves all production auth code
 * 
 * TO ENABLE DEMO MODE:
 * - Set DEMO_MODE=true in environment variables
 * - Or toggle isDemoMode below for immediate effect
 * 
 * TO RESTORE PRODUCTION:
 * - Set DEMO_MODE=false or remove the env var
 * - All auth code remains intact and functional
 */

export interface DemoConfig {
  /** Enable/disable demo mode - bypasses all authentication */
  isDemoMode: boolean;
  /** Skip middleware redirects in demo mode */
  skipMiddleware: boolean;
  /** Log demo mode activities */
  logDemoActions: boolean;
}

// 🎭 DEMO MODE TOGGLE - Change this for instant demo enable/disable
const FORCE_DEMO_MODE = process.env.NODE_ENV === 'development' && process.env.DEMO_MODE === 'true';

export const demoConfig: DemoConfig = {
  isDemoMode: FORCE_DEMO_MODE || process.env.DEMO_MODE === 'true',
  skipMiddleware: true,
  logDemoActions: process.env.NODE_ENV === 'development',
};

/**
 * Check if we're currently in demo mode
 */
export function isDemoMode(): boolean {
  return demoConfig.isDemoMode;
}

/**
 * Get a real demo user from the database  
 * Uses a specific demo user with known email for consistency
 */
export async function getDemoUser() {
  const { prisma } = await import('./prisma');
  
  // First try to find our specific demo user
  let hostUser = await prisma.user.findUnique({
    where: { email: 'demo.host@frontier.dev' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  // If demo user doesn't exist, fallback to any host user
  if (!hostUser) {
    hostUser = await prisma.user.findFirst({
      where: { role: 'host' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: { email: 'asc' }, // For consistency, always pick same user
    });
  }
  
  if (!hostUser) {
    throw new Error('No host user found in database. Run npm run db:seed first.');
  }
  
  return hostUser;
}

/**
 * Log demo mode actions (only in development)
 */
export function logDemo(message: string, data?: unknown): void {
  if (demoConfig.logDemoActions) {
    console.log(`🎭 [DEMO MODE] ${message}`, data ? data : '');
  }
}

/**
 * Assert we're not accidentally in demo mode in production builds
 * Only checks during build-time, not runtime
 */
export function assertNotDemoInProduction(): void {
  // Only run this check if we're doing a production build
  const isProductionBuild = process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build';
  
  if (isProductionBuild && isDemoMode()) {
    throw new Error('🚨 CRITICAL: Demo mode is enabled in production! Set DEMO_MODE=false');
  }
}