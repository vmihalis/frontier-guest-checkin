/**
 * Comprehensive unit tests for authentication system
 * Tests JWT handling, role-based access, demo mode, and edge cases
 */

import { NextRequest } from 'next/server';
import {
  createAuthToken,
  verifyAuthToken,
  authenticateUser,
  getAuthContext,
  getCurrentUserId,
  getCurrentUser,
  hasRole,
  hasAnyRole,
  hasRoleOrHigher,
  AuthUser,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as jose from 'jose';
import { isDemoMode, getDemoUser } from '@/lib/demo-config';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

// Mock demo config
jest.mock('@/lib/demo-config', () => ({
  isDemoMode: jest.fn(() => false),
  getDemoUser: jest.fn(),
  logDemo: jest.fn(),
}));

// Mock JWT secret
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    JWT_SECRET: 'test-secret-key-for-testing-only',
  };
});
afterAll(() => {
  process.env = originalEnv;
});

describe('Authentication System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isDemoMode as jest.Mock).mockReturnValue(false);
  });

  describe('createAuthToken', () => {
    it('should create valid JWT token', async () => {
      const user: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'host',
      };

      const token = await createAuthToken(user);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should include all user data in token', async () => {
      const user: AuthUser = {
        id: 'user-456',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
      };

      const token = await createAuthToken(user);
      const decoded = await verifyAuthToken(token);
      
      expect(decoded).toEqual(user);
    });

    it('should set expiration time', async () => {
      const user: AuthUser = {
        id: 'user-789',
        email: 'test@example.com',
        name: 'Test User',
        role: 'host',
      };

      const token = await createAuthToken(user);
      
      // Decode without verification to check claims
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
      expect(payload.exp - payload.iat).toBe(86400); // 24 hours in seconds
    });
  });

  describe('verifyAuthToken', () => {
    it('should verify valid token', async () => {
      const user: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'security',
      };

      const token = await createAuthToken(user);
      const verified = await verifyAuthToken(token);
      
      expect(verified).toEqual(user);
    });

    it('should reject expired token', async () => {
      // Create token with past expiration
      const jwt = await new jose.SignJWT({
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'host',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 86401)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
        .sign(new TextEncoder().encode(process.env.JWT_SECRET!));

      const result = await verifyAuthToken(jwt);
      
      expect(result).toBeNull();
    });

    it('should reject token with invalid signature', async () => {
      const jwt = await new jose.SignJWT({
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'host',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(new TextEncoder().encode('wrong-secret'));

      const result = await verifyAuthToken(jwt);
      
      expect(result).toBeNull();
    });

    it('should reject token with missing required fields', async () => {
      const jwt = await new jose.SignJWT({
        sub: 'user-123',
        // Missing email, name, role
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET!));

      const result = await verifyAuthToken(jwt);
      
      expect(result).toBeNull();
    });

    it('should reject malformed token', async () => {
      const result = await verifyAuthToken('not.a.valid.token');
      
      expect(result).toBeNull();
    });

    it('should reject empty token', async () => {
      const result = await verifyAuthToken('');
      
      expect(result).toBeNull();
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate existing user with any password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'host',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await authenticateUser('test@example.com', 'any-password');
      
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
    });

    it('should reject non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authenticateUser('nonexistent@example.com', 'password');
      
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const result = await authenticateUser('test@example.com', 'password');
      
      expect(result).toBeNull();
    });

    it('should handle special characters in email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test+tag@sub.example.com',
        name: 'Test User',
        role: 'host',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await authenticateUser('test+tag@sub.example.com', 'password');
      
      expect(result).toEqual(mockUser);
    });
  });

  describe('getAuthContext', () => {
    const mockRequest = (headers: Record<string, string> = {}) => {
      return {
        headers: {
          get: (name: string) => headers[name.toLowerCase()] || null,
        },
      } as NextRequest;
    };

    describe('Production Mode', () => {
      beforeEach(() => {
        (isDemoMode as jest.Mock).mockReturnValue(false);
      });

      it('should extract valid JWT from Authorization header', async () => {
        const user: AuthUser = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'host',
        };
        const token = await createAuthToken(user);
        const request = mockRequest({ authorization: `Bearer ${token}` });

        const context = await getAuthContext(request);
        
        expect(context.isAuthenticated).toBe(true);
        expect(context.user).toEqual(user);
      });

      it('should reject missing Authorization header', async () => {
        const request = mockRequest({});

        const context = await getAuthContext(request);
        
        expect(context.isAuthenticated).toBe(false);
        expect(context.user).toBeNull();
      });

      it('should reject invalid Bearer format', async () => {
        const request = mockRequest({ authorization: 'InvalidFormat token' });

        const context = await getAuthContext(request);
        
        expect(context.isAuthenticated).toBe(false);
        expect(context.user).toBeNull();
      });

      it('should handle invalid JWT gracefully', async () => {
        const request = mockRequest({ authorization: 'Bearer invalid.jwt.token' });

        const context = await getAuthContext(request);
        
        expect(context.isAuthenticated).toBe(false);
        expect(context.user).toBeNull();
      });
    });

    describe('Demo Mode', () => {
      beforeEach(() => {
        (isDemoMode as jest.Mock).mockReturnValue(true);
      });

      it('should use JWT if valid in demo mode', async () => {
        const user: AuthUser = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'host',
        };
        const token = await createAuthToken(user);
        const request = mockRequest({ authorization: `Bearer ${token}` });

        const context = await getAuthContext(request);
        
        expect(context.isAuthenticated).toBe(true);
        expect(context.user).toEqual(user);
      });

      it('should fallback to demo user if no JWT', async () => {
        const demoUser: AuthUser = {
          id: 'demo-user',
          email: 'demo@example.com',
          name: 'Demo User',
          role: 'host',
        };
        (getDemoUser as jest.Mock).mockResolvedValue(demoUser);
        const request = mockRequest({});

        const context = await getAuthContext(request);
        
        expect(context.isAuthenticated).toBe(true);
        expect(context.user).toEqual(demoUser);
      });

      it('should fallback to demo user if JWT invalid', async () => {
        const demoUser: AuthUser = {
          id: 'demo-user',
          email: 'demo@example.com',
          name: 'Demo User',
          role: 'host',
        };
        (getDemoUser as jest.Mock).mockResolvedValue(demoUser);
        const request = mockRequest({ authorization: 'Bearer invalid.token' });

        const context = await getAuthContext(request);
        
        expect(context.isAuthenticated).toBe(true);
        expect(context.user).toEqual(demoUser);
      });
    });
  });

  describe('getCurrentUserId', () => {
    const mockRequest = (headers: Record<string, string> = {}) => {
      return {
        headers: {
          get: (name: string) => headers[name.toLowerCase()] || null,
        },
      } as NextRequest;
    };

    it('should return user ID from valid JWT', async () => {
      const user: AuthUser = {
        id: 'user-999',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
      };
      const token = await createAuthToken(user);
      const request = mockRequest({ authorization: `Bearer ${token}` });

      const userId = await getCurrentUserId(request);
      
      expect(userId).toBe('user-999');
    });

    it('should throw error if not authenticated', async () => {
      const request = mockRequest({});

      await expect(getCurrentUserId(request)).rejects.toThrow('Authentication required');
    });

    it('should return demo user ID in demo mode', async () => {
      (isDemoMode as jest.Mock).mockReturnValue(true);
      (getDemoUser as jest.Mock).mockResolvedValue({
        id: 'demo-123',
        email: 'demo@example.com',
        name: 'Demo User',
        role: 'host',
      });
      const request = mockRequest({});

      const userId = await getCurrentUserId(request);
      
      expect(userId).toBe('demo-123');
    });
  });

  describe('getCurrentUser', () => {
    const mockRequest = (headers: Record<string, string> = {}) => {
      return {
        headers: {
          get: (name: string) => headers[name.toLowerCase()] || null,
        },
      } as NextRequest;
    };

    it('should return full user object from valid JWT', async () => {
      const user: AuthUser = {
        id: 'user-888',
        email: 'full@example.com',
        name: 'Full User',
        role: 'security',
      };
      const token = await createAuthToken(user);
      const request = mockRequest({ authorization: `Bearer ${token}` });

      const currentUser = await getCurrentUser(request);
      
      expect(currentUser).toEqual(user);
    });

    it('should throw error if not authenticated', async () => {
      const request = mockRequest({});

      await expect(getCurrentUser(request)).rejects.toThrow('Authentication required');
    });
  });

  describe('Role Checking Functions', () => {
    const testUser: AuthUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'security',
    };

    describe('hasRole', () => {
      it('should return true for matching role', () => {
        expect(hasRole(testUser, 'security')).toBe(true);
      });

      it('should return false for non-matching role', () => {
        expect(hasRole(testUser, 'admin')).toBe(false);
        expect(hasRole(testUser, 'host')).toBe(false);
      });
    });

    describe('hasAnyRole', () => {
      it('should return true if user has any listed role', () => {
        expect(hasAnyRole(testUser, ['admin', 'security'])).toBe(true);
        expect(hasAnyRole(testUser, ['security', 'host'])).toBe(true);
      });

      it('should return false if user has none of listed roles', () => {
        expect(hasAnyRole(testUser, ['admin', 'host'])).toBe(false);
      });

      it('should handle empty role list', () => {
        expect(hasAnyRole(testUser, [])).toBe(false);
      });
    });

    describe('hasRoleOrHigher', () => {
      it('should respect role hierarchy: admin > security > host', () => {
        const adminUser: AuthUser = { ...testUser, role: 'admin' };
        const securityUser: AuthUser = { ...testUser, role: 'security' };
        const hostUser: AuthUser = { ...testUser, role: 'host' };

        // Admin can do everything
        expect(hasRoleOrHigher(adminUser, 'admin')).toBe(true);
        expect(hasRoleOrHigher(adminUser, 'security')).toBe(true);
        expect(hasRoleOrHigher(adminUser, 'host')).toBe(true);

        // Security can do security and host
        expect(hasRoleOrHigher(securityUser, 'admin')).toBe(false);
        expect(hasRoleOrHigher(securityUser, 'security')).toBe(true);
        expect(hasRoleOrHigher(securityUser, 'host')).toBe(true);

        // Host can only do host
        expect(hasRoleOrHigher(hostUser, 'admin')).toBe(false);
        expect(hasRoleOrHigher(hostUser, 'security')).toBe(false);
        expect(hasRoleOrHigher(hostUser, 'host')).toBe(true);
      });
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle JWT with future issued-at time', async () => {
      const futureIat = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
      const jwt = await new jose.SignJWT({
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'host',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(futureIat)
        .setExpirationTime(futureIat + 86400)
        .sign(new TextEncoder().encode(process.env.JWT_SECRET!));

      const result = await verifyAuthToken(jwt);
      
      // Should still verify (jose doesn't reject future iat by default)
      expect(result).toBeTruthy();
    });

    it('should handle JWT with tampered payload', async () => {
      const user: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'host',
      };
      const token = await createAuthToken(user);
      
      // Tamper with payload
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      payload.role = 'admin'; // Try to escalate privileges
      parts[1] = btoa(JSON.stringify(payload));
      const tamperedToken = parts.join('.');

      const result = await verifyAuthToken(tamperedToken);
      
      expect(result).toBeNull(); // Signature won't match
    });

    it('should handle extremely long JWT', async () => {
      const longName = 'A'.repeat(10000);
      const jwt = await new jose.SignJWT({
        sub: 'user-123',
        email: 'test@example.com',
        name: longName,
        role: 'host',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET!));

      const result = await verifyAuthToken(jwt);
      
      expect(result?.name).toBe(longName);
    });

    it('should handle concurrent authentication attempts', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'host',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const promises = Array.from({ length: 10 }, () =>
        authenticateUser('test@example.com', 'password')
      );

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result).toEqual(mockUser);
      });
    });
  });
});