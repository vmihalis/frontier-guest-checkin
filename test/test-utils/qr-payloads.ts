import crypto from 'crypto';
import { TestDataFactory } from './factories';

/**
 * QR Code Payload Generation Utilities
 * Handles all QR code formats supported by the check-in system
 */

export interface GuestPayload {
  e: string; // email
  n: string; // name
  p?: string; // phone (optional)
  h?: string; // host ID (optional)
  t?: string; // token (optional)
}

export interface MultiGuestPayload {
  guests: GuestPayload[];
  hostId?: string;
  eventId?: string;
  expiresAt?: string;
  signature?: string;
}

export interface LegacyInviteToken {
  inviteId: string;
  guestEmail: string;
  guestName?: string;
  hostId?: string;
  expiresAt?: string;
}

export class QRPayloadGenerator {
  private static readonly SECRET_KEY = process.env.QR_SECRET || 'test-secret-key-12345';

  // Generate HMAC signature for payload validation
  static generateSignature(payload: unknown): string {
    const hmac = crypto.createHmac('sha256', this.SECRET_KEY);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  // Format 1: Single guest object (direct JSON)
  static createSingleGuestPayload(guest: { email: string; name: string; phone?: string }, options: {
    includeHost?: boolean;
    includeToken?: boolean;
    hostId?: string;
  } = {}): string {
    const payload: GuestPayload = {
      e: guest.email,
      n: guest.name,
    };

    if (guest.phone) payload.p = guest.phone;
    if (options.includeHost || options.hostId) payload.h = options.hostId || TestDataFactory.generateId();
    if (options.includeToken) payload.t = crypto.randomBytes(16).toString('hex');

    return JSON.stringify(payload);
  }

  // Format 2: Multi-guest batch payload
  static createMultiGuestPayload(guests: Array<{ email: string; name: string; phone?: string }>, options: {
    hostId?: string;
    eventId?: string;
    expiresIn?: number; // minutes
    sign?: boolean;
  } = {}): string {
    const payload: MultiGuestPayload = {
      guests: guests.map(g => ({
        e: g.email,
        n: g.name,
        ...(g.phone && { p: g.phone }),
      })),
    };

    if (options.hostId) payload.hostId = options.hostId;
    if (options.eventId) payload.eventId = options.eventId;
    if (options.expiresIn) {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + options.expiresIn);
      payload.expiresAt = expiresAt.toISOString();
    }
    if (options.sign) payload.signature = this.generateSignature(payload);

    return JSON.stringify(payload);
  }

  // Format 3: Legacy base64-encoded invitation token
  static createLegacyInviteToken(invitation: {
    id: string;
    guestEmail: string;
    guestName?: string;
    hostId?: string;
    expiresAt?: Date;
  }): string {
    const token: LegacyInviteToken = {
      inviteId: invitation.id,
      guestEmail: invitation.guestEmail,
    };

    if (invitation.guestName) token.guestName = invitation.guestName;
    if (invitation.hostId) token.hostId = invitation.hostId;
    if (invitation.expiresAt) token.expiresAt = invitation.expiresAt.toISOString();

    const jsonToken = JSON.stringify(token);
    return Buffer.from(jsonToken).toString('base64');
  }

  // Format 4: Token field wrapper (for backwards compatibility)
  static createTokenFieldPayload(innerPayload: string | object): string {
    const payload = {
      token: typeof innerPayload === 'string' ? innerPayload : JSON.stringify(innerPayload),
    };
    return JSON.stringify(payload);
  }

  // Format 5: Guests array wrapper
  static createGuestsArrayPayload(guests: Array<{ email: string; name: string; phone?: string }>): string {
    const payload = {
      guests: guests.map(g => ({
        e: g.email,
        n: g.name,
        ...(g.phone && { p: g.phone }),
      })),
    };
    return JSON.stringify(payload);
  }

  /**
   * Generate comprehensive test scenarios for QR parsing
   */
  static createTestScenarios() {
    const testGuests = [
      { email: 'alice@example.com', name: 'Alice Johnson', phone: '+1-555-0101' },
      { email: 'bob@example.com', name: 'Bob Smith' },
      { email: 'charlie@example.com', name: 'Charlie Brown', phone: '+1-555-0103' },
    ];

    return {
      // Single guest formats
      singleGuestDirect: this.createSingleGuestPayload(testGuests[0]),
      singleGuestWithHost: this.createSingleGuestPayload(testGuests[0], { includeHost: true }),
      singleGuestWithToken: this.createSingleGuestPayload(testGuests[0], { includeToken: true }),

      // Multi-guest formats
      multiGuestBasic: this.createMultiGuestPayload(testGuests),
      multiGuestWithHost: this.createMultiGuestPayload(testGuests, { hostId: 'host-123' }),
      multiGuestSigned: this.createMultiGuestPayload(testGuests, { sign: true }),
      multiGuestExpiring: this.createMultiGuestPayload(testGuests, { expiresIn: 30 }),

      // Legacy formats
      legacyInviteToken: this.createLegacyInviteToken({
        id: 'invite-123',
        guestEmail: testGuests[0].email,
        guestName: testGuests[0].name,
        hostId: 'host-456',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      }),

      // Wrapper formats
      tokenFieldSingle: this.createTokenFieldPayload(testGuests[0]),
      tokenFieldMulti: this.createTokenFieldPayload({ guests: testGuests.slice(0, 2) }),
      guestsArrayFormat: this.createGuestsArrayPayload(testGuests.slice(0, 2)),

      // Edge cases
      emptyGuestList: this.createMultiGuestPayload([]),
      singleGuestInArray: this.createGuestsArrayPayload([testGuests[0]]),
      malformedJson: '{"guests":[{"e":"test@example.com","n":"Test}', // Intentionally malformed
      emptyPayload: '{}',
      nullPayload: 'null',
    };
  }

  /**
   * Validate QR payload format
   */
  static validatePayload(payload: string): {
    isValid: boolean;
    format: string;
    guestCount: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let format = 'unknown';
    let guestCount = 0;
    let isValid = true;

    try {
      const parsed = JSON.parse(payload);

      if (parsed.token) {
        format = 'token-field';
        // Try to parse inner token
        try {
          const innerParsed = JSON.parse(parsed.token);
          if (innerParsed.guests && Array.isArray(innerParsed.guests)) {
            guestCount = innerParsed.guests.length;
          } else {
            guestCount = 1;
          }
        } catch {
          // Could be base64 encoded
          try {
            const decoded = Buffer.from(parsed.token, 'base64').toString();
            const legacyToken = JSON.parse(decoded);
            if (legacyToken.inviteId && legacyToken.guestEmail) {
              format = 'legacy-invite';
              guestCount = 1;
            }
          } catch {
            errors.push('Invalid token field content');
            isValid = false;
          }
        }
      } else if (parsed.guests && Array.isArray(parsed.guests)) {
        format = parsed.hostId ? 'multi-guest-with-host' : 'multi-guest-basic';
        guestCount = parsed.guests.length;
        
        // Validate guest objects
        for (const guest of parsed.guests) {
          if (!guest.e || !guest.n) {
            errors.push('Guest missing required email (e) or name (n) field');
            isValid = false;
          }
        }
      } else if (parsed.e && parsed.n) {
        format = 'single-guest-direct';
        guestCount = 1;
      } else {
        errors.push('Unknown payload format');
        isValid = false;
      }
    } catch (parseError) {
      errors.push(`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      isValid = false;
    }

    return { isValid, format, guestCount, errors };
  }
}