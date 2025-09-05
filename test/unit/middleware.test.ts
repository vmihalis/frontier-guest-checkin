/**
 * Unit tests for Next.js middleware
 * Tests authentication flow, route protection, and demo mode bypass
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock jose before any imports that might use it
jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
  SignJWT: jest.fn(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-jwt-token'),
  })),
  errors: {
    JWTExpired: class JWTExpired extends Error {},
  },
}));

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/demo-config');

import { middleware } from '@/middleware';

import { getAuthContext } from '@/lib/auth';
import { isDemoMode, logDemo } from '@/lib/demo-config';

const mockGetAuthContext = getAuthContext as jest.MockedFunction<typeof getAuthContext>;
const mockIsDemoMode = isDemoMode as jest.MockedFunction<typeof isDemoMode>;
const mockLogDemo = logDemo as jest.MockedFunction<typeof logDemo>;

describe('Middleware', () => {
  const createRequest = (pathname: string, baseUrl = 'https://test.com') => {
    return new NextRequest(new URL(pathname, baseUrl));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to production mode (not demo)
    mockIsDemoMode.mockReturnValue(false);
  });

  describe('demo mode bypass', () => {
    it('should bypass all checks in demo mode', async () => {
      mockIsDemoMode.mockReturnValue(true);
      
      const request = createRequest('/invites');
      const response = await middleware(request);
      
      expect(mockLogDemo).toHaveBeenCalledWith('Middleware bypassed for /invites');
      expect(mockGetAuthContext).not.toHaveBeenCalled();
      expect(response).toEqual(NextResponse.next());
    });
  });

  describe('production authentication', () => {
    beforeEach(() => {
      mockIsDemoMode.mockReturnValue(false);
    });

    describe('protected routes', () => {
      const protectedRoutes = ['/invites', '/dashboard'];

      it.each(protectedRoutes)('should redirect unauthenticated users from %s to login', async (route) => {
        mockGetAuthContext.mockResolvedValue({ isAuthenticated: false, user: null });
        
        const request = createRequest(route);
        const response = await middleware(request);
        
        expect(response.status).toBe(307); // NextResponse.redirect status
        expect(response.headers.get('location')).toContain('/login');
        expect(response.headers.get('location')).toContain(`redirect=${encodeURIComponent(route)}`);
      });

      it.each(protectedRoutes)('should allow authenticated users to access %s', async (route) => {
        mockGetAuthContext.mockResolvedValue({ 
          isAuthenticated: true, 
          user: { id: '1', email: 'test@example.com', role: 'host' }
        });
        
        const request = createRequest(route);
        const response = await middleware(request);
        
        expect(response).toEqual(NextResponse.next());
      });

      it('should handle nested protected routes', async () => {
        mockGetAuthContext.mockResolvedValue({ isAuthenticated: false, user: null });
        
        const request = createRequest('/invites/123');
        const response = await middleware(request);
        
        expect(response.status).toBe(307);
        expect(response.headers.get('location')).toContain('/login');
      });
    });

    describe('auth routes (login)', () => {
      it('should redirect authenticated users away from login', async () => {
        mockGetAuthContext.mockResolvedValue({ 
          isAuthenticated: true, 
          user: { id: '1', email: 'test@example.com', role: 'host' }
        });
        
        const request = createRequest('/login');
        const response = await middleware(request);
        
        expect(response.status).toBe(307);
        expect(response.headers.get('location')).toContain('/invites');
      });

      it('should allow unauthenticated users to access login', async () => {
        mockGetAuthContext.mockResolvedValue({ isAuthenticated: false, user: null });
        
        const request = createRequest('/login');
        const response = await middleware(request);
        
        expect(response).toEqual(NextResponse.next());
      });
    });

    describe('public routes', () => {
      const publicRoutes = ['/', '/checkin', '/accept/token123'];

      it.each(publicRoutes)('should allow access to public route %s regardless of auth status', async (route) => {
        mockGetAuthContext.mockResolvedValue({ isAuthenticated: false, user: null });
        
        const request = createRequest(route);
        const response = await middleware(request);
        
        expect(response).toEqual(NextResponse.next());
      });

      it.each(publicRoutes)('should allow authenticated users to access public route %s', async (route) => {
        mockGetAuthContext.mockResolvedValue({ 
          isAuthenticated: true, 
          user: { id: '1', email: 'test@example.com', role: 'host' }
        });
        
        const request = createRequest(route);
        const response = await middleware(request);
        
        expect(response).toEqual(NextResponse.next());
      });
    });

    describe('error handling', () => {
      it('should continue request on authentication error', async () => {
        mockGetAuthContext.mockRejectedValue(new Error('Auth service unavailable'));
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        const request = createRequest('/invites');
        const response = await middleware(request);
        
        expect(consoleSpy).toHaveBeenCalledWith('Middleware error:', expect.any(Error));
        expect(response).toEqual(NextResponse.next());
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('configuration', () => {
    const { config } = require('@/middleware');

    it('should have correct matcher configuration', () => {
      expect(config.matcher).toEqual([
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
      ]);
    });
  });
});