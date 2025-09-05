/**
 * Test Helper Utilities
 * Common utilities and helpers for all test environments
 */

import { TestDataFactory } from './factories';

/**
 * Time and Date Helpers
 */
export class TestTimeHelpers {
  static mockCurrentTime(date: Date | string) {
    const mockDate = new Date(date);
    const originalDate = global.Date;
    
    // Mock Date constructor
    global.Date = jest.fn(() => mockDate) as any;
    global.Date.UTC = originalDate.UTC;
    global.Date.parse = originalDate.parse;
    global.Date.now = jest.fn(() => mockDate.getTime());
    
    return () => {
      global.Date = originalDate;
    };
  }

  static createDateInPast(daysAgo: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  }

  static createDateInFuture(daysFromNow: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  }

  static createExpiredDate(): Date {
    return this.createDateInPast(1);
  }

  static createValidFutureDate(): Date {
    return this.createDateInFuture(1);
  }

  static isWithinTolerance(actual: Date, expected: Date, toleranceMs = 1000): boolean {
    return Math.abs(actual.getTime() - expected.getTime()) <= toleranceMs;
  }
}

/**
 * Test Assertion Helpers
 */
export class TestAssertions {
  static expectValidationSuccess(result: any, additionalChecks?: (result: any) => void) {
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
    
    if (additionalChecks) {
      additionalChecks(result);
    }
  }

  static expectValidationFailure(result: any, expectedError?: string | RegExp, additionalChecks?: (result: any) => void) {
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
    
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect(result.error).toBe(expectedError);
      } else {
        expect(result.error).toMatch(expectedError);
      }
    }
    
    if (additionalChecks) {
      additionalChecks(result);
    }
  }

  static expectApiSuccess(response: any, additionalChecks?: (response: any) => void) {
    expect(response.success).toBe(true);
    expect(response.message).toBeDefined();
    
    if (additionalChecks) {
      additionalChecks(response);
    }
  }

  static expectApiError(response: any, expectedMessage?: string | RegExp, additionalChecks?: (response: any) => void) {
    expect(response.success).toBe(false);
    expect(response.error || response.message).toBeDefined();
    
    if (expectedMessage) {
      const errorMsg = response.error || response.message;
      if (typeof expectedMessage === 'string') {
        expect(errorMsg).toBe(expectedMessage);
      } else {
        expect(errorMsg).toMatch(expectedMessage);
      }
    }
    
    if (additionalChecks) {
      additionalChecks(response);
    }
  }
}

/**
 * HTTP Request Testing Helpers
 */
export class TestHttpHelpers {
  static async makePostRequest(url: string, body: any, headers: Record<string, string> = {}) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return { status: response.status, data };
  }

  static async makeGetRequest(url: string, headers: Record<string, string> = {}) {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    return { status: response.status, data };
  }

  static createAuthHeaders(token: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  static createTestApiUrl(path: string, baseUrl = 'http://localhost:3001'): string {
    return `${baseUrl}/api${path}`;
  }
}

/**
 * Test Data Generation Helpers
 */
export class TestDataHelpers {
  static generateTestEmail(prefix = 'test'): string {
    return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 9000) + 1000}@example.com`;
  }

  static generateTestPhoneNumber(): string {
    const area = Math.floor(Math.random() * 800) + 200;
    const exchange = Math.floor(Math.random() * 800) + 200;
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `+1-${area}-${exchange}-${number}`;
  }

  static generateGuestBatch(count: number, emailPrefix = 'batch'): Array<{ email: string; name: string; phone?: string }> {
    return Array.from({ length: count }, (_, i) => ({
      email: this.generateTestEmail(`${emailPrefix}.guest.${i + 1}`),
      name: `${emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)} Guest ${i + 1}`,
      phone: Math.random() > 0.5 ? this.generateTestPhoneNumber() : undefined,
    }));
  }

  static createTestScenarioData() {
    return {
      validGuest: {
        email: this.generateTestEmail('valid'),
        name: 'Valid Test Guest',
        phone: this.generateTestPhoneNumber(),
      },
      blacklistedGuest: {
        email: this.generateTestEmail('blacklisted'),
        name: 'Blacklisted Test Guest',
      },
      expiredTermsGuest: {
        email: this.generateTestEmail('expired'),
        name: 'Expired Terms Guest',
      },
      newGuest: {
        email: this.generateTestEmail('new'),
        name: 'New Test Guest',
        phone: this.generateTestPhoneNumber(),
      },
    };
  }
}

/**
 * Environment and Configuration Helpers
 */
export class TestEnvironmentHelpers {
  static isDemoMode(): boolean {
    return process.env.DEMO_MODE === 'true';
  }

  static isCI(): boolean {
    return process.env.CI === 'true';
  }

  static getTestDatabaseUrl(): string {
    return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';
  }

  static requireEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
  }

  static withEnvVar<T>(name: string, value: string, fn: () => T): T {
    const originalValue = process.env[name];
    process.env[name] = value;
    
    try {
      return fn();
    } finally {
      if (originalValue !== undefined) {
        process.env[name] = originalValue;
      } else {
        delete process.env[name];
      }
    }
  }
}

/**
 * Test Cleanup Helpers
 */
export class TestCleanupHelpers {
  private static cleanupFunctions: Array<() => void | Promise<void>> = [];

  static addCleanup(fn: () => void | Promise<void>) {
    this.cleanupFunctions.push(fn);
  }

  static async runCleanup() {
    for (const fn of this.cleanupFunctions) {
      await fn();
    }
    this.cleanupFunctions = [];
  }

  static resetMocks(...mocks: any[]) {
    mocks.forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockReset();
      }
    });
  }

  static clearAllMocks() {
    jest.clearAllMocks();
  }
}

/**
 * Retry and Wait Helpers
 */
export class TestWaitHelpers {
  static async waitFor(condition: () => boolean | Promise<boolean>, options: {
    timeout?: number;
    interval?: number;
    timeoutMessage?: string;
  } = {}): Promise<void> {
    const { timeout = 5000, interval = 100, timeoutMessage = 'Condition not met within timeout' } = options;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await this.sleep(interval);
    }
    
    throw new Error(timeoutMessage);
  }

  static async retry<T>(fn: () => T | Promise<T>, options: {
    maxAttempts?: number;
    delay?: number;
  } = {}): Promise<T> {
    const { maxAttempts = 3, delay = 1000 } = options;
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxAttempts) {
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError!;
  }

  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Convenience exports
export const timeHelpers = TestTimeHelpers;
export const assertions = TestAssertions;
export const httpHelpers = TestHttpHelpers;
export const dataHelpers = TestDataHelpers;
export const envHelpers = TestEnvironmentHelpers;
export const cleanupHelpers = TestCleanupHelpers;
export const waitHelpers = TestWaitHelpers;