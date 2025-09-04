/**
 * Comprehensive unit tests for business rule validations
 * Tests all edge cases, boundary conditions, and error scenarios
 */

import { prisma } from '@/lib/prisma';
import {
  validateHostConcurrentLimit,
  validateGuestRollingLimit,
  validateLocationCapacity,
  validateTimeCutoff,
  validateGuestBlacklist,
  validateGuestAcceptance,
  validateQRToken,
  checkExistingActiveVisit,
  canUserOverride,
  shouldTriggerDiscount,
  processReturningGuestCheckIn,
} from '@/lib/validations';
import { nowInLA } from '@/lib/timezone';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    policy: { findFirst: jest.fn(), findUnique: jest.fn() },
    visit: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    guest: { findUnique: jest.fn() },
    acceptance: { findFirst: jest.fn(), create: jest.fn() },
    location: { findUnique: jest.fn() },
    discount: { findFirst: jest.fn() },
  }
}));

// Mock timezone functions
jest.mock('@/lib/timezone', () => ({
  nowInLA: jest.fn(() => new Date('2025-08-30T14:00:00-07:00')),
  thirtyDaysAgoInLA: jest.fn(() => new Date('2025-07-31T14:00:00-07:00')),
  isAfterCutoff: jest.fn(() => false),
  calculateNextEligibleDate: jest.fn((date: Date) => {
    const next = new Date(date);
    next.setDate(next.getDate() + 30);
    return next;
  }),
}));

describe('Business Rule Validations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Also reset mock implementations to clear any queued return values
    (prisma.visit.findFirst as jest.Mock).mockReset();
  });

  describe('validateHostConcurrentLimit', () => {
    it('should allow when under limit', async () => {
      (prisma.policy.findFirst as jest.Mock).mockResolvedValue({
        hostConcurrentLimit: 3
      });
      (prisma.visit.count as jest.Mock).mockResolvedValue(2);

      const result = await validateHostConcurrentLimit('host-123', 'loc-456');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject when at exactly the limit', async () => {
      (prisma.policy.findFirst as jest.Mock).mockResolvedValue({
        hostConcurrentLimit: 3
      });
      (prisma.visit.count as jest.Mock).mockResolvedValue(3);
      (prisma.location.findUnique as jest.Mock).mockResolvedValue({
        name: 'Tower A'
      });

      const result = await validateHostConcurrentLimit('host-123', 'loc-456');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Host at capacity with 3 guests');
      expect(result.currentCount).toBe(3);
      expect(result.maxCount).toBe(3);
    });

    it('should use default policy when none exists', async () => {
      (prisma.policy.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.visit.count as jest.Mock).mockResolvedValue(2);

      const result = await validateHostConcurrentLimit('host-123', 'loc-456');
      
      expect(result.isValid).toBe(true);
    });

    it('should include location name in error message', async () => {
      (prisma.policy.findFirst as jest.Mock).mockResolvedValue({
        hostConcurrentLimit: 1
      });
      (prisma.visit.count as jest.Mock).mockResolvedValue(1);
      (prisma.location.findUnique as jest.Mock).mockResolvedValue({
        name: 'Frontier Tower West'
      });

      const result = await validateHostConcurrentLimit('host-123', 'loc-456');
      
      expect(result.error).toContain('Frontier Tower West');
    });
  });

  describe('validateGuestRollingLimit', () => {
    it('should allow when under monthly limit', async () => {
      (prisma.policy.findFirst as jest.Mock).mockResolvedValue({
        guestMonthlyLimit: 3
      });
      (prisma.visit.findMany as jest.Mock).mockResolvedValue([
        { checkedInAt: new Date('2025-08-15') },
        { checkedInAt: new Date('2025-08-20') },
      ]);

      const result = await validateGuestRollingLimit('guest@example.com');
      
      expect(result.isValid).toBe(true);
    });

    it('should reject when at exactly the limit', async () => {
      const oldestVisit = new Date('2025-08-01T10:00:00');
      (prisma.policy.findFirst as jest.Mock).mockResolvedValue({
        guestMonthlyLimit: 3
      });
      (prisma.visit.findMany as jest.Mock).mockResolvedValue([
        { checkedInAt: oldestVisit },
        { checkedInAt: new Date('2025-08-10') },
        { checkedInAt: new Date('2025-08-20') },
      ]);

      const result = await validateGuestRollingLimit('guest@example.com');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Guest has reached 3 visits this month');
      expect(result.nextEligibleDate).toBeDefined();
    });

    it('should handle edge case of visits exactly 30 days ago', async () => {
      (prisma.policy.findFirst as jest.Mock).mockResolvedValue({
        guestMonthlyLimit: 1
      });
      // Visit exactly 30 days ago should NOT count
      (prisma.visit.findMany as jest.Mock).mockResolvedValue([]);

      const result = await validateGuestRollingLimit('guest@example.com');
      
      expect(result.isValid).toBe(true);
    });

    it('should calculate correct next eligible date', async () => {
      const oldestVisit = new Date('2025-08-05T10:00:00');
      (prisma.policy.findFirst as jest.Mock).mockResolvedValue({
        guestMonthlyLimit: 1
      });
      (prisma.visit.findMany as jest.Mock).mockResolvedValue([
        { checkedInAt: oldestVisit }
      ]);

      const result = await validateGuestRollingLimit('guest@example.com');
      
      expect(result.isValid).toBe(false);
      expect(result.nextEligibleDate?.toISOString()).toContain('2025-09-04');
    });
  });

  describe('validateLocationCapacity', () => {
    it('should allow when under daily capacity', async () => {
      (prisma.location.findUnique as jest.Mock).mockResolvedValue({
        name: 'Tower A',
        isActive: true,
        settings: { maxDailyVisits: 100 }
      });
      (prisma.visit.count as jest.Mock).mockResolvedValue(50);

      const result = await validateLocationCapacity('loc-123');
      
      expect(result.isValid).toBe(true);
    });

    it('should reject when location is inactive', async () => {
      (prisma.location.findUnique as jest.Mock).mockResolvedValue({
        name: 'Tower B',
        isActive: false,
        settings: {}
      });

      const result = await validateLocationCapacity('loc-123');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tower B is currently closed for visits');
    });

    it('should reject when at exactly daily capacity', async () => {
      (prisma.location.findUnique as jest.Mock).mockResolvedValue({
        name: 'Tower A',
        isActive: true,
        settings: { maxDailyVisits: 100 }
      });
      (prisma.visit.count as jest.Mock).mockResolvedValue(100);

      const result = await validateLocationCapacity('loc-123');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Tower A has reached daily capacity (100/100 visitors)');
    });

    it('should use default high limit when not configured', async () => {
      (prisma.location.findUnique as jest.Mock).mockResolvedValue({
        name: 'Tower C',
        isActive: true,
        settings: null
      });
      (prisma.visit.count as jest.Mock).mockResolvedValue(999);

      const result = await validateLocationCapacity('loc-123');
      
      expect(result.isValid).toBe(true); // Under default 1000
    });

    it('should reject when location not found', async () => {
      (prisma.location.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await validateLocationCapacity('invalid-loc');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Location not found');
    });
  });

  describe('validateTimeCutoff', () => {
    it('should allow 24/7 locations', async () => {
      (prisma.location.findUnique as jest.Mock).mockResolvedValue({
        name: '24/7 Tower',
        settings: { checkInCutoffHour: 24 }
      });

      const result = await validateTimeCutoff('loc-123');
      
      expect(result.isValid).toBe(true);
    });

    it('should reject when past location cutoff hour', async () => {
      // Mock current time as 11:30 PM
      (nowInLA as jest.Mock).mockReturnValueOnce(new Date('2025-08-30T23:30:00'));
      
      (prisma.location.findUnique as jest.Mock).mockResolvedValue({
        name: 'Tower A',
        settings: { checkInCutoffHour: 23 } // 11 PM cutoff
      });

      const result = await validateTimeCutoff('loc-123');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tower A is closed for the night. Check-ins resume tomorrow morning.');
    });

    it('should allow when exactly at cutoff hour', async () => {
      // Mock current time as exactly 11:00 PM
      (nowInLA as jest.Mock).mockReturnValueOnce(new Date('2025-08-30T23:00:00'));
      
      (prisma.location.findUnique as jest.Mock).mockResolvedValue({
        name: 'Tower A',
        settings: { checkInCutoffHour: 23 }
      });

      const result = await validateTimeCutoff('loc-123');
      
      expect(result.isValid).toBe(false); // Hour 23 means >= 23:00 is rejected
    });

    it('should fall back to global cutoff when no location provided', async () => {
      const { isAfterCutoff } = require('@/lib/timezone');
      (isAfterCutoff as jest.Mock).mockReturnValue(true);

      const result = await validateTimeCutoff();
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Building is closed for the night. Check-ins resume tomorrow morning.');
    });
  });

  describe('validateGuestBlacklist', () => {
    it('should allow non-blacklisted guest', async () => {
      (prisma.guest.findUnique as jest.Mock).mockResolvedValue({
        blacklistedAt: null
      });

      const result = await validateGuestBlacklist('guest@example.com');
      
      expect(result.isValid).toBe(true);
    });

    it('should reject blacklisted guest', async () => {
      (prisma.guest.findUnique as jest.Mock).mockResolvedValue({
        blacklistedAt: new Date('2025-01-01')
      });

      const result = await validateGuestBlacklist('banned@example.com');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Guest is not authorized for building access. Contact security for assistance.');
    });

    it('should allow when guest not found', async () => {
      (prisma.guest.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await validateGuestBlacklist('new@example.com');
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateGuestAcceptance', () => {
    it('should allow recent acceptance', async () => {
      (prisma.acceptance.findFirst as jest.Mock).mockResolvedValue({
        acceptedAt: new Date('2025-08-01') // Less than 1 year ago
      });

      const result = await validateGuestAcceptance('guest-123');
      
      expect(result.isValid).toBe(true);
    });

    it('should reject missing acceptance', async () => {
      (prisma.acceptance.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await validateGuestAcceptance('guest-123');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Guest needs to accept visitor terms before check-in. Email will be sent.');
    });

    it('should reject acceptance exactly 1 year old', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      (prisma.acceptance.findFirst as jest.Mock).mockResolvedValue({
        acceptedAt: oneYearAgo
      });

      const result = await validateGuestAcceptance('guest-123');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Guest's visitor agreement has expired. New terms acceptance required.");
    });

    it('should allow acceptance 364 days old', async () => {
      const almostOneYearAgo = new Date();
      almostOneYearAgo.setDate(almostOneYearAgo.getDate() - 364);
      
      (prisma.acceptance.findFirst as jest.Mock).mockResolvedValue({
        acceptedAt: almostOneYearAgo
      });

      const result = await validateGuestAcceptance('guest-123');
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateQRToken', () => {
    it('should allow null expiration (multi-guest QR)', () => {
      const result = validateQRToken(null);
      
      expect(result.isValid).toBe(true);
    });

    it('should allow future expiration', () => {
      const futureDate = new Date('2025-12-31T23:59:59');
      const result = validateQRToken(futureDate);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject past expiration', () => {
      const pastDate = new Date('2025-01-01T00:00:00');
      const result = validateQRToken(pastDate);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('This QR code has expired. Please generate a new invitation.');
    });

    it('should reject when exactly at expiration time', () => {
      const now = nowInLA();
      const result = validateQRToken(now);
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('checkExistingActiveVisit', () => {
    it('should detect same-host active visit', async () => {
      const activeVisit = {
        id: 'visit-123',
        checkedInAt: new Date(),
        expiresAt: new Date('2025-12-31'),
        guest: { id: 'g1', name: 'John', email: 'john@example.com' },
        host: { id: 'h1', name: 'Host', email: 'host@example.com' }
      };
      
      (prisma.visit.findFirst as jest.Mock)
        .mockResolvedValueOnce(activeVisit)
        .mockResolvedValueOnce(null);

      const result = await checkExistingActiveVisit('h1', 'john@example.com');
      
      expect(result.hasActiveVisit).toBe(true);
      expect(result.crossHostVisit).toBe(false);
      expect(result.activeVisit).toEqual(activeVisit);
    });

    it('should detect cross-host active visit', async () => {
      const crossHostVisit = {
        id: 'visit-456',
        checkedInAt: new Date(),
        expiresAt: new Date('2025-12-31'),
        guest: { id: 'g1', name: 'John', email: 'john@example.com' },
        host: { id: 'h2', name: 'Other Host', email: 'other@example.com' }
      };
      
      (prisma.visit.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(crossHostVisit);

      const result = await checkExistingActiveVisit('h1', 'john@example.com');
      
      expect(result.hasActiveVisit).toBe(true);
      expect(result.crossHostVisit).toBe(true);
      expect(result.activeVisit?.host.id).toBe('h2');
    });

    it('should return no active visit when none exists', async () => {
      (prisma.visit.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)  // same-host query
        .mockResolvedValueOnce(null); // cross-host query

      const result = await checkExistingActiveVisit('h1', 'john@example.com');
      
      expect(result.hasActiveVisit).toBe(false);
      expect(result.crossHostVisit).toBe(false);
      expect(result.activeVisit).toBeUndefined();
    });
  });

  describe('canUserOverride', () => {
    it('should allow security role', () => {
      expect(canUserOverride('security')).toBe(true);
    });

    it('should allow admin role', () => {
      expect(canUserOverride('admin')).toBe(true);
    });

    it('should deny host role', () => {
      expect(canUserOverride('host')).toBe(false);
    });

    it('should deny undefined role', () => {
      expect(canUserOverride(undefined)).toBe(false);
    });
  });

  describe('shouldTriggerDiscount', () => {
    it('should trigger on exactly 3rd visit without existing discount', async () => {
      (prisma.visit.count as jest.Mock).mockResolvedValue(3);
      (prisma.discount.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await shouldTriggerDiscount('guest-123');
      
      expect(result).toBe(true);
    });

    it('should not trigger on 2nd visit', async () => {
      (prisma.visit.count as jest.Mock).mockResolvedValue(2);
      (prisma.discount.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await shouldTriggerDiscount('guest-123');
      
      expect(result).toBe(false);
    });

    it('should not trigger on 4th visit', async () => {
      (prisma.visit.count as jest.Mock).mockResolvedValue(4);
      (prisma.discount.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await shouldTriggerDiscount('guest-123');
      
      expect(result).toBe(false);
    });

    it('should not trigger if discount already exists', async () => {
      (prisma.visit.count as jest.Mock).mockResolvedValue(3);
      (prisma.discount.findFirst as jest.Mock).mockResolvedValue({
        id: 'discount-123',
        triggeredAt: new Date()
      });

      const result = await shouldTriggerDiscount('guest-123');
      
      expect(result).toBe(false);
    });
  });

  describe('processReturningGuestCheckIn', () => {
    it('should auto-renew expired acceptance for returning guests', async () => {
      // First validation fails due to expired acceptance
      (prisma.acceptance.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          acceptedAt: new Date('2020-01-01') // Very old
        })
        .mockResolvedValueOnce({
          acceptedAt: new Date('2020-01-01')
        })
        .mockResolvedValueOnce({
          acceptedAt: new Date() // After renewal
        });

      (prisma.policy.findFirst as jest.Mock).mockResolvedValue({
        hostConcurrentLimit: 3,
        guestMonthlyLimit: 3
      });
      (prisma.visit.count as jest.Mock).mockResolvedValue(0);
      (prisma.visit.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.guest.findUnique as jest.Mock).mockResolvedValue({
        blacklistedAt: null
      });
      (prisma.acceptance.create as jest.Mock).mockResolvedValue({});

      const result = await processReturningGuestCheckIn(
        'host-123',
        'guest-456',
        'guest@example.com',
        new Date('2025-12-31'),
        'loc-789'
      );

      expect(result.isValid).toBe(true);
      expect(result.acceptanceRenewed).toBe(true);
      expect(prisma.acceptance.create).toHaveBeenCalled();
    });

    it('should not renew for first-time guests', async () => {
      (prisma.acceptance.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.policy.findFirst as jest.Mock).mockResolvedValue({
        hostConcurrentLimit: 3,
        guestMonthlyLimit: 3
      });
      (prisma.visit.count as jest.Mock).mockResolvedValue(0);
      (prisma.visit.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.guest.findUnique as jest.Mock).mockResolvedValue({
        blacklistedAt: null
      });

      const result = await processReturningGuestCheckIn(
        'host-123',
        'guest-456',
        'new@example.com',
        new Date('2025-12-31'),
        'loc-789'
      );

      expect(result.isValid).toBe(false);
      expect(result.acceptanceRenewed).toBeUndefined();
      expect(result.error).toContain('needs to accept visitor terms');
    });

    it('should handle renewal failure gracefully', async () => {
      (prisma.acceptance.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          acceptedAt: new Date('2020-01-01')
        })
        .mockResolvedValueOnce({
          acceptedAt: new Date('2020-01-01')
        });
      (prisma.acceptance.create as jest.Mock).mockRejectedValue(new Error('DB Error'));
      (prisma.policy.findFirst as jest.Mock).mockResolvedValue({
        hostConcurrentLimit: 3,
        guestMonthlyLimit: 3
      });
      (prisma.visit.count as jest.Mock).mockResolvedValue(0);
      (prisma.visit.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.guest.findUnique as jest.Mock).mockResolvedValue({
        blacklistedAt: null
      });

      const result = await processReturningGuestCheckIn(
        'host-123',
        'guest-456',
        'guest@example.com',
        new Date('2025-12-31'),
        'loc-789'
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unable to process guest terms update. Technical support needed.');
    });
  });
});