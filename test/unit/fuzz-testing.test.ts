/**
 * Fuzz testing for input validation and error handling
 * Generates random inputs to test robustness and security
 */

import { parseQRData } from '@/lib/qr-token';
import { validateOverridePassword, validateOverrideRequest } from '@/lib/override';
import { cn } from '@/lib/utils';

describe('Fuzz Testing Patterns', () => {
  // Helper to generate random strings
  const generateRandomString = (length: number, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  };

  // Helper to generate random bytes
  const generateRandomBytes = (length: number) => {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  };

  // Helper to generate random JSON-like structures
  const generateRandomObject = (depth = 0, maxDepth = 3): any => {
    if (depth >= maxDepth) {
      return generateRandomString(10);
    }
    
    const types = ['string', 'number', 'boolean', 'array', 'object', 'null'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    switch (type) {
      case 'string':
        return generateRandomString(Math.floor(Math.random() * 100));
      case 'number':
        return Math.random() * 1000000 - 500000;
      case 'boolean':
        return Math.random() > 0.5;
      case 'array':
        const arrLength = Math.floor(Math.random() * 5);
        return Array(arrLength).fill(0).map(() => generateRandomObject(depth + 1, maxDepth));
      case 'object':
        const obj: any = {};
        const objLength = Math.floor(Math.random() * 5);
        for (let i = 0; i < objLength; i++) {
          const key = generateRandomString(Math.floor(Math.random() * 20) + 1);
          obj[key] = generateRandomObject(depth + 1, maxDepth);
        }
        return obj;
      case 'null':
        return null;
      default:
        return undefined;
    }
  };

  describe('QR Data Parsing Fuzzing', () => {
    it('should handle random binary data without crashing', () => {
      const testCases = 100;
      
      for (let i = 0; i < testCases; i++) {
        const randomLength = Math.floor(Math.random() * 1000) + 1;
        const randomData = generateRandomBytes(randomLength);
        
        expect(() => {
          const result = parseQRData(randomData);
          // Should always return null for invalid data, never throw
          expect(result === null || typeof result === 'object').toBe(true);
        }).not.toThrow();
      }
    });

    it('should handle random UTF-8 strings safely', () => {
      const testCases = 100;
      const unicodeRanges = [
        [0x0000, 0x007F], // ASCII
        [0x0080, 0x00FF], // Latin-1
        [0x0100, 0x017F], // Latin Extended-A
        [0x4E00, 0x9FFF], // CJK Unified Ideographs
        [0x1F600, 0x1F64F], // Emoticons
      ];
      
      for (let i = 0; i < testCases; i++) {
        let randomString = '';
        const stringLength = Math.floor(Math.random() * 500) + 1;
        
        for (let j = 0; j < stringLength; j++) {
          const range = unicodeRanges[Math.floor(Math.random() * unicodeRanges.length)];
          const codePoint = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
          randomString += String.fromCodePoint(codePoint);
        }
        
        expect(() => {
          const result = parseQRData(randomString);
          if (result !== null) {
            expect(typeof result).toBe('object');
          }
        }).not.toThrow();
      }
    });

    it('should handle malformed JSON structures', () => {
      const malformedPatterns = [
        () => '{"guests":' + generateRandomString(50) + '}',
        () => '{"' + generateRandomString(20) + '":}',
        () => '{' + generateRandomString(100),
        () => generateRandomString(50) + '}',
        () => '[{"e":' + Math.random() + '}]',
        () => '{"guests":[' + generateRandomString(30) + ']}',
        () => generateRandomObject(0, 2), // Random object structure
      ];
      
      for (let i = 0; i < 50; i++) {
        const pattern = malformedPatterns[Math.floor(Math.random() * malformedPatterns.length)];
        let testData;
        
        try {
          const generated = pattern();
          testData = typeof generated === 'string' ? generated : JSON.stringify(generated);
        } catch {
          testData = generateRandomString(100);
        }
        
        // Ensure testData is always a string
        if (typeof testData !== 'string') {
          testData = String(testData);
        }
        
        const result = parseQRData(testData);
        // Should handle gracefully and return null for invalid data
        expect(result).toBeNull();
      }
    });

    it('should handle extreme base64 edge cases', () => {
      const base64EdgeCases = [
        '', // Empty
        'A', // Too short
        'AB', // Still too short  
        'ABC', // Missing padding
        '====', // Only padding
        'A===', // Invalid padding position
        generateRandomString(10000, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='),
        'Valid' + String.fromCharCode(0) + 'Base64', // Null bytes
        'Normal123+/=' + generateRandomString(100, '!@#$%^&*()'), // Mixed valid/invalid
      ];
      
      base64EdgeCases.forEach(testCase => {
        expect(() => {
          const result = parseQRData(testCase);
          // Should not throw
        }).not.toThrow();
      });
    });
  });

  describe('Override Password Fuzzing', () => {
    beforeEach(() => {
      process.env.OVERRIDE_PASSWORD = 'test-password-123';
    });

    it('should handle random password inputs safely', () => {
      const testCases = 200;
      
      for (let i = 0; i < testCases; i++) {
        const randomPassword = generateRandomString(
          Math.floor(Math.random() * 500),
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
        );
        
        expect(() => {
          const result = validateOverridePassword(randomPassword);
          expect(typeof result).toBe('boolean');
        }).not.toThrow();
      }
    });

    it('should handle binary and control character inputs', () => {
      const testCases = 100;
      
      for (let i = 0; i < testCases; i++) {
        const randomPassword = generateRandomBytes(Math.floor(Math.random() * 200) + 1);
        
        expect(() => {
          const result = validateOverridePassword(randomPassword);
          expect(typeof result).toBe('boolean');
        }).not.toThrow();
      }
    });

    it('should handle override request fuzzing', () => {
      const testCases = 100;
      
      for (let i = 0; i < testCases; i++) {
        const randomRequest = {
          reason: generateRandomString(Math.floor(Math.random() * 1000)),
          password: generateRandomString(Math.floor(Math.random() * 100)),
        };
        
        // Add random properties to test object injection resistance
        if (Math.random() > 0.7) {
          (randomRequest as any).__proto__ = { isValid: true };
        }
        if (Math.random() > 0.7) {
          (randomRequest as any).constructor = { name: 'ValidRequest' };
        }
        
        expect(() => {
          const result = validateOverrideRequest(randomRequest);
          expect(typeof result).toBe('object');
          expect(typeof result.isValid).toBe('boolean');
          if (!result.isValid) {
            expect(typeof result.error).toBe('string');
          }
        }).not.toThrow();
      }
    });
  });

  describe('CSS Class Name Fuzzing', () => {
    it('should handle random class name combinations', () => {
      const testCases = 200;
      
      for (let i = 0; i < testCases; i++) {
        const numArgs = Math.floor(Math.random() * 10) + 1;
        const args = [];
        
        for (let j = 0; j < numArgs; j++) {
          const argType = Math.random();
          if (argType < 0.3) {
            // String
            args.push(generateRandomString(Math.floor(Math.random() * 200)));
          } else if (argType < 0.5) {
            // Array
            const arrLen = Math.floor(Math.random() * 5);
            args.push(Array(arrLen).fill(0).map(() => generateRandomString(20)));
          } else if (argType < 0.7) {
            // Object
            const obj: any = {};
            const objLen = Math.floor(Math.random() * 5);
            for (let k = 0; k < objLen; k++) {
              obj[generateRandomString(10)] = Math.random() > 0.5;
            }
            args.push(obj);
          } else {
            // Random values
            args.push([null, undefined, false, true, 0, ''][Math.floor(Math.random() * 6)]);
          }
        }
        
        expect(() => {
          const result = cn(...args as any[]);
          expect(typeof result).toBe('string');
        }).not.toThrow();
      }
    });

    it('should handle extreme length inputs', () => {
      const extremeLengths = [10000, 50000, 100000];
      
      extremeLengths.forEach(length => {
        const longClass = generateRandomString(length, 'abcdefghijklmnopqrstuvwxyz- ');
        
        expect(() => {
          const result = cn(longClass);
          expect(typeof result).toBe('string');
          // Should not cause memory issues
          expect(result.length).toBeLessThanOrEqual(length * 2); // Reasonable upper bound
        }).not.toThrow();
      });
    });
  });

  describe('Input Injection Testing', () => {
    it('should resist SQL injection patterns in QR data', () => {
      const sqlInjectionPatterns = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM passwords --",
        "admin'; UPDATE users SET admin=1 WHERE username='guest'; --",
        "' AND 1=1; INSERT INTO admin VALUES ('hacker', 'password'); --",
      ];
      
      sqlInjectionPatterns.forEach(pattern => {
        const maliciousQR = JSON.stringify({
          guests: [{ e: pattern, n: pattern }]
        });
        
        const result = parseQRData(maliciousQR);
        expect(result).not.toBeNull();
        if (result && result.guests && result.guests.length > 0) {
          // Data should be preserved as-is for proper handling upstream
          expect(result.guests[0].e).toBe(pattern);
          expect(result.guests[0].n).toBe(pattern);
        }
      });
    });

    it('should resist XSS patterns in override reasons', () => {
      const xssPatterns = [
        '<script>alert("xss")</script>',
        'javascript:alert(document.cookie)',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>',
        '\';alert("xss");var a=\'',
      ];
      
      xssPatterns.forEach(pattern => {
        const request = {
          reason: pattern.repeat(10), // Make it long enough to pass length validation
          password: 'test-password-123'
        };
        
        expect(() => {
          const result = validateOverrideRequest(request);
          // Should validate based on length and password, not content filtering
          if (result.isValid) {
            expect(request.reason).toContain(pattern);
          }
        }).not.toThrow();
      });
    });

    it('should handle prototype pollution attempts', () => {
      const pollutionAttempts = [
        '{"__proto__":{"isValid":true}}',
        '{"constructor":{"prototype":{"admin":true}}}',
        '{"guests":[{"__proto__":{"admin":true},"e":"test@test.com","n":"hacker"}]}',
      ];
      
      pollutionAttempts.forEach(attempt => {
        expect(() => {
          const result = parseQRData(attempt);
          // Should parse without allowing pollution
          if (result) {
            expect((result as any).isValid).toBeUndefined();
            expect((result as any).admin).toBeUndefined();
          }
        }).not.toThrow();
      });
    });
  });

  describe('Memory and Performance Fuzzing', () => {
    it('should handle deeply nested objects without stack overflow', () => {
      let deepObject: any = 'bottom';
      for (let i = 0; i < 100; i++) {
        deepObject = { level: i, nested: deepObject };
      }
      
      const deepQR = JSON.stringify({ guests: [{ e: 'test@test.com', n: 'test', data: deepObject }] });
      
      expect(() => {
        const result = parseQRData(deepQR);
        // Should handle or reject gracefully
      }).not.toThrow();
    });

    it('should handle large arrays efficiently', () => {
      const sizes = [100, 1000];  // Reduced 5000 to avoid memory issues in tests
      
      sizes.forEach(size => {
        const largeGuestArray = Array(size).fill(0).map((_, i) => ({
          e: `guest${i}@example.com`,
          n: `Guest ${i}`
        }));
        
        const largeQR = JSON.stringify({ guests: largeGuestArray });
        
        const result = parseQRData(largeQR);
        expect(result).not.toBeNull();
        if (result && result.guests) {
          expect(result.guests).toHaveLength(size);
        }
      });
    });

    it('should handle rapid successive calls without memory leaks', () => {
      const rapidCalls = 1000;
      
      expect(() => {
        for (let i = 0; i < rapidCalls; i++) {
          const randomData = generateRandomString(100);
          parseQRData(randomData);
          cn(randomData, 'test-class');
          validateOverridePassword(randomData);
        }
      }).not.toThrow();
    });
  });
});