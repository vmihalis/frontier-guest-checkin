/**
 * Comprehensive unit tests for QR token parsing and generation
 * Tests all formats, edge cases, and malformed inputs
 */

import {
  generateQRToken,
  validateQRToken,
  parseQRData,
  generateMultiGuestQR,
  generateQRDisplayData,
  QRTokenData,
  GuestData,
  GuestBatchQRData,
  ParsedQRData,
} from '@/lib/qr-token';
import { nowInLA, getQRTokenExpiration } from '@/lib/timezone';

// Mock timezone functions
jest.mock('@/lib/timezone', () => ({
  nowInLA: jest.fn(() => new Date('2025-08-30T14:00:00-07:00')),
  getQRTokenExpiration: jest.fn(() => new Date('2025-09-06T14:00:00-07:00')),
}));

// Mock console methods to reduce test noise
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});
afterAll(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
});

describe('QR Token Generation and Validation', () => {
  describe('generateQRToken', () => {
    it('should generate valid base64 token', () => {
      const token = generateQRToken('invite-123', 'guest@example.com', 'host-456');
      
      expect(token).toBeTruthy();
      expect(() => atob(token)).not.toThrow();
      
      const decoded = JSON.parse(atob(token));
      expect(decoded.inviteId).toBe('invite-123');
      expect(decoded.guestEmail).toBe('guest@example.com');
      expect(decoded.hostId).toBe('host-456');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should set correct expiration time', () => {
      const token = generateQRToken('invite-123', 'guest@example.com', 'host-456');
      const decoded = JSON.parse(atob(token));
      
      const expectedExp = Math.floor(getQRTokenExpiration().getTime() / 1000);
      expect(decoded.exp).toBe(expectedExp);
    });

    it('should handle special characters in email', () => {
      const email = 'test+tag@sub.example.com';
      const token = generateQRToken('invite-123', email, 'host-456');
      const decoded = JSON.parse(atob(token));
      
      expect(decoded.guestEmail).toBe(email);
    });
  });

  describe('validateQRToken', () => {
    it('should validate unexpired token', () => {
      const tokenData: QRTokenData = {
        inviteId: 'invite-123',
        guestEmail: 'guest@example.com',
        hostId: 'host-456',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };
      const token = btoa(JSON.stringify(tokenData));

      const result = validateQRToken(token);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(tokenData);
      expect(result.error).toBeUndefined();
    });

    it('should reject expired token', () => {
      const tokenData: QRTokenData = {
        inviteId: 'invite-123',
        guestEmail: 'guest@example.com',
        hostId: 'host-456',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };
      const token = btoa(JSON.stringify(tokenData));

      const result = validateQRToken(token);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Token has expired');
    });

    it('should reject token with missing fields', () => {
      const incompleteToken = btoa(JSON.stringify({
        inviteId: 'invite-123',
        // Missing guestEmail and hostId
      }));

      const result = validateQRToken(incompleteToken);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid token format');
    });

    it('should reject malformed base64', () => {
      const result = validateQRToken('not-valid-base64!!!');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid token format');
    });

    it('should reject non-JSON content', () => {
      const result = validateQRToken(btoa('plain text, not JSON'));
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid token format');
    });
  });

  describe('parseQRData', () => {
    describe('Guest Batch Format', () => {
      it('should parse valid guest batch JSON', () => {
        const batchData: GuestBatchQRData = {
          guests: [
            { e: 'guest1@example.com', n: 'Guest One' },
            { e: 'guest2@example.com', n: 'Guest Two' },
          ],
        };
        const qrData = JSON.stringify(batchData);

        const result = parseQRData(qrData);
        
        expect(result.type).toBe('batch');
        expect(result.guestBatch).toEqual(batchData);
        expect(result.singleGuest).toBeUndefined();
      });

      it('should handle empty guest array', () => {
        const qrData = JSON.stringify({ guests: [] });

        const result = parseQRData(qrData);
        
        expect(result.type).toBe('batch');
        expect(result.guestBatch?.guests).toHaveLength(0);
      });

      it('should handle guests with special characters in names', () => {
        const batchData: GuestBatchQRData = {
          guests: [
            { e: 'guest@example.com', n: 'Müller-O\'Connor, Jr.' },
            { e: 'emoji@example.com', n: 'Name 😀 With Emoji' },
          ],
        };
        const qrData = JSON.stringify(batchData);

        const result = parseQRData(qrData);
        
        expect(result.type).toBe('batch');
        expect(result.guestBatch?.guests[0].n).toBe('Müller-O\'Connor, Jr.');
        expect(result.guestBatch?.guests[1].n).toBe('Name 😀 With Emoji');
      });
    });

    describe('Single Guest Token Format', () => {
      it('should parse base64-encoded single guest token', () => {
        const tokenData: QRTokenData = {
          inviteId: 'invite-123',
          guestEmail: 'guest@example.com',
          hostId: 'host-456',
          iat: Date.now(),
          exp: Date.now() + 3600000,
        };
        const qrData = btoa(JSON.stringify(tokenData));

        const result = parseQRData(qrData);
        
        expect(result.type).toBe('single');
        expect(result.singleGuest).toMatchObject({
          inviteId: tokenData.inviteId,
          guestEmail: tokenData.guestEmail,
          hostId: tokenData.hostId,
        });
        expect(result.guestBatch).toBeUndefined();
      });

      it('should parse direct JSON single guest format', () => {
        const tokenData: QRTokenData = {
          inviteId: 'invite-789',
          guestEmail: 'direct@example.com',
          hostId: 'host-999',
          iat: Date.now(),
          exp: Date.now() + 3600000,
        };
        const qrData = JSON.stringify(tokenData);

        const result = parseQRData(qrData);
        
        expect(result.type).toBe('single');
        expect(result.singleGuest).toEqual(tokenData);
      });
    });

    describe('Edge Cases and Malformed Data', () => {
      it('should reject empty string', () => {
        expect(() => parseQRData('')).toThrow('Invalid QR data format');
      });

      it('should reject plain text', () => {
        expect(() => parseQRData('Hello World')).toThrow('Invalid QR data format');
      });

      it('should reject invalid JSON', () => {
        expect(() => parseQRData('{ invalid json }')).toThrow();
      });

      it('should reject JSON with wrong structure', () => {
        const wrongFormat = JSON.stringify({
          someField: 'value',
          anotherField: 123,
        });

        expect(() => parseQRData(wrongFormat)).toThrow('Unknown JSON QR format');
      });

      it('should handle extremely long QR data', () => {
        const longData: GuestBatchQRData = {
          guests: Array.from({ length: 1000 }, (_, i) => ({
            e: `guest${i}@example.com`,
            n: `Guest Number ${i}`,
          })),
        };
        const qrData = JSON.stringify(longData);

        const result = parseQRData(qrData);
        
        expect(result.type).toBe('batch');
        expect(result.guestBatch?.guests).toHaveLength(1000);
      });

      it('should reject QR with SQL injection attempts', () => {
        const maliciousData = "'; DROP TABLE users; --";
        
        expect(() => parseQRData(maliciousData)).toThrow();
      });

      it('should reject QR with XSS attempts', () => {
        const xssAttempt = '<script>alert("XSS")</script>';
        
        expect(() => parseQRData(xssAttempt)).toThrow();
      });

      it('should handle QR with null values', () => {
        const dataWithNulls = JSON.stringify({
          guests: [
            { e: null, n: 'Name' },
            { e: 'email@example.com', n: null },
          ],
        });

        const result = parseQRData(dataWithNulls);
        
        expect(result.type).toBe('batch');
        expect(result.guestBatch?.guests[0].e).toBeNull();
        expect(result.guestBatch?.guests[1].n).toBeNull();
      });

      it('should handle QR with undefined converted to JSON', () => {
        const dataWithUndefined = '{"guests":[{"e":"test@example.com"}]}';

        const result = parseQRData(dataWithUndefined);
        
        expect(result.type).toBe('batch');
        expect(result.guestBatch?.guests[0].e).toBe('test@example.com');
        expect(result.guestBatch?.guests[0].n).toBeUndefined();
      });

      it('should reject corrupted base64', () => {
        const corruptedBase64 = 'eyJpbnZpdGVJZCI6IjEyMyIsImZdZXN0RW1haWw===CORRUPT===';
        
        expect(() => parseQRData(corruptedBase64)).toThrow();
      });

      it('should handle base64 with padding issues', () => {
        const validJson = JSON.stringify({
          inviteId: 'test',
          guestEmail: 'test@test.com',
          hostId: 'host123',
        });
        // Remove padding to test handling
        const base64NoPadding = btoa(validJson).replace(/=/g, '');
        
        expect(() => parseQRData(base64NoPadding)).toThrow();
      });

      it('should handle nested JSON structures', () => {
        const nestedData = JSON.stringify({
          guests: [
            {
              e: 'nested@example.com',
              n: 'Nested Guest',
              meta: {
                company: 'Test Corp',
                department: { name: 'Engineering', id: 123 },
              },
            },
          ],
        });

        const result = parseQRData(nestedData);
        
        expect(result.type).toBe('batch');
        expect(result.guestBatch?.guests[0].e).toBe('nested@example.com');
      });
    });
  });

  describe('generateMultiGuestQR', () => {
    it('should generate valid multi-guest QR data', () => {
      const guests = [
        { email: 'guest1@example.com', name: 'Guest One' },
        { email: 'guest2@example.com', name: 'Guest Two' },
      ];

      const qrData = generateMultiGuestQR(guests);
      const parsed = JSON.parse(qrData);
      
      expect(parsed.guests).toHaveLength(2);
      expect(parsed.guests[0]).toEqual({ e: 'guest1@example.com', n: 'Guest One' });
      expect(parsed.guests[1]).toEqual({ e: 'guest2@example.com', n: 'Guest Two' });
    });

    it('should handle empty guest list', () => {
      const qrData = generateMultiGuestQR([]);
      const parsed = JSON.parse(qrData);
      
      expect(parsed.guests).toEqual([]);
    });

    it('should preserve special characters', () => {
      const guests = [
        { email: 'test+tag@example.com', name: 'O\'Brien, Jr.' },
      ];

      const qrData = generateMultiGuestQR(guests);
      const parsed = JSON.parse(qrData);
      
      expect(parsed.guests[0].e).toBe('test+tag@example.com');
      expect(parsed.guests[0].n).toBe('O\'Brien, Jr.');
    });
  });

  describe('generateQRDisplayData', () => {
    it('should generate QR display URL with token', () => {
      const token = 'test-token-123';
      const displayData = generateQRDisplayData(token);
      
      expect(displayData).toBe('berlinhouse://checkin?token=test-token-123');
    });

    it('should handle tokens with special characters', () => {
      const token = 'token+with/special=chars';
      const displayData = generateQRDisplayData(token);
      
      expect(displayData).toContain(token);
    });
  });

  describe('Integration Scenarios', () => {
    it('should round-trip single guest token', () => {
      // Generate
      const token = generateQRToken('invite-999', 'roundtrip@example.com', 'host-888');
      
      // Validate
      const validation = validateQRToken(token);
      expect(validation.isValid).toBe(true);
      
      // Parse
      const parsed = parseQRData(token);
      expect(parsed.type).toBe('single');
      expect(parsed.singleGuest?.guestEmail).toBe('roundtrip@example.com');
    });

    it('should round-trip multi-guest QR', () => {
      // Generate
      const guests = [
        { email: 'multi1@example.com', name: 'Multi One' },
        { email: 'multi2@example.com', name: 'Multi Two' },
      ];
      const qrData = generateMultiGuestQR(guests);
      
      // Parse
      const parsed = parseQRData(qrData);
      expect(parsed.type).toBe('batch');
      expect(parsed.guestBatch?.guests).toHaveLength(2);
      expect(parsed.guestBatch?.guests[0].e).toBe('multi1@example.com');
    });

    it('should handle mixed valid and invalid formats in sequence', () => {
      const validBatch = JSON.stringify({ guests: [{ e: 'test@test.com', n: 'Test' }] });
      const validSingle = btoa(JSON.stringify({
        inviteId: 'id',
        guestEmail: 'email@test.com',
        hostId: 'host',
        iat: 1,
        exp: 9999999999,
      }));
      const invalid = 'not valid data';

      // Valid batch
      const result1 = parseQRData(validBatch);
      expect(result1.type).toBe('batch');

      // Valid single
      const result2 = parseQRData(validSingle);
      expect(result2.type).toBe('single');

      // Invalid
      expect(() => parseQRData(invalid)).toThrow();
    });
  });
});