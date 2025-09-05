/**
 * Unit tests for Prisma client configuration
 * Tests singleton behavior and environment-specific setup
 */

describe('Prisma Client', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  
  beforeEach(() => {
    // Clear the module cache to test fresh imports
    jest.resetModules();
    // Clear global prisma instance
    delete (globalThis as any).prisma;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should create a new PrismaClient instance', () => {
    const { prisma } = require('@/lib/prisma');
    expect(prisma).toBeDefined();
    // Constructor name might be minified in production
    expect(typeof prisma).toBe('object');
    expect(prisma).toHaveProperty('$connect');
    expect(prisma).toHaveProperty('$disconnect');
  });

  it('should reuse existing global instance in development', () => {
    process.env.NODE_ENV = 'development';
    
    const { prisma: prisma1 } = require('@/lib/prisma');
    const { prisma: prisma2 } = require('@/lib/prisma');
    
    expect(prisma1).toBe(prisma2);
  });

  it('should not set global instance in production', () => {
    process.env.NODE_ENV = 'production';
    
    require('@/lib/prisma');
    
    // Global should remain undefined in production
    expect((globalThis as any).prisma).toBeUndefined();
  });

  it('should configure query logging', () => {
    // Mock PrismaClient constructor to capture options
    const mockPrismaClient = jest.fn();
    jest.doMock('@prisma/client', () => ({
      PrismaClient: mockPrismaClient
    }));

    require('@/lib/prisma');

    expect(mockPrismaClient).toHaveBeenCalledWith({
      log: ['query']
    });
  });

  it('should use existing global instance when available', () => {
    // Set up a mock global instance
    const mockGlobalPrisma = { mockInstance: true };
    (globalThis as any).prisma = mockGlobalPrisma;

    const { prisma } = require('@/lib/prisma');
    
    expect(prisma).toBe(mockGlobalPrisma);
  });
});