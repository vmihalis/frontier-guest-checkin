import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Only run setup if we're not using an existing server
  if (process.env.CI || !config.webServer?.reuseExistingServer) {
    console.log('🏗️  Setting up E2E test environment...');
    
    // Wait for the server to be ready
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      // Health check - wait for the app to be ready
      await page.goto(config.use?.baseURL || 'http://localhost:3001');
      await page.waitForLoadState('networkidle');
      console.log('✅ Application server is ready');
    } catch (error) {
      console.error('❌ Failed to connect to application server:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}

export default globalSetup;