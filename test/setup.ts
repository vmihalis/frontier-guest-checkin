/**
 * Global test setup
 */

import '@testing-library/jest-dom';

// Polyfill import.meta for Jest compatibility
if (typeof (globalThis as any).importMeta === 'undefined') {
  (globalThis as any).importMeta = {
    url: `file://${__filename}`,
  };
}

// Set longer timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce test noise
const originalConsole = { ...console };

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});