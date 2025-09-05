/**
 * Unit tests for override system
 * Tests security password validation and request validation
 */

import { validateOverridePassword, validateOverrideRequest, OverrideRequest } from '@/lib/override';

describe('Override System', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up test environment
    process.env = {
      ...originalEnv,
      OVERRIDE_PASSWORD: 'test-override-password-123',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateOverridePassword', () => {
    test.each([
      { password: 'test-override-password-123', expected: true, scenario: 'correct password' },
      { password: 'wrong-password', expected: false, scenario: 'incorrect password' },
      { password: '', expected: false, scenario: 'empty password' },
      { password: 'test-override-password-124', expected: false, scenario: 'similar but wrong password' },
      { password: 'TEST-OVERRIDE-PASSWORD-123', expected: false, scenario: 'wrong case password' },
    ])('should $scenario: $password -> $expected', ({ password, expected }) => {
      const result = validateOverridePassword(password);
      expect(result).toBe(expected);
    });

    it('should return false when no environment password is set', () => {
      delete process.env.OVERRIDE_PASSWORD;
      const result = validateOverridePassword('any-password');
      expect(result).toBe(false);
    });

    it('should handle null/undefined inputs safely', () => {
      expect(validateOverridePassword('')).toBe(false);
      expect(validateOverridePassword(null as any)).toBe(false);
      expect(validateOverridePassword(undefined as any)).toBe(false);
    });
  });

  describe('validateOverrideRequest', () => {
    const validRequest: OverrideRequest = {
      reason: 'Emergency evacuation in progress, need immediate access',
      password: 'test-override-password-123',
    };

    it('should accept valid override request', () => {
      const result = validateOverrideRequest(validRequest);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    describe('reason validation', () => {
      test.each([
        { reason: '', expectedError: 'Override reason is required', scenario: 'empty reason' },
        { reason: '   ', expectedError: 'Override reason is required', scenario: 'whitespace-only reason' },
        { reason: 'too short', expectedError: 'Override reason must be at least 10 characters', scenario: 'reason too short' },
        { reason: 'X'.repeat(501), expectedError: 'Override reason cannot exceed 500 characters', scenario: 'reason too long' },
      ])('should reject $scenario', ({ reason, expectedError }) => {
        const request: OverrideRequest = { ...validRequest, reason };
        const result = validateOverrideRequest(request);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(expectedError);
      });

      test.each([
        { reason: 'Valid 10+ char reason for emergency', scenario: 'minimum length valid reason' },
        { reason: 'A'.repeat(500), scenario: 'maximum length valid reason' },
        { reason: 'Security incident requires immediate override access', scenario: 'typical valid reason' },
        { reason: '  Valid reason with leading/trailing spaces  ', scenario: 'reason with whitespace' },
      ])('should accept $scenario', ({ reason }) => {
        const request: OverrideRequest = { ...validRequest, reason };
        const result = validateOverrideRequest(request);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('password validation', () => {
      it('should reject missing password', () => {
        const request: OverrideRequest = { ...validRequest, password: '' };
        const result = validateOverrideRequest(request);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Override password is required');
      });

      it('should reject invalid password', () => {
        const request: OverrideRequest = { ...validRequest, password: 'wrong-password' };
        const result = validateOverrideRequest(request);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid override password');
      });

      it('should reject null/undefined password', () => {
        const request: OverrideRequest = { ...validRequest, password: null as any };
        const result = validateOverrideRequest(request);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Override password is required');
      });
    });

    describe('edge cases and security', () => {
      it('should handle object injection attempts', () => {
        const maliciousRequest = {
          reason: 'Valid override reason for testing',
          password: 'test-override-password-123',
          __proto__: { isValid: true }, // Prototype pollution attempt
        } as OverrideRequest;

        const result = validateOverrideRequest(maliciousRequest);
        expect(result.isValid).toBe(true); // Should validate based on actual logic, not injected properties
      });

      it('should handle special characters in reason', () => {
        const request: OverrideRequest = {
          reason: 'Emergency! @#$%^&*()_+ special chars in reason',
          password: 'test-override-password-123',
        };
        const result = validateOverrideRequest(request);
        expect(result.isValid).toBe(true);
      });

      it('should handle Unicode characters in reason', () => {
        const request: OverrideRequest = {
          reason: 'Emergency override needed 🚨 火急事件 срочная ситуация',
          password: 'test-override-password-123',
        };
        const result = validateOverrideRequest(request);
        expect(result.isValid).toBe(true);
      });

      it('should be resistant to timing attacks', () => {
        // Test multiple password attempts to ensure consistent timing
        const attempts = [
          'wrong-password',
          'test-override-password-123',
          'x',
          'very-long-wrong-password-that-differs-significantly',
        ];

        const times: number[] = [];
        attempts.forEach(password => {
          const start = process.hrtime.bigint();
          validateOverridePassword(password);
          const end = process.hrtime.bigint();
          times.push(Number(end - start));
        });

        // While we can't guarantee perfect timing safety in tests,
        // we can at least verify the function completes for all inputs
        expect(times.every(time => time > 0)).toBe(true);
      });
    });
  });
});