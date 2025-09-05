/**
 * E2E Tests for Host Invitation Workflow
 * Tests the complete invitation creation, management, and guest experience
 */

import { test, expect } from '@playwright/test';
import { dataHelpers } from '../test-utils';

test.describe('Host Invitation Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to host dashboard
    await page.goto('/invites');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the invites page
    await expect(page.locator('h1')).toContainText('Guest Invitations');
  });

  test('should create single guest invitation', async ({ page }) => {
    // Click create invitation button
    await page.locator('[data-testid="create-invitation"]').click();
    await expect(page.locator('[data-testid="invitation-modal"]')).toBeVisible();

    // Fill guest information
    const guestEmail = dataHelpers.generateTestEmail('single-invite');
    const guestName = 'Single Test Guest';
    const guestPhone = dataHelpers.generateTestPhoneNumber();

    await page.locator('[data-testid="guest-email"]').fill(guestEmail);
    await page.locator('[data-testid="guest-name"]').fill(guestName);
    await page.locator('[data-testid="guest-phone"]').fill(guestPhone);

    // Set visit purpose and duration
    await page.locator('[data-testid="visit-purpose"]').selectOption('business-meeting');
    await page.locator('[data-testid="visit-duration"]').selectOption('2-hours');

    // Choose notification method
    await page.locator('[data-testid="notification-email"]').check();

    // Submit invitation
    await page.locator('[data-testid="send-invitation"]').click();

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Invitation sent successfully');

    // Verify invitation appears in the list
    await expect(page.locator('[data-testid="invitations-table"]')).toContainText(guestEmail);
    await expect(page.locator('[data-testid="invitations-table"]')).toContainText(guestName);

    // Verify QR code is generated and displayed
    const invitationRow = page.locator(`[data-testid="invitation-${guestEmail}"]`);
    await expect(invitationRow.locator('[data-testid="qr-code"]')).toBeVisible();
    
    // Test QR code download
    const downloadPromise = page.waitForEvent('download');
    await invitationRow.locator('[data-testid="download-qr"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.png');
  });

  test('should create multiple guest invitations', async ({ page }) => {
    await page.locator('[data-testid="create-invitation"]').click();
    
    // Switch to multi-guest mode
    await page.locator('[data-testid="multi-guest-toggle"]').click();
    await expect(page.locator('[data-testid="multi-guest-form"]')).toBeVisible();

    // Add multiple guests
    const guests = [
      { email: dataHelpers.generateTestEmail('multi1'), name: 'Multi Guest 1' },
      { email: dataHelpers.generateTestEmail('multi2'), name: 'Multi Guest 2' },
      { email: dataHelpers.generateTestEmail('multi3'), name: 'Multi Guest 3' },
    ];

    for (let i = 0; i < guests.length; i++) {
      if (i > 0) {
        await page.locator('[data-testid="add-guest"]').click();
      }
      
      const guestRow = page.locator(`[data-testid="guest-row-${i}"]`);
      await guestRow.locator('[data-testid="guest-email"]').fill(guests[i].email);
      await guestRow.locator('[data-testid="guest-name"]').fill(guests[i].name);
    }

    // Set shared details
    await page.locator('[data-testid="group-visit-purpose"]').selectOption('team-meeting');
    await page.locator('[data-testid="meeting-room"]').selectOption('conference-room-a');

    // Generate group QR code
    await page.locator('[data-testid="generate-group-qr"]').check();

    // Send invitations
    await page.locator('[data-testid="send-invitations"]').click();

    // Verify success for multiple guests
    await expect(page.locator('[data-testid="batch-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="batch-success"]')).toContainText(`${guests.length} invitations sent`);

    // Verify all guests appear in the table
    for (const guest of guests) {
      await expect(page.locator('[data-testid="invitations-table"]')).toContainText(guest.email);
    }

    // Verify group QR code is available
    await expect(page.locator('[data-testid="group-qr-code"]')).toBeVisible();
    
    // Test group QR download
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="download-group-qr"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('group');
  });

  test('should manage invitation status and resend invitations', async ({ page }) => {
    // Assume we have existing invitations in the table
    const invitationRow = page.locator('[data-testid="invitation-row"]').first();
    
    // Test status filtering
    await page.locator('[data-testid="status-filter"]').selectOption('pending');
    await expect(page.locator('[data-testid="pending-invitations"]')).toBeVisible();

    await page.locator('[data-testid="status-filter"]').selectOption('activated');
    await expect(page.locator('[data-testid="activated-invitations"]')).toBeVisible();

    // Reset filter
    await page.locator('[data-testid="status-filter"]').selectOption('all');

    // Test resending invitation
    await invitationRow.locator('[data-testid="resend-invitation"]').click();
    await expect(page.locator('[data-testid="resend-confirmation"]')).toBeVisible();
    
    await page.locator('[data-testid="confirm-resend"]').click();
    await expect(page.locator('[data-testid="resend-success"]')).toContainText('Invitation resent');

    // Test canceling invitation
    await invitationRow.locator('[data-testid="cancel-invitation"]').click();
    await expect(page.locator('[data-testid="cancel-confirmation"]')).toBeVisible();
    
    await page.locator('[data-testid="cancel-reason"]').fill('Meeting postponed');
    await page.locator('[data-testid="confirm-cancel"]').click();
    
    // Verify status change
    await expect(invitationRow.locator('[data-testid="invitation-status"]')).toContainText('Cancelled');
  });

  test('should handle invitation scheduling and reminders', async ({ page }) => {
    await page.locator('[data-testid="create-invitation"]').click();

    // Fill basic information
    await page.locator('[data-testid="guest-email"]').fill(dataHelpers.generateTestEmail('scheduled'));
    await page.locator('[data-testid="guest-name"]').fill('Scheduled Guest');

    // Enable scheduling
    await page.locator('[data-testid="schedule-invitation"]').check();
    await expect(page.locator('[data-testid="scheduling-options"]')).toBeVisible();

    // Set visit date and time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    await page.locator('[data-testid="visit-date"]').fill(dateString);
    await page.locator('[data-testid="visit-time"]').fill('14:00');

    // Set reminder preferences
    await page.locator('[data-testid="send-reminders"]').check();
    await page.locator('[data-testid="reminder-time"]').selectOption('1-hour-before');
    
    // Add calendar integration
    await page.locator('[data-testid="add-to-calendar"]').check();

    // Send scheduled invitation
    await page.locator('[data-testid="send-invitation"]').click();

    // Verify scheduling confirmation
    await expect(page.locator('[data-testid="schedule-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="schedule-confirmation"]')).toContainText('scheduled for');
    await expect(page.locator('[data-testid="schedule-confirmation"]')).toContainText(dateString);

    // Verify reminder is set
    const invitationRow = page.locator('[data-testid="invitation-row"]').first();
    await expect(invitationRow.locator('[data-testid="reminder-indicator"]')).toBeVisible();
  });

  test('should provide invitation analytics and insights', async ({ page }) => {
    // Navigate to analytics section
    await page.locator('[data-testid="invitation-analytics"]').click();
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();

    // Verify key metrics are displayed
    await expect(page.locator('[data-testid="total-invitations"]')).toBeVisible();
    await expect(page.locator('[data-testid="activation-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="response-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-show-rate"]')).toBeVisible();

    // Test date range filtering for analytics
    await page.locator('[data-testid="analytics-date-filter"]').click();
    await page.locator('[data-testid="last-30-days"]').click();
    
    // Verify charts update
    await expect(page.locator('[data-testid="invitation-trends-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-breakdown-chart"]')).toBeVisible();

    // Test exporting analytics
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="export-analytics"]').click();
    await page.locator('[data-testid="export-csv"]').click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('analytics');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should handle bulk operations efficiently', async ({ page }) => {
    // Select multiple invitations
    await page.locator('[data-testid="select-all-invitations"]').check();
    
    // Verify bulk actions become available
    await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
    
    // Test bulk resend
    await page.locator('[data-testid="bulk-resend"]').click();
    await expect(page.locator('[data-testid="bulk-resend-confirmation"]')).toBeVisible();
    
    await page.locator('[data-testid="confirm-bulk-resend"]').click();
    await expect(page.locator('[data-testid="bulk-progress"]')).toBeVisible();
    
    // Wait for bulk operation to complete
    await expect(page.locator('[data-testid="bulk-success"]')).toBeVisible();
    
    // Test bulk status change
    await page.locator('[data-testid="select-pending-invitations"]').click();
    await page.locator('[data-testid="bulk-actions"] select').selectOption('mark-activated');
    await page.locator('[data-testid="apply-bulk-action"]').click();
    
    // Verify status changes
    await expect(page.locator('[data-testid="bulk-status-success"]')).toBeVisible();
  });
});

test.describe('Guest Experience Workflow', () => {
  test('should handle guest invitation acceptance flow', async ({ page }) => {
    // Simulate guest receiving invitation email and clicking link
    const invitationToken = 'test-invitation-token-123';
    await page.goto(`/invites/accept/${invitationToken}`);
    
    // Verify acceptance page loads
    await expect(page.locator('[data-testid="accept-invitation"]')).toBeVisible();
    await expect(page.locator('[data-testid="host-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="visit-details"]')).toBeVisible();

    // Fill out acceptance form
    await page.locator('[data-testid="confirm-attendance"]').check();
    
    // Accept terms and conditions
    await page.locator('[data-testid="terms-checkbox"]').check();
    
    // Provide additional details if required
    await page.locator('[data-testid="dietary-restrictions"]').fill('Vegetarian');
    await page.locator('[data-testid="accessibility-needs"]').fill('None');

    // Submit acceptance
    await page.locator('[data-testid="accept-invitation-button"]').click();

    // Verify acceptance confirmation
    await expect(page.locator('[data-testid="acceptance-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="qr-code-display"]')).toBeVisible();
    
    // Verify guest can download their QR code
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="download-my-qr"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('qr');

    // Verify calendar integration options
    await expect(page.locator('[data-testid="add-to-calendar-options"]')).toBeVisible();
    
    // Test Google Calendar integration
    await page.locator('[data-testid="add-to-google-calendar"]').click();
    // This would typically open a new window/tab for Google Calendar
  });

  test('should handle guest check-in experience', async ({ page }) => {
    // Simulate guest arriving and using their QR code
    await page.goto('/checkin');
    
    // Simulate QR code scan (guest's personal QR)
    const guestQRToken = 'guest-personal-qr-token-456';
    await page.evaluate((token) => {
      window.dispatchEvent(new CustomEvent('qrScanned', {
        detail: { data: token }
      }));
    }, guestQRToken);

    // Verify guest information is displayed
    await expect(page.locator('[data-testid="guest-welcome"]')).toBeVisible();
    await expect(page.locator('[data-testid="host-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="visit-purpose"]')).toBeVisible();

    // Complete check-in process
    await page.locator('[data-testid="confirm-checkin"]').click();

    // Verify check-in success
    await expect(page.locator('[data-testid="checkin-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="badge-information"]')).toBeVisible();
    
    // Show directions or next steps
    await expect(page.locator('[data-testid="directions-to-host"]')).toBeVisible();
    await expect(page.locator('[data-testid="emergency-contacts"]')).toBeVisible();
  });

  test('should handle invitation expiration and errors', async ({ page }) => {
    // Test expired invitation
    const expiredToken = 'expired-invitation-token';
    await page.goto(`/invites/accept/${expiredToken}`);
    
    // Mock expired invitation response
    await page.route('/api/invitations/*/accept', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invitation has expired',
          expiredAt: '2025-01-01T00:00:00Z',
        }),
      });
    });

    await page.locator('[data-testid="accept-invitation-button"]').click();

    // Verify expiration handling
    await expect(page.locator('[data-testid="invitation-expired"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-host-option"]')).toBeVisible();
    
    // Test requesting new invitation
    await page.locator('[data-testid="request-new-invitation"]').click();
    await expect(page.locator('[data-testid="request-sent"]')).toBeVisible();

    // Test invalid invitation token
    await page.goto('/invites/accept/invalid-token-123');
    await expect(page.locator('[data-testid="invitation-not-found"]')).toBeVisible();
    await expect(page.locator('[data-testid="home-page-link"]')).toBeVisible();
  });
});

test.describe('Invitation System Integration', () => {
  test('should sync with calendar systems', async ({ page }) => {
    await page.goto('/invites');
    
    // Navigate to calendar integration settings
    await page.locator('[data-testid="integration-settings"]').click();
    await expect(page.locator('[data-testid="calendar-integrations"]')).toBeVisible();

    // Test Google Calendar connection
    await page.locator('[data-testid="connect-google-calendar"]').click();
    // In a real test, this would handle OAuth flow
    // For now, we'll mock the connection
    
    await page.locator('[data-testid="mock-calendar-success"]').click();
    await expect(page.locator('[data-testid="google-calendar-connected"]')).toBeVisible();

    // Test Outlook integration
    await page.locator('[data-testid="connect-outlook"]').click();
    await page.locator('[data-testid="mock-outlook-success"]').click();
    await expect(page.locator('[data-testid="outlook-connected"]')).toBeVisible();

    // Verify calendar sync preferences
    await page.locator('[data-testid="sync-preferences"]').click();
    await page.locator('[data-testid="auto-create-events"]').check();
    await page.locator('[data-testid="include-qr-in-event"]').check();
    
    await page.locator('[data-testid="save-preferences"]').click();
    await expect(page.locator('[data-testid="preferences-saved"]')).toBeVisible();
  });

  test('should integrate with email systems and templates', async ({ page }) => {
    await page.goto('/invites');
    await page.locator('[data-testid="email-settings"]').click();

    // Test email template customization
    await expect(page.locator('[data-testid="email-templates"]')).toBeVisible();
    
    // Select invitation template
    await page.locator('[data-testid="template-invitation"]').click();
    
    // Customize template
    const subjectField = page.locator('[data-testid="email-subject"]');
    await subjectField.clear();
    await subjectField.fill('You\'re invited to visit Frontier Tower - {guest_name}');
    
    // Test template variables
    await page.locator('[data-testid="insert-variable"]').click();
    await page.locator('[data-testid="variable-host-name"]').click();
    
    // Preview template
    await page.locator('[data-testid="preview-template"]').click();
    await expect(page.locator('[data-testid="template-preview"]')).toBeVisible();
    
    // Save template
    await page.locator('[data-testid="save-template"]').click();
    await expect(page.locator('[data-testid="template-saved"]')).toBeVisible();

    // Test email delivery settings
    await page.locator('[data-testid="delivery-settings"]').click();
    await page.locator('[data-testid="smtp-settings"]').fill('smtp.company.com');
    await page.locator('[data-testid="from-address"]').fill('noreply@frontier.com');
    
    // Test email connection
    await page.locator('[data-testid="test-email-connection"]').click();
    await expect(page.locator('[data-testid="connection-success"]')).toBeVisible();
  });
});