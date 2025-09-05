/**
 * E2E Tests for QR Code Scanning Workflow
 * Tests the critical path: QR scan → validation → check-in
 */

import { test, expect } from '@playwright/test';
import { QRPayloadGenerator, TestDataFactory, dataHelpers } from '../test-utils';

test.describe('QR Code Scanning Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to QR scanner page
    await page.goto('/checkin');
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the right page
    await expect(page.locator('h1')).toContainText('Guest Check-in');
  });

  test('should successfully scan and process single guest QR code', async ({ page }) => {
    // Create test guest data
    const testGuest = {
      email: dataHelpers.generateTestEmail('qr-single'),
      name: 'QR Test Guest',
      phone: dataHelpers.generateTestPhoneNumber(),
    };

    // Generate QR payload
    const qrPayload = QRPayloadGenerator.createSingleGuestPayload(testGuest, {
      includeHost: true,
    });

    // Simulate QR code scan by directly setting the data
    // (In a real test, this would involve camera simulation)
    await page.evaluate((payload) => {
      // Mock QR scanner result
      window.dispatchEvent(new CustomEvent('qrScanned', {
        detail: { data: payload }
      }));
    }, qrPayload);

    // Verify guest information appears
    await expect(page.locator('[data-testid="guest-name"]')).toContainText(testGuest.name);
    await expect(page.locator('[data-testid="guest-email"]')).toContainText(testGuest.email);
    
    // Verify check-in button is enabled
    const checkinButton = page.locator('[data-testid="checkin-button"]');
    await expect(checkinButton).toBeEnabled();

    // Click check-in button
    await checkinButton.click();

    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('successfully checked in');
  });

  test('should handle multi-guest QR code scanning', async ({ page }) => {
    const testGuests = dataHelpers.generateGuestBatch(3, 'qr-multi');
    const qrPayload = QRPayloadGenerator.createMultiGuestPayload(testGuests, {
      hostId: 'test-host-123',
    });

    // Simulate QR scan
    await page.evaluate((payload) => {
      window.dispatchEvent(new CustomEvent('qrScanned', {
        detail: { data: payload }
      }));
    }, qrPayload);

    // Verify guest selection interface appears
    await expect(page.locator('[data-testid="guest-selection"]')).toBeVisible();
    
    // Verify all guests are listed
    for (const guest of testGuests) {
      await expect(page.locator(`[data-testid="guest-${guest.email}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="guest-${guest.email}"]`)).toContainText(guest.name);
    }

    // Select all guests
    const selectAllCheckbox = page.locator('[data-testid="select-all-guests"]');
    await selectAllCheckbox.check();

    // Verify all individual checkboxes are checked
    for (const guest of testGuests) {
      await expect(page.locator(`[data-testid="checkbox-${guest.email}"]`)).toBeChecked();
    }

    // Click batch check-in button
    await page.locator('[data-testid="batch-checkin-button"]').click();

    // Wait for batch processing to complete
    await expect(page.locator('[data-testid="batch-results"]')).toBeVisible();
    
    // Verify success message for batch operation
    await expect(page.locator('[data-testid="batch-success-message"]')).toContainText(`${testGuests.length} guests checked in`);
  });

  test('should handle QR code scan errors gracefully', async ({ page }) => {
    // Test with malformed QR data
    const malformedQR = '{"malformed": json data}';

    await page.evaluate((payload) => {
      window.dispatchEvent(new CustomEvent('qrScanned', {
        detail: { data: payload }
      }));
    }, malformedQR);

    // Verify error message appears
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid QR code format');

    // Verify user can try again
    const tryAgainButton = page.locator('[data-testid="try-again-button"]');
    await expect(tryAgainButton).toBeVisible();
    
    await tryAgainButton.click();
    
    // Verify scanner is reset
    await expect(page.locator('[data-testid="scanner-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
  });

  test('should handle capacity limit scenarios with override option', async ({ page }) => {
    // Create guest that will hit capacity limit
    const testGuest = {
      email: dataHelpers.generateTestEmail('capacity'),
      name: 'Capacity Test Guest',
    };

    const qrPayload = QRPayloadGenerator.createSingleGuestPayload(testGuest);

    // Mock API response for capacity limit hit
    await page.route('/api/checkin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          results: [{
            success: false,
            guestEmail: testGuest.email,
            guestName: testGuest.name,
            reason: 'Host at capacity with 3 guests. Maximum 3 concurrent guests allowed.',
            requiresOverride: true,
          }],
          summary: {
            total: 1,
            successful: 0,
            failed: 1,
          },
        }),
      });
    });

    // Simulate QR scan
    await page.evaluate((payload) => {
      window.dispatchEvent(new CustomEvent('qrScanned', {
        detail: { data: payload }
      }));
    }, qrPayload);

    // Click check-in
    await page.locator('[data-testid="checkin-button"]').click();

    // Verify override dialog appears
    await expect(page.locator('[data-testid="override-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="override-reason"]')).toContainText('capacity');

    // Fill override form
    await page.locator('[data-testid="override-reason-input"]').fill('VIP guest - approved by security');
    await page.locator('[data-testid="override-password"]').fill('override123');

    // Submit override
    await page.locator('[data-testid="submit-override"]').click();

    // Verify success after override
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('checked in with override');
  });

  test('should handle camera permissions and device selection', async ({ page }) => {
    // Grant camera permissions
    await page.context().grantPermissions(['camera']);

    // Verify camera selector is available
    await expect(page.locator('[data-testid="camera-selector"]')).toBeVisible();

    // Test camera device switching
    const cameraSelect = page.locator('[data-testid="camera-selector"] select');
    const cameraOptions = await cameraSelect.locator('option').all();
    
    if (cameraOptions.length > 1) {
      // Switch to different camera
      await cameraSelect.selectOption({ index: 1 });
      
      // Verify camera switched
      await expect(page.locator('[data-testid="camera-status"]')).toContainText('Camera switched');
    }

    // Verify scanner is active
    await expect(page.locator('[data-testid="scanner-video"]')).toBeVisible();
    await expect(page.locator('[data-testid="scanner-overlay"]')).toBeVisible();
  });

  test('should handle network connectivity issues', async ({ page }) => {
    const testGuest = {
      email: dataHelpers.generateTestEmail('network'),
      name: 'Network Test Guest',
    };

    const qrPayload = QRPayloadGenerator.createSingleGuestPayload(testGuest);

    // Simulate network failure
    await page.route('/api/checkin', async (route) => {
      await route.abort('failed');
    });

    // Simulate QR scan
    await page.evaluate((payload) => {
      window.dispatchEvent(new CustomEvent('qrScanned', {
        detail: { data: payload }
      }));
    }, qrPayload);

    // Attempt check-in
    await page.locator('[data-testid="checkin-button"]').click();

    // Verify network error handling
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="network-error"]')).toContainText('Network connection failed');

    // Verify retry option is available
    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();

    // Test offline mode indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
  });

  test('should provide accessible interface for screen readers', async ({ page }) => {
    // Test ARIA labels and roles
    await expect(page.locator('main')).toHaveAttribute('role', 'main');
    await expect(page.locator('[data-testid="scanner-container"]')).toHaveAttribute('aria-label', /QR code scanner/i);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="camera-selector"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="manual-entry-button"]')).toBeFocused();

    // Test high contrast mode compatibility
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('[data-testid="scanner-container"]')).toBeVisible();
    
    // Verify contrast ratios are maintained
    const backgroundColor = await page.locator('body').evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    expect(backgroundColor).not.toBe('rgb(255, 255, 255)'); // Should be dark
  });
});

test.describe('QR Scanner Performance', () => {
  test('should handle rapid consecutive scans', async ({ page }) => {
    await page.goto('/checkin');
    await page.waitForLoadState('networkidle');

    const testGuests = dataHelpers.generateGuestBatch(5, 'rapid');

    // Simulate rapid QR scans
    for (let i = 0; i < testGuests.length; i++) {
      const qrPayload = QRPayloadGenerator.createSingleGuestPayload(testGuests[i]);
      
      await page.evaluate((payload) => {
        window.dispatchEvent(new CustomEvent('qrScanned', {
          detail: { data: payload }
        }));
      }, qrPayload);

      // Wait a short time between scans
      await page.waitForTimeout(100);
    }

    // Verify only the last scan is processed
    await expect(page.locator('[data-testid="guest-name"]')).toContainText(testGuests[testGuests.length - 1].name);
  });

  test('should maintain performance with large guest batches', async ({ page }) => {
    await page.goto('/checkin');
    
    // Create large guest batch
    const largeGuestBatch = dataHelpers.generateGuestBatch(50, 'large-batch');
    const qrPayload = QRPayloadGenerator.createMultiGuestPayload(largeGuestBatch);

    const startTime = Date.now();

    // Simulate QR scan
    await page.evaluate((payload) => {
      window.dispatchEvent(new CustomEvent('qrScanned', {
        detail: { data: payload }
      }));
    }, qrPayload);

    // Wait for guest selection to appear
    await expect(page.locator('[data-testid="guest-selection"]')).toBeVisible();

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // Should process within reasonable time (under 2 seconds)
    expect(processingTime).toBeLessThan(2000);

    // Verify all guests are rendered (check first and last)
    await expect(page.locator(`[data-testid="guest-${largeGuestBatch[0].email}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="guest-${largeGuestBatch[49].email}"]`)).toBeVisible();

    // Verify pagination or virtualization is working for large lists
    const guestItems = page.locator('[data-testid^="guest-"]');
    const visibleCount = await guestItems.count();
    
    // Either all items are shown, or virtualization is limiting visible items
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThanOrEqual(50);
  });
});