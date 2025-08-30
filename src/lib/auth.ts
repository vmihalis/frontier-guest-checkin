import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { UserRole } from '@prisma/client';
import * as jose from 'jose';
import { isDemoMode, getDemoUser, logDemo } from './demo-config';

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
 * Authenticates a user with email and password
 * STUB IMPLEMENTATION: Verifies email exists in database but accepts any password
 */
export async function authenticateUser(
  email: string, 
  password: string
): Promise<AuthUser | null> {
  try {
    // Look up user in database - email must exist
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
      console.log(`Authentication failed: User not found in database: ${email}`);
      return null;
    }

    // STUB: Accept any password for development - just verify the user exists
    console.log(`Stub authentication successful for user: ${email} (password accepted: ${password.length} chars)`);
    
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
  // 🎭 DEMO MODE: Try JWT first, fallback to demo user if no valid JWT
  if (isDemoMode()) {
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization');
    let token: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      
      // Try to verify the JWT token
      try {
        const user = await verifyAuthToken(token);
        if (user) {
          logDemo('Using JWT user in demo mode', user);
          return {
            user,
            isAuthenticated: true,
          };
        }
      } catch {
        // JWT invalid, continue to demo fallback
      }
    }
    
    // Fallback to demo user if no valid JWT
    const demoUser = await getDemoUser();
    logDemo('Using fallback demo user for auth context', demoUser);
    return {
      user: demoUser,
      isAuthenticated: true,
    };
  }

  // 🔒 PRODUCTION AUTH: JWT-only authentication
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, isAuthenticated: false };
    }

    const token = authHeader.substring(7);

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