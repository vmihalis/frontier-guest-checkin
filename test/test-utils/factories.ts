// Use simple mock data instead of faker for compatibility
import { UserRole, ContactMethod, InvitationStatus, PrismaClient } from '@prisma/client';

/**
 * Enhanced Test Data Factory with Builder Pattern
 * Consolidated from original TestDataFactory with additional capabilities
 */
export class TestDataFactory {
  private static idCounter = 0;
  private static defaultLocationId: string | null = null;
  private static prisma: PrismaClient | null = null;

  static setPrisma(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  static resetCounters() {
    this.idCounter = 0;
    this.defaultLocationId = null;
  }

  static generateId(): string {
    return `test-${++this.idCounter}-${Math.random().toString(36).substr(2, 8)}`;
  }

  // Core entity builders
  static createUser(overrides: Partial<any> = {}) {
    const id = this.generateId();
    return {
      id,
      email: `user${this.idCounter}@example.com`.toLowerCase(),
      name: `Test User ${this.idCounter}`,
      role: 'host' as UserRole,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createGuest(overrides: Partial<any> = {}) {
    const id = this.generateId();
    return {
      id,
      email: `guest${this.idCounter}@example.com`.toLowerCase(),
      name: `Test Guest ${this.idCounter}`,
      phone: `+1-555-${this.idCounter.toString().padStart(4, '0')}`,
      country: 'US',
      contactMethod: 'EMAIL' as ContactMethod,
      termsAcceptedAt: new Date(),
      blacklistedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createBlacklistedGuest(overrides: Partial<any> = {}) {
    return this.createGuest({
      blacklistedAt: new Date(),
      ...overrides,
    });
  }

  static createGuestWithoutTerms(overrides: Partial<any> = {}) {
    return this.createGuest({
      termsAcceptedAt: null,
      ...overrides,
    });
  }

  static createLocation(overrides: Partial<any> = {}) {
    const id = this.generateId();
    return {
      id,
      name: `Test Tower ${this.idCounter}`,
      address: `${this.idCounter} Test Street, Test City, CA 90210`,
      timezone: 'America/Los_Angeles',
      isActive: true,
      settings: {
        checkInCutoffHour: 23,
        maxDailyVisits: 500,
        requiresEscort: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createPolicy(overrides: Partial<any> = {}) {
    return {
      // Don't include ID - let database handle it with @default(1)
      locationId: null, // Global policy
      name: 'Default Test Policy',
      guestMonthlyLimit: 3,
      hostConcurrentLimit: 3,
      isActive: true,
      settings: {
        autoApproveReturningGuests: true,
        requirePhotoId: false,
        allowWalkIns: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createVisit(guestId: string, hostId: string, locationId?: string, overrides: Partial<any> = {}) {
    const checkedInAt = new Date();
    const expiresAt = new Date(checkedInAt.getTime() + 12 * 60 * 60 * 1000); // 12 hours later
    const id = this.generateId();

    return {
      id,
      guestId,
      hostId,
      locationId: locationId || this.defaultLocationId,
      checkedInAt,
      expiresAt,
      checkedOutAt: null,
      overrideReason: null,
      overrideUserId: null,
      createdAt: checkedInAt,
      updatedAt: checkedInAt,
      ...overrides,
    };
  }

  static createInvitation(guestEmail: string, hostId: string, overrides: Partial<any> = {}) {
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
    const id = this.generateId();

    return {
      id,
      guestEmail: guestEmail.toLowerCase(),
      guestName: `Test Guest ${this.idCounter}`,
      hostId,
      locationId: this.defaultLocationId,
      status: 'PENDING' as InvitationStatus,
      qrToken: Math.random().toString(36).substr(2, 32),
      expiresAt,
      sentAt: createdAt,
      activatedAt: null,
      usedAt: null,
      createdAt,
      updatedAt: createdAt,
      ...overrides,
    };
  }

  static createAcceptance(guestId: string, overrides: Partial<any> = {}) {
    const id = this.generateId();
    return {
      id,
      guestId,
      termsVersion: '1.0',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 Test Browser',
      acceptedAt: new Date(),
      createdAt: new Date(),
      ...overrides,
    };
  }

  // Utility methods for common test scenarios
  static async getDefaultLocationId(): Promise<string> {
    if (this.defaultLocationId) {
      return this.defaultLocationId;
    }

    if (!this.prisma) {
      throw new Error('Prisma client not set. Call TestDataFactory.setPrisma() first');
    }

    let location = await this.prisma.location.findFirst({ where: { isActive: true } });
    
    if (!location) {
      location = await this.prisma.location.create({
        data: this.createLocation(),
      });
    }

    this.defaultLocationId = location.id;
    return this.defaultLocationId;
  }

  /**
   * Create a batch of guests for multi-guest testing scenarios
   */
  static createGuestBatch(count: number, overrides: Partial<any> = {}): any[] {
    return Array.from({ length: count }, (_, i) => 
      this.createGuest({
        email: `batch.guest.${i + 1}.${Date.now()}@example.com`,
        name: `Batch Guest ${i + 1}`,
        ...overrides,
      })
    );
  }

  /**
   * Create edge case scenarios for validation testing
   */
  static createEdgeCaseScenarios() {
    return {
      expiredAcceptance: this.createGuest({
        termsAcceptedAt: new Date('2020-01-01'), // Very old acceptance
      }),
      blacklistedGuest: this.createBlacklistedGuest(),
      noTermsGuest: this.createGuestWithoutTerms(),
      internationalGuest: this.createGuest({
        country: 'GB',
        phone: '+44 20 7946 0958',
      }),
      vipGuest: this.createGuest({
        email: 'vip.guest@example.com',
        name: 'VIP Important Guest',
      }),
    };
  }
}