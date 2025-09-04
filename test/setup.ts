/**
 * Global test setup
 */

import '@testing-library/jest-dom';

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