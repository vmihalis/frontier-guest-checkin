/**
 * Simple hackathon authentication - just check if email exists in database
 * Any password works, no real security (for demo only!)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import type { User as PrismaUser, UserRole } from '@prisma/client';

const SESSION_COOKIE = 'frontier-session';

/**
 * Get the current authenticated user from the database
 * @param request - Next.js request object with cookies
 * @returns Prisma User object if authenticated, null otherwise
 */
export async function getCurrentUser(request: NextRequest): Promise<PrismaUser | null> {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE);
    
    if (!sessionCookie) {
      return null;
    }

    // For hackathon: session cookie just contains the user ID directly
    const userId = sessionCookie.value;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get the current user ID (replacement for getCurrentUserId mock functions)
 * @param request - Next.js request object with cookies
 * @returns User ID string if authenticated
 * @throws Error if user is not authenticated
 */
export async function getCurrentUserId(request: NextRequest): Promise<string> {
  const user = await getCurrentUser(request);
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return user.id;
}

/**
 * Middleware helper to protect API routes
 * @param request - Next.js request object
 * @param allowedRoles - Optional array of roles allowed to access this route
 * @returns Object with user data if authorized, or error response
 */
export async function requireAuth(
  request: NextRequest,
  allowedRoles?: UserRole[]
): Promise<{ user: PrismaUser } | { error: NextResponse }> {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return {
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        ),
      };
    }

    // Check role permissions if specified
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return {
        error: NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        ),
      };
    }

    return { user };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      ),
    };
  }
}

/**
 * Sign in a user with email (password is ignored for hackathon)
 * @param email - User email
 * @param _password - Password (ignored)
 * @returns Success/error response with user data
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function signInUser(email: string, _password: string) {
  try {
    // Find user in database by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: 'Email not found in database', user: null };
    }

    // For hackathon: any password works, just return the user
    return { error: null, user };
  } catch (error) {
    console.error('Sign in error:', error);
    return { error: 'Sign in failed', user: null };
  }
}

/**
 * Create a session response with cookie
 * @param user - User to create session for
 * @returns NextResponse with session cookie
 */
export function createSessionResponse(user: PrismaUser): NextResponse {
  const response = NextResponse.json({ 
    success: true, 
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
  
  // Set session cookie (just the user ID for simplicity)
  response.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return response;
}

/**
 * Clear session cookie
 * @returns NextResponse with cleared session cookie
 */
export function clearSessionResponse(): NextResponse {
  const response = NextResponse.json({ success: true, message: 'Signed out' });
  
  response.cookies.delete(SESSION_COOKIE);
  
  return response;
}

/**
 * Check if user has specific role
 * @param user - Prisma User object
 * @param role - Role to check
 * @returns boolean
 */
export function hasRole(user: PrismaUser, role: UserRole): boolean {
  return user.role === role;
}

/**
 * Check if user has any of the specified roles
 * @param user - Prisma User object
 * @param roles - Array of roles to check
 * @returns boolean
 */
export function hasAnyRole(user: PrismaUser, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}