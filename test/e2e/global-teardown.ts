import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');
  // Add any cleanup logic here if needed
  // For now, we'll rely on the dev server cleanup
}

export default globalTeardown;