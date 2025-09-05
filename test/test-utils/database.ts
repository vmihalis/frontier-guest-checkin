import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from './factories';

/**
 * Unified Database Helpers for Test Environment
 * Manages test database connections and cleanup operations
 */
export class TestDatabase {
  private static instance: TestDatabase;
  private prisma: PrismaClient;
  private isConnected = false;

  private constructor() {
    this.prisma = new PrismaClient({
      datasourceUrl: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }
    return TestDatabase.instance;
  }

  getPrisma(): PrismaClient {
    return this.prisma;
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.prisma.$connect();
      this.isConnected = true;
      // Initialize TestDataFactory with this prisma instance
      TestDataFactory.setPrisma(this.prisma);
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.prisma.$disconnect();
      this.isConnected = false;
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test database...');
    
    // Delete in dependency order to avoid foreign key constraints
    await this.prisma.$transaction([
      this.prisma.discount.deleteMany(),
      this.prisma.acceptance.deleteMany(),
      this.prisma.visit.deleteMany(),
      this.prisma.invitation.deleteMany(),
      this.prisma.guest.deleteMany(),
      this.prisma.user.deleteMany(),
      this.prisma.location.deleteMany(),
      this.prisma.policy.deleteMany(),
    ]);
    
    TestDataFactory.resetCounters();
  }

  async setupBasicTestData(): Promise<{
    policy: any;
    location: any;
    host: any;
    admin: any;
    security: any;
  }> {
    await this.connect();
    await this.cleanup();
    
    const policy = await this.prisma.policy.create({
      data: TestDataFactory.createPolicy(),
    });
    
    const location = await this.prisma.location.create({
      data: TestDataFactory.createLocation(),
    });
    
    const [host, admin, security] = await Promise.all([
      this.prisma.user.create({
        data: TestDataFactory.createUser({ role: 'host' }),
      }),
      this.prisma.user.create({
        data: TestDataFactory.createUser({ role: 'admin' }),
      }),
      this.prisma.user.create({
        data: TestDataFactory.createUser({ role: 'security' }),
      }),
    ]);

    return { policy, location, host, admin, security };
  }

  async verifyConnectivity(): Promise<boolean> {
    try {
      await this.connect();
      await this.prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connectivity verified');
      return true;
    } catch (error) {
      console.error('❌ Database connectivity failed:', error);
      return false;
    }
  }

  /**
   * Create a test transaction for atomic test operations
   */
  async withTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}

// Convenience exports
export const testDb = TestDatabase.getInstance();
export const prisma = testDb.getPrisma();