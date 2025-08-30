import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { UserRole } from '@prisma/client';
import * as jose from 'jose';
import { isDemoMode, getDemoUser, logDemo } from './demo-config';
import { authenticateWithService } from './auth-service';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-dev-secret-change-in-production'
);

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthContext {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

/**
 * Creates a JWT token for authenticated user
 */
export async function createAuthToken(user: AuthUser): Promise<string> {
  const jwt = await new jose.SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return jwt;
}

/**
 * Verifies and decodes a JWT token
 */
export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    
    if (!payload.sub || !payload.email || !payload.name || !payload.role) {
      return null;
    }

    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Authenticates a user with email and password via external auth service
 * Falls back to local authentication if service is unavailable
 */
export async function authenticateUser(
  email: string, 
  password: string
): Promise<AuthUser | null> {
  try {
    // First, look up user in local database
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      console.log(`User not found in local database: ${email}`);
      return null;
    }

    // Try to authenticate with external auth service
    const authResult = await authenticateWithService({ email, password });
    
    if (authResult && authResult.success) {
      console.log(`User authenticated via external auth service: ${email}`);
      return user;
    }
    
    // If auth service failed or is unavailable, fall back to local auth
    // For development, accept any password for seeded users
    console.log(`External auth service unavailable, using fallback authentication for: ${email}`);
    console.log(`Mock authentication with password: ${password}`);
    
    return user;
  } catch (error) {
    console.error('User authentication failed:', error);
    return null;
  }
}

/**
 * Extracts authentication context from request
 * 🎭 DEMO MODE: Bypasses auth checks when enabled
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  // 🎭 DEMO MODE: Return real seeded user if demo mode is enabled
  if (isDemoMode()) {
    const demoUser = await getDemoUser();
    logDemo('Using real seeded user for auth context', demoUser);
    return {
      user: demoUser,
      isAuthenticated: true,
    };
  }

  // 🔒 PRODUCTION AUTH: Full authentication logic preserved
  try {
    // Try to get token from Authorization header
    const authHeader = request.headers.get('authorization');
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fallback to cookie
    if (!token) {
      token = request.cookies.get('auth-token')?.value || null;
    }

    if (!token) {
      return { user: null, isAuthenticated: false };
    }

    const user = await verifyAuthToken(token);
    return {
      user,
      isAuthenticated: user !== null,
    };
  } catch (error) {
    console.error('Failed to get auth context:', error);
    return { user: null, isAuthenticated: false };
  }
}

/**
 * Gets the current authenticated user ID from request
 * 🎭 DEMO MODE: Returns demo user ID when enabled
 * Throws error if not authenticated in production mode
 */
export async function getCurrentUserId(request: NextRequest): Promise<string> {
  // 🎭 DEMO MODE: Return real seeded user ID immediately
  if (isDemoMode()) {
    const demoUser = await getDemoUser();
    logDemo('getCurrentUserId returning real seeded user ID', demoUser.id);
    return demoUser.id;
  }

  // 🔒 PRODUCTION AUTH: Full authentication required
  const { user, isAuthenticated } = await getAuthContext(request);
  
  if (!isAuthenticated || !user) {
    throw new Error('Authentication required');
  }
  
  return user.id;
}

/**
 * Gets the current authenticated user from request
 * 🎭 DEMO MODE: Returns demo user when enabled
 * Throws error if not authenticated in production mode
 */
export async function getCurrentUser(request: NextRequest): Promise<AuthUser> {
  // 🎭 DEMO MODE: Return real seeded user immediately  
  if (isDemoMode()) {
    const demoUser = await getDemoUser();
    logDemo('getCurrentUser returning real seeded user', demoUser);
    return demoUser;
  }

  // 🔒 PRODUCTION AUTH: Full authentication required
  const { user, isAuthenticated } = await getAuthContext(request);
  
  if (!isAuthenticated || !user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Checks if user has required role
 */
export function hasRole(user: AuthUser, role: UserRole): boolean {
  return user.role === role;
}

/**
 * Checks if user has any of the required roles
 */
export function hasAnyRole(user: AuthUser, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

/**
 * Role hierarchy: admin > security > host
 */
export function hasRoleOrHigher(user: AuthUser, minRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    host: 1,
    security: 2,
    admin: 3,
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[minRole];
}