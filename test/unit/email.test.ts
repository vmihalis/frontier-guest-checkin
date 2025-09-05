/**
 * Unit tests for email system
 * Tests Resend API integration, error handling, and configuration validation
 */

// Mock Resend - use function hoisting
jest.mock('resend', () => {
  const mockSendFn = jest.fn();
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: mockSendFn,
      },
    })),
    __mockSend: mockSendFn, // Export for test access
  };
});

import { sendEmail, EmailOptions, EmailResult } from '@/lib/email';

// Access the mock after imports
const mockSend = (require('resend') as any).__mockSend;

describe('Email System', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up test environment with valid configuration
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 'test-api-key-123',
      EMAIL_FROM: 'test@frontier-tower.com',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('sendEmail', () => {
    describe('successful email sending', () => {
      beforeEach(() => {
        mockSend.mockResolvedValue({
          data: { id: 'test-message-id-123' },
          error: null,
        });
      });

      test.each([
        {
          type: 'react',
          options: {
            to: 'guest@example.com',
            subject: 'Test React Email',
            react: '<div>Test React Component</div>' as any,
          },
          scenario: 'React component email',
        },
        {
          type: 'html',
          options: {
            to: 'guest@example.com',
            subject: 'Test HTML Email',
            html: '<h1>Test HTML Content</h1>',
          },
          scenario: 'HTML email',
        },
        {
          type: 'text',
          options: {
            to: 'guest@example.com',
            subject: 'Test Text Email',
            text: 'Test plain text content',
          },
          scenario: 'plain text email',
        },
      ])('should send $scenario successfully', async ({ options, type }) => {
        const result = await sendEmail(options);

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('test-message-id-123');
        expect(result.error).toBeUndefined();

        expect(mockSend).toHaveBeenCalledWith({
          from: 'test@frontier-tower.com',
          to: 'guest@example.com',
          subject: options.subject,
          [type]: options[type as keyof EmailOptions],
        });
      });

      it('should handle multiple recipients', async () => {
        const options: EmailOptions = {
          to: 'guest1@example.com,guest2@example.com',
          subject: 'Multi-recipient Test',
          text: 'Test content for multiple recipients',
        };

        const result = await sendEmail(options);

        expect(result.success).toBe(true);
        expect(mockSend).toHaveBeenCalledWith({
          from: 'test@frontier-tower.com',
          to: 'guest1@example.com,guest2@example.com',
          subject: 'Multi-recipient Test',
          text: 'Test content for multiple recipients',
        });
      });
    });

    describe('configuration validation', () => {
      it('should fail when RESEND_API_KEY is missing', async () => {
        delete process.env.RESEND_API_KEY;

        const result = await sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test content',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Email service not configured');
        expect(mockSend).not.toHaveBeenCalled();
      });

      it('should fail when EMAIL_FROM is missing', async () => {
        delete process.env.EMAIL_FROM;

        const result = await sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test content',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Email sender not configured');
        expect(mockSend).not.toHaveBeenCalled();
      });
    });

    describe('content validation', () => {
      it('should fail when no content is provided', async () => {
        const result = await sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          // No react, html, or text content
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('No email content provided (react, html, or text)');
        expect(mockSend).not.toHaveBeenCalled();
      });

      it('should prioritize react over html and text', async () => {
        mockSend.mockResolvedValue({
          data: { id: 'test-id' },
          error: null,
        });

        const options: EmailOptions = {
          to: 'test@example.com',
          subject: 'Priority Test',
          react: '<div>React content</div>' as any,
          html: '<h1>HTML content</h1>',
          text: 'Text content',
        };

        await sendEmail(options);

        expect(mockSend).toHaveBeenCalledWith({
          from: 'test@frontier-tower.com',
          to: 'test@example.com',
          subject: 'Priority Test',
          react: '<div>React content</div>',
        });
      });

      it('should prioritize html over text when react is not provided', async () => {
        mockSend.mockResolvedValue({
          data: { id: 'test-id' },
          error: null,
        });

        const options: EmailOptions = {
          to: 'test@example.com',
          subject: 'Priority Test',
          html: '<h1>HTML content</h1>',
          text: 'Text content',
        };

        await sendEmail(options);

        expect(mockSend).toHaveBeenCalledWith({
          from: 'test@frontier-tower.com',
          to: 'test@example.com',
          subject: 'Priority Test',
          html: '<h1>HTML content</h1>',
        });
      });
    });

    describe('error handling', () => {
      it('should handle Resend API errors', async () => {
        mockSend.mockResolvedValue({
          data: null,
          error: {
            message: 'Invalid API key',
            name: 'ResendError',
          },
        });

        const result = await sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test content',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid API key');
        expect(result.messageId).toBeUndefined();
      });

      it('should handle Resend API errors without message', async () => {
        mockSend.mockResolvedValue({
          data: null,
          error: {
            name: 'UnknownError',
          },
        });

        const result = await sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test content',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown Resend API error');
      });

      it('should handle network errors', async () => {
        mockSend.mockRejectedValue(new Error('Network timeout'));

        const result = await sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test content',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Network timeout');
      });

      it('should handle unknown errors', async () => {
        mockSend.mockRejectedValue('String error instead of Error object');

        const result = await sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test content',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown error');
      });
    });

    describe('edge cases and security', () => {
      beforeEach(() => {
        mockSend.mockResolvedValue({
          data: { id: 'test-id' },
          error: null,
        });
      });

      it('should handle email addresses with special characters', async () => {
        const result = await sendEmail({
          to: 'test+tag@example.co.uk',
          subject: 'Special Email Test',
          text: 'Test content',
        });

        expect(result.success).toBe(true);
        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'test+tag@example.co.uk',
          })
        );
      });

      it('should handle Unicode characters in subject and content', async () => {
        const result = await sendEmail({
          to: 'test@example.com',
          subject: 'Тест 测试 🎉 Email Subject',
          text: 'Unicode content: Тест 测试 🎉 emoji and special characters',
        });

        expect(result.success).toBe(true);
        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: 'Тест 测试 🎉 Email Subject',
            text: 'Unicode content: Тест 测试 🎉 emoji and special characters',
          })
        );
      });

      it('should handle very long subjects and content', async () => {
        const longSubject = 'A'.repeat(1000);
        const longContent = 'B'.repeat(10000);

        const result = await sendEmail({
          to: 'test@example.com',
          subject: longSubject,
          text: longContent,
        });

        expect(result.success).toBe(true);
        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: longSubject,
            text: longContent,
          })
        );
      });

      it('should not expose sensitive environment variables in errors', async () => {
        process.env.RESEND_API_KEY = 'super-secret-key-123';
        mockSend.mockRejectedValue(new Error('API key validation failed'));

        const result = await sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test content',
        });

        expect(result.success).toBe(false);
        expect(result.error).not.toContain('super-secret-key-123');
        expect(result.error).toBe('API key validation failed');
      });
    });

    describe('performance and reliability', () => {
      it('should complete email sending within reasonable time', async () => {
        mockSend.mockImplementation(
          () =>
            new Promise(resolve =>
              setTimeout(
                () =>
                  resolve({
                    data: { id: 'test-id' },
                    error: null,
                  }),
                100
              )
            )
        );

        const startTime = Date.now();
        const result = await sendEmail({
          to: 'test@example.com',
          subject: 'Performance Test',
          text: 'Test content',
        });
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(1000); // Should complete within 1 second
      });
    });
  });
});