/**
 * Comprehensive unit tests for timezone utilities
 * Tests date calculations, expiration logic, and edge cases
 */

import {
  nowInLA,
  thirtyDaysAgoInLA,
  getQRTokenExpiration,
  calculateVisitExpiration,
  isAfterCutoff,
  calculateNextEligibleDate,
  formatDateForDisplay,
  formatTimeForDisplay,
  parseInviteDate,
} from '@/lib/timezone';

// Mock Date to control time in tests
const MOCK_DATE = '2025-08-30T14:30:00-07:00'; // 2:30 PM LA time
const ORIGINAL_DATE = global.Date;

describe('Timezone Utilities', () => {
  beforeEach(() => {
    // Mock Date constructor
    global.Date = class extends ORIGINAL_DATE {
      constructor(...args: any[]) {
        if (args.length === 0) {
          return new ORIGINAL_DATE(MOCK_DATE);
        }
        return new ORIGINAL_DATE(...args);
      }
      
      static now() {
        return new ORIGINAL_DATE(MOCK_DATE).getTime();
      }
    } as any;
  });

  afterEach(() => {
    global.Date = ORIGINAL_DATE;
  });

  describe('nowInLA', () => {
    it('should return current LA time', () => {
      const result = nowInLA();
      
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2025-08-30T21:30:00.000Z'); // UTC equivalent
    });

    it('should handle daylight saving time transitions', () => {
      // Test during DST (summer)
      global.Date = class extends ORIGINAL_DATE {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new ORIGINAL_DATE('2025-07-15T12:00:00-07:00');
          }
          return new ORIGINAL_DATE(...args);
        }
        static now() {
          return new ORIGINAL_DATE('2025-07-15T12:00:00-07:00').getTime();
        }
      } as any;

      const summerTime = nowInLA();
      expect(summerTime.toISOString()).toBe('2025-07-15T19:00:00.000Z');

      // Test during standard time (winter)
      global.Date = class extends ORIGINAL_DATE {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new ORIGINAL_DATE('2025-12-15T12:00:00-08:00');
          }
          return new ORIGINAL_DATE(...args);
        }
        static now() {
          return new ORIGINAL_DATE('2025-12-15T12:00:00-08:00').getTime();
        }
      } as any;

      const winterTime = nowInLA();
      expect(winterTime.toISOString()).toBe('2025-12-15T20:00:00.000Z');
    });
  });

  describe('thirtyDaysAgoInLA', () => {
    it('should return date exactly 30 days ago', () => {
      const result = thirtyDaysAgoInLA();
      const expected = new Date('2025-07-31T14:30:00-07:00');
      
      expect(result.toISOString()).toBe(expected.toISOString());
    });

    it('should handle month boundaries correctly', () => {
      // Mock March 1st
      global.Date = class extends ORIGINAL_DATE {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new ORIGINAL_DATE('2025-03-01T10:00:00-08:00');
          }
          return new ORIGINAL_DATE(...args);
        }
        static now() {
          return new ORIGINAL_DATE('2025-03-01T10:00:00-08:00').getTime();
        }
      } as any;

      const result = thirtyDaysAgoInLA();
      const expected = new Date('2025-01-30T10:00:00-08:00');
      
      expect(result.toISOString()).toBe(expected.toISOString());
    });

    it('should handle leap year February correctly', () => {
      // Mock March 1st, 2024 (leap year)
      global.Date = class extends ORIGINAL_DATE {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new ORIGINAL_DATE('2024-03-01T10:00:00-08:00');
          }
          return new ORIGINAL_DATE(...args);
        }
        static now() {
          return new ORIGINAL_DATE('2024-03-01T10:00:00-08:00').getTime();
        }
      } as any;

      const result = thirtyDaysAgoInLA();
      const expected = new Date('2024-01-31T10:00:00-08:00');
      
      expect(result.toISOString()).toBe(expected.toISOString());
    });
  });

  describe('getQRTokenExpiration', () => {
    it('should return date 7 days in future', () => {
      const result = getQRTokenExpiration();
      const expected = new Date('2025-09-06T14:30:00-07:00');
      
      expect(result.toISOString()).toBe(expected.toISOString());
    });

    it('should handle DST transitions in 7-day period', () => {
      // Mock date near DST transition (early November)
      global.Date = class extends ORIGINAL_DATE {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new ORIGINAL_DATE('2025-11-01T12:00:00-07:00');
          }
          return new ORIGINAL_DATE(...args);
        }
        static now() {
          return new ORIGINAL_DATE('2025-11-01T12:00:00-07:00').getTime();
        }
      } as any;

      const result = getQRTokenExpiration();
      // 7 days later, after DST ends
      const expected = new Date('2025-11-08T12:00:00-08:00');
      
      // Times should be equivalent despite DST change
      expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(3600000);
    });
  });

  describe('calculateVisitExpiration', () => {
    it('should add 12 hours to check-in time', () => {
      const checkIn = new Date('2025-08-30T09:00:00-07:00');
      const result = calculateVisitExpiration(checkIn);
      const expected = new Date('2025-08-30T21:00:00-07:00');
      
      expect(result.toISOString()).toBe(expected.toISOString());
    });

    it('should handle expiration crossing midnight', () => {
      const checkIn = new Date('2025-08-30T20:00:00-07:00'); // 8 PM
      const result = calculateVisitExpiration(checkIn);
      const expected = new Date('2025-08-31T08:00:00-07:00'); // 8 AM next day
      
      expect(result.toISOString()).toBe(expected.toISOString());
    });

    it('should handle expiration crossing month boundary', () => {
      const checkIn = new Date('2025-08-31T23:00:00-07:00'); // 11 PM on last day
      const result = calculateVisitExpiration(checkIn);
      const expected = new Date('2025-09-01T11:00:00-07:00'); // 11 AM next month
      
      expect(result.toISOString()).toBe(expected.toISOString());
    });

    it('should handle expiration crossing year boundary', () => {
      const checkIn = new Date('2025-12-31T20:00:00-08:00'); // 8 PM New Year's Eve
      const result = calculateVisitExpiration(checkIn);
      const expected = new Date('2026-01-01T08:00:00-08:00'); // 8 AM New Year's Day
      
      expect(result.toISOString()).toBe(expected.toISOString());
    });
  });

  describe('isAfterCutoff', () => {
    it('should return false before 11:59 PM', () => {
      // Test various times before cutoff
      const testTimes = [
        '2025-08-30T00:00:00-07:00', // Midnight
        '2025-08-30T11:00:00-07:00', // 11 AM
        '2025-08-30T22:00:00-07:00', // 10 PM
        '2025-08-30T23:58:59-07:00', // 11:58:59 PM
      ];

      testTimes.forEach(time => {
        global.Date = class extends ORIGINAL_DATE {
          constructor(...args: any[]) {
            if (args.length === 0) {
              return new ORIGINAL_DATE(time);
            }
            return new ORIGINAL_DATE(...args);
          }
          static now() {
            return new ORIGINAL_DATE(time).getTime();
          }
        } as any;

        expect(isAfterCutoff()).toBe(false);
      });
    });

    it('should return true at exactly 11:59 PM', () => {
      global.Date = class extends ORIGINAL_DATE {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new ORIGINAL_DATE('2025-08-30T23:59:00-07:00');
          }
          return new ORIGINAL_DATE(...args);
        }
        static now() {
          return new ORIGINAL_DATE('2025-08-30T23:59:00-07:00').getTime();
        }
      } as any;

      expect(isAfterCutoff()).toBe(true);
    });

    it('should return true at 11:59:59 PM', () => {
      global.Date = class extends ORIGINAL_DATE {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new ORIGINAL_DATE('2025-08-30T23:59:59-07:00');
          }
          return new ORIGINAL_DATE(...args);
        }
        static now() {
          return new ORIGINAL_DATE('2025-08-30T23:59:59-07:00').getTime();
        }
      } as any;

      expect(isAfterCutoff()).toBe(true);
    });

    it('should handle custom cutoff hour', () => {
      // Test 10 PM cutoff
      global.Date = class extends ORIGINAL_DATE {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new ORIGINAL_DATE('2025-08-30T21:30:00-07:00'); // 9:30 PM
          }
          return new ORIGINAL_DATE(...args);
        }
        static now() {
          return new ORIGINAL_DATE('2025-08-30T21:30:00-07:00').getTime();
        }
      } as any;

      expect(isAfterCutoff(22)).toBe(false); // Before 10 PM

      global.Date = class extends ORIGINAL_DATE {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new ORIGINAL_DATE('2025-08-30T22:30:00-07:00'); // 10:30 PM
          }
          return new ORIGINAL_DATE(...args);
        }
        static now() {
          return new ORIGINAL_DATE('2025-08-30T22:30:00-07:00').getTime();
        }
      } as any;

      expect(isAfterCutoff(22)).toBe(true); // After 10 PM
    });
  });

  describe('calculateNextEligibleDate', () => {
    it('should add 30 days and 1 second', () => {
      const lastVisit = new Date('2025-08-01T10:00:00-07:00');
      const result = calculateNextEligibleDate(lastVisit);
      const expected = new Date('2025-08-31T10:00:01-07:00');
      
      expect(result.toISOString()).toBe(expected.toISOString());
    });

    it('should handle month boundaries', () => {
      const lastVisit = new Date('2025-01-15T12:00:00-08:00');
      const result = calculateNextEligibleDate(lastVisit);
      const expected = new Date('2025-02-14T12:00:01-08:00');
      
      expect(result.toISOString()).toBe(expected.toISOString());
    });

    it('should handle February to March in non-leap year', () => {
      const lastVisit = new Date('2025-02-01T12:00:00-08:00');
      const result = calculateNextEligibleDate(lastVisit);
      const expected = new Date('2025-03-03T12:00:01-08:00');
      
      expect(result.toISOString()).toBe(expected.toISOString());
    });

    it('should handle February to March in leap year', () => {
      const lastVisit = new Date('2024-02-01T12:00:00-08:00');
      const result = calculateNextEligibleDate(lastVisit);
      const expected = new Date('2024-03-02T12:00:01-08:00');
      
      expect(result.toISOString()).toBe(expected.toISOString());
    });
  });

  describe('formatDateForDisplay', () => {
    it('should format date in MM/DD/YYYY format', () => {
      const date = new Date('2025-08-30T14:30:00-07:00');
      const result = formatDateForDisplay(date);
      
      expect(result).toBe('08/30/2025');
    });

    it('should pad single digit months and days', () => {
      const date = new Date('2025-01-05T10:00:00-08:00');
      const result = formatDateForDisplay(date);
      
      expect(result).toBe('01/05/2025');
    });

    it('should handle leap day', () => {
      const date = new Date('2024-02-29T12:00:00-08:00');
      const result = formatDateForDisplay(date);
      
      expect(result).toBe('02/29/2024');
    });
  });

  describe('formatTimeForDisplay', () => {
    it('should format morning time correctly', () => {
      const date = new Date('2025-08-30T09:30:00-07:00');
      const result = formatTimeForDisplay(date);
      
      expect(result).toBe('9:30 AM');
    });

    it('should format afternoon time correctly', () => {
      const date = new Date('2025-08-30T14:45:00-07:00');
      const result = formatTimeForDisplay(date);
      
      expect(result).toBe('2:45 PM');
    });

    it('should handle midnight as 12:00 AM', () => {
      const date = new Date('2025-08-30T00:00:00-07:00');
      const result = formatTimeForDisplay(date);
      
      expect(result).toBe('12:00 AM');
    });

    it('should handle noon as 12:00 PM', () => {
      const date = new Date('2025-08-30T12:00:00-07:00');
      const result = formatTimeForDisplay(date);
      
      expect(result).toBe('12:00 PM');
    });

    it('should pad minutes with leading zero', () => {
      const date = new Date('2025-08-30T10:05:00-07:00');
      const result = formatTimeForDisplay(date);
      
      expect(result).toBe('10:05 AM');
    });

    it('should handle 11:59 PM', () => {
      const date = new Date('2025-08-30T23:59:00-07:00');
      const result = formatTimeForDisplay(date);
      
      expect(result).toBe('11:59 PM');
    });
  });

  describe('parseInviteDate', () => {
    it('should parse YYYY-MM-DD format', () => {
      const result = parseInviteDate('2025-08-30');
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(7); // August (0-indexed)
      expect(result.getDate()).toBe(30);
    });

    it('should set time to start of day in LA timezone', () => {
      const result = parseInviteDate('2025-08-30');
      
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    it('should handle invalid date string', () => {
      const result = parseInviteDate('invalid-date');
      
      expect(isNaN(result.getTime())).toBe(true);
    });

    it('should handle empty string', () => {
      const result = parseInviteDate('');
      
      expect(isNaN(result.getTime())).toBe(true);
    });

    it('should handle date with time component (should ignore time)', () => {
      const result = parseInviteDate('2025-08-30T14:30:00');
      
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(7);
      expect(result.getDate()).toBe(30);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle dates near DST transitions', () => {
      // Spring forward (lose an hour)
      global.Date = class extends ORIGINAL_DATE {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new ORIGINAL_DATE('2025-03-09T01:59:59-08:00');
          }
          return new ORIGINAL_DATE(...args);
        }
        static now() {
          return new ORIGINAL_DATE('2025-03-09T01:59:59-08:00').getTime();
        }
      } as any;

      const beforeDST = nowInLA();
      
      global.Date = class extends ORIGINAL_DATE {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return new ORIGINAL_DATE('2025-03-09T03:00:00-07:00');
          }
          return new ORIGINAL_DATE(...args);
        }
        static now() {
          return new ORIGINAL_DATE('2025-03-09T03:00:00-07:00').getTime();
        }
      } as any;

      const afterDST = nowInLA();
      
      // Should be only 1 second apart despite clock change
      expect(afterDST.getTime() - beforeDST.getTime()).toBe(1000);
    });

    it('should handle maximum date values', () => {
      const maxDate = new Date(8640000000000000); // Max JavaScript date
      const result = calculateVisitExpiration(maxDate);
      
      expect(result.getTime()).toBeGreaterThan(maxDate.getTime());
    });

    it('should handle minimum date values', () => {
      const minDate = new Date(-8640000000000000); // Min JavaScript date
      const result = calculateNextEligibleDate(minDate);
      
      expect(result).toBeInstanceOf(Date);
    });

    it('should maintain precision for milliseconds', () => {
      const preciseDate = new Date('2025-08-30T14:30:45.123-07:00');
      const result = calculateVisitExpiration(preciseDate);
      
      expect(result.getMilliseconds()).toBe(123);
    });
  });
});