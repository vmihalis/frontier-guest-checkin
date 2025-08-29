import crypto from 'crypto'
import { TestDataFactory } from './TestDataFactory'

export interface GuestPayload {
  e: string  // email
  n: string  // name
  p?: string // phone (optional)
  h?: string // host ID (optional)
  t?: string // token (optional)
}

export interface MultiGuestPayload {
  guests: GuestPayload[]
  hostId?: string
  eventId?: string
  expiresAt?: string
  signature?: string
}

export class QRPayloadGenerator {
  private static SECRET_KEY = process.env.QR_SECRET || 'test-secret-key'

  static generateSignature(payload: any): string {
    const hmac = crypto.createHmac('sha256', this.SECRET_KEY)
    hmac.update(JSON.stringify(payload))
    return hmac.digest('hex')
  }

  static createSingleGuestPayload(guest: any, options: { includeHost?: boolean; includeToken?: boolean } = {}): string {
    const payload: GuestPayload = {
      e: guest.email,
      n: guest.name,
    }

    if (guest.phone) payload.p = guest.phone
    if (options.includeHost) payload.h = TestDataFactory.generateId()
    if (options.includeToken) payload.t = crypto.randomBytes(16).toString('hex')

    return JSON.stringify(payload)
  }

  static createMultiGuestPayload(guests: any[], options: { 
    hostId?: string;
    eventId?: string;
    expiresIn?: number;
    sign?: boolean;
  } = {}): string {
    const payload: MultiGuestPayload = {
      guests: guests.map(g => ({
        e: g.email,
        n: g.name,
        ...(g.phone && { p: g.phone }),
      })),
    }

    if (options.hostId) payload.hostId = options.hostId
    if (options.eventId) payload.eventId = options.eventId
    
    if (options.expiresIn) {
      const expiresAt = new Date(Date.now() + options.expiresIn * 1000)
      payload.expiresAt = expiresAt.toISOString()
    }

    if (options.sign) {
      payload.signature = this.generateSignature(payload)
    }

    return JSON.stringify(payload)
  }

  static createBatchCheckInPayload(guestEmails: string[]): string {
    return JSON.stringify({
      emails: guestEmails.map(email => ({
        e: email,
        n: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      })),
    })
  }

  static createTestScenarios() {
    TestDataFactory.resetCounters()

    const scenarios = {
      validSingle: () => {
        const guest = TestDataFactory.createGuest()
        return this.createSingleGuestPayload(guest)
      },

      validMultiple: (count: number = 3) => {
        const guests = TestDataFactory.createGuestBatch(count)
        return this.createMultiGuestPayload(guests, { sign: true })
      },

      withBlacklisted: () => {
        const guests = [
          TestDataFactory.createGuest(),
          TestDataFactory.createBlacklistedGuest(),
          TestDataFactory.createGuest(),
        ]
        return this.createMultiGuestPayload(guests)
      },

      withoutTerms: () => {
        const guests = [
          TestDataFactory.createGuest(),
          TestDataFactory.createGuestWithoutTerms(),
          TestDataFactory.createGuest(),
        ]
        return this.createMultiGuestPayload(guests)
      },

      expired: () => {
        const guests = TestDataFactory.createGuestBatch(3)
        return this.createMultiGuestPayload(guests, {
          expiresIn: -3600,
          sign: true,
        })
      },

      largeGroup: (size: number = 50) => {
        const guests = TestDataFactory.createGuestBatch(size)
        return this.createMultiGuestPayload(guests, {
          eventId: 'conference-2025',
          hostId: TestDataFactory.generateId(),
          sign: true,
        })
      },

      duplicateGuests: () => {
        const guest = TestDataFactory.createGuest()
        const guests = [guest, guest, guest]
        return this.createMultiGuestPayload(guests)
      },

      mixedValidity: () => {
        const guests = [
          TestDataFactory.createGuest({ termsAcceptedAt: new Date() }),
          TestDataFactory.createGuest({ termsAcceptedAt: null }),
          TestDataFactory.createBlacklistedGuest(),
          TestDataFactory.createGuest({ termsAcceptedAt: new Date() }),
        ]
        return this.createMultiGuestPayload(guests, { sign: true })
      },

      invalidSignature: () => {
        const guests = TestDataFactory.createGuestBatch(3)
        const payload = JSON.parse(this.createMultiGuestPayload(guests, { sign: true }))
        payload.signature = 'invalid-signature-12345'
        return JSON.stringify(payload)
      },

      malformed: () => {
        return JSON.stringify({
          invalid: 'structure',
          no: 'guests',
        })
      },
    }

    return scenarios
  }

  static parsePayload(qrData: string): MultiGuestPayload | GuestPayload | null {
    try {
      const parsed = JSON.parse(qrData)
      
      if ('guests' in parsed) {
        return parsed as MultiGuestPayload
      } else if ('e' in parsed && 'n' in parsed) {
        return parsed as GuestPayload
      } else if ('emails' in parsed) {
        return {
          guests: parsed.emails.map((item: any) => ({
            e: item.e,
            n: item.n,
            p: item.p,
          })),
        } as MultiGuestPayload
      }
      
      return null
    } catch {
      return null
    }
  }

  static validatePayload(payload: MultiGuestPayload | GuestPayload): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if ('guests' in payload) {
      if (!Array.isArray(payload.guests)) {
        errors.push('Guests must be an array')
      } else {
        payload.guests.forEach((guest, index) => {
          if (!guest.e) errors.push(`Guest ${index + 1}: missing email`)
          if (!guest.n) errors.push(`Guest ${index + 1}: missing name`)
        })
      }

      if (payload.expiresAt) {
        const expires = new Date(payload.expiresAt)
        if (expires < new Date()) {
          errors.push('Payload has expired')
        }
      }

      if (payload.signature) {
        const { signature, ...data } = payload
        const expectedSig = this.generateSignature(data)
        if (signature !== expectedSig) {
          errors.push('Invalid signature')
        }
      }
    } else {
      if (!payload.e) errors.push('Missing email')
      if (!payload.n) errors.push('Missing name')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}