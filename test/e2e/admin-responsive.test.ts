import { test, expect, devices } from '@playwright/test';

// iPhone 12 device configuration
const iPhone12 = devices['iPhone 12'];

// Configure iPhone 12 settings at the top level
test.use({
  ...iPhone12
});

test.describe('Admin Page Responsiveness - iPhone 12', () => {

  test('should display admin page correctly on iPhone 12 screen size', async ({ page }) => {

    // Navigate to admin page
    await page.goto('http://localhost:3001/admin');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test/screenshots/admin-iphone12-full.png', fullPage: true });
    
    // Verify viewport dimensions are correct for iPhone 12 (actual usable viewport)
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(390);
    expect(viewport?.height).toBe(664); // Actual usable viewport (844 - browser chrome)
    
    // Test 1: Check if the page loads without errors (check for key content instead of title)
    await expect(page.locator('h1')).toContainText('Frontier Tower');
    
    // Test 2: Verify key UI elements are visible and properly sized
    const header = page.locator('h1').first();
    await expect(header).toBeVisible();
    
    // Test 3: Check navigation/menu responsiveness
    const navElements = page.locator('nav, [role="navigation"]');
    for (const nav of await navElements.all()) {
      await expect(nav).toBeVisible();
    }
    
    // Test 4: Verify cards/panels stack vertically on mobile
    const cards = page.locator('[class*="card"], [class*="Card"]').first();
    if (await cards.count() > 0) {
      const cardBox = await cards.boundingBox();
      if (cardBox) {
        // Cards should take most of the width on mobile
        expect(cardBox.width).toBeGreaterThan(300); // Should be close to viewport width
      }
    }
    
    // Test 5: Check for horizontal scroll (should be minimal/none)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = viewport?.width || 390;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Allow small buffer
    
    console.log(`✅ Admin page viewport: ${viewport?.width}x${viewport?.height}`);
    console.log(`✅ Body scroll width: ${bodyWidth}px`);
  });

  test('should handle stats cards responsively', async ({ page }) => {

    await page.goto('http://localhost:3001/admin');
    await page.waitForLoadState('networkidle');
    
    // Look for stats cards/metrics
    const statsCards = page.locator('[class*="stat"], [class*="metric"], [class*="card"]');
    const cardCount = await statsCards.count();
    
    if (cardCount > 0) {
      console.log(`📊 Found ${cardCount} stats cards/elements`);
      
      // Take screenshot of stats section
      await page.screenshot({ path: 'test/screenshots/admin-iphone12-stats.png' });
      
      // Check if cards stack vertically (mobile layout)
      const firstCard = statsCards.first();
      const lastCard = statsCards.nth(Math.min(cardCount - 1, 3)); // Check up to 4 cards
      
      if (cardCount > 1) {
        const firstBox = await firstCard.boundingBox();
        const lastBox = await lastCard.boundingBox();
        
        if (firstBox && lastBox) {
          // Cards should be stacked vertically, so Y positions should be different
          const verticalSpacing = Math.abs(lastBox.y - firstBox.y);
          expect(verticalSpacing).toBeGreaterThan(50); // Should have vertical separation
          
          console.log(`📱 Cards are stacked vertically with ${verticalSpacing}px spacing`);
        }
      }
    }
  });

  test('should handle tables/data tables responsively', async ({ page }) => {

    await page.goto('http://localhost:3001/admin');
    await page.waitForLoadState('networkidle');
    
    // Look for tables
    const tables = page.locator('table, [role="table"]');
    const tableCount = await tables.count();
    
    if (tableCount > 0) {
      console.log(`📋 Found ${tableCount} tables`);
      
      for (let i = 0; i < tableCount; i++) {
        const table = tables.nth(i);
        const tableBox = await table.boundingBox();
        
        if (tableBox) {
          // Table should not exceed viewport width significantly
          expect(tableBox.width).toBeLessThanOrEqual(410); // iPhone 12 width + small buffer
          
          // Check if table has horizontal scroll container
          const scrollParent = page.locator('table, [role="table"]').nth(i).locator('xpath=ancestor-or-self::*[contains(@class, "overflow") or contains(@style, "overflow")]').first();
          
          if (await scrollParent.count() > 0) {
            console.log(`📱 Table ${i + 1} has scroll container for mobile`);
          }
        }
      }
      
      // Take screenshot of tables section
      await page.screenshot({ path: 'test/screenshots/admin-iphone12-tables.png' });
    }
  });

  test('should handle forms and controls responsively', async ({ page }) => {

    await page.goto('http://localhost:3001/admin');
    await page.waitForLoadState('networkidle');
    
    // Look for form controls - inputs, selects, buttons
    const inputs = page.locator('input, select, button');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      console.log(`🎮 Found ${inputCount} form controls`);
      
      // Check a few form controls for touch-friendly sizing
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const control = inputs.nth(i);
        const controlBox = await control.boundingBox();
        
        if (controlBox) {
          // Controls should be at least 44px tall for touch targets (Apple HIG)
          if (controlBox.height < 44) {
            console.log(`⚠️  Control ${i + 1} may be too small for touch: ${controlBox.height}px tall`);
          } else {
            console.log(`✅ Control ${i + 1} has good touch target size: ${controlBox.height}px tall`);
          }
        }
      }
      
      // Take screenshot of controls
      await page.screenshot({ path: 'test/screenshots/admin-iphone12-controls.png' });
    }
  });

  test('should test scroll behavior and content overflow', async ({ page }) => {

    await page.goto('http://localhost:3001/admin');
    await page.waitForLoadState('networkidle');
    
    // Get page dimensions
    const { scrollHeight, scrollWidth, clientHeight, clientWidth } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientHeight: document.documentElement.clientHeight,
      clientWidth: document.documentElement.clientWidth
    }));
    
    console.log(`📐 Page dimensions:`);
    console.log(`   Viewport: ${clientWidth}x${clientHeight}`);
    console.log(`   Scroll area: ${scrollWidth}x${scrollHeight}`);
    
    // Test vertical scrolling (expected on mobile)
    const hasVerticalScroll = scrollHeight > clientHeight;
    console.log(`📜 Vertical scroll needed: ${hasVerticalScroll}`);
    
    // Test horizontal scrolling (should be minimal)
    const hasHorizontalScroll = scrollWidth > clientWidth;
    if (hasHorizontalScroll) {
      const excessWidth = scrollWidth - clientWidth;
      console.log(`⚠️  Horizontal scroll detected: ${excessWidth}px excess width`);
    } else {
      console.log(`✅ No horizontal scroll - good mobile layout`);
    }
    
    // Scroll to test content at bottom
    if (hasVerticalScroll) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test/screenshots/admin-iphone12-bottom.png' });
    }
    
    // Expectations
    expect(hasHorizontalScroll).toBe(false);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);
  });
});