import { faker } from '@faker-js/faker'
import { UserRole, ContactMethod, InvitationStatus } from '@prisma/client'

export class TestDataFactory {
  private static idCounter = 0

  static resetCounters() {
    this.idCounter = 0
    faker.seed(12345)
  }

  static generateId(): string {
    return `test-${++this.idCounter}-${Date.now()}`
  }

  static createGuest(overrides: Partial<Record<string, unknown>> = {}) {
    const base = {
      id: this.generateId(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phone: faker.phone.number('+1##########'),
      country: 'US',
      contactMethod: faker.helpers.arrayElement([ContactMethod.PHONE, ContactMethod.TELEGRAM, null]),
      contactValue: null,
      termsAcceptedAt: faker.date.recent({ days: 30 }),
      blacklistedAt: null,
      createdAt: new Date(),
    }

    if (base.contactMethod === ContactMethod.TELEGRAM) {
      base.contactValue = `@${faker.internet.username()}`
    } else if (base.contactMethod === ContactMethod.PHONE) {
      base.contactValue = base.phone
    }

    return { ...base, ...overrides }
  }

  static createHost(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: this.generateId(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: UserRole.host,
      createdAt: new Date(),
      ...overrides,
    }
  }

  static createAdmin(overrides: Partial<Record<string, unknown>> = {}) {
    return this.createHost({ 
      role: UserRole.admin,
      email: faker.internet.email({ provider: 'frontier.admin' }),
      ...overrides 
    })
  }

  static createSecurity(overrides: Partial<Record<string, unknown>> = {}) {
    return this.createHost({
      role: UserRole.security,
      email: faker.internet.email({ provider: 'frontier.security' }),
      ...overrides
    })
  }

  static createInvitation(guestId: string, hostId: string, overrides: Partial<Record<string, unknown>> = {}) {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    return {
      id: this.generateId(),
      guestId,
      hostId,
      status: InvitationStatus.PENDING,
      inviteDate: now,
      qrToken: faker.string.alphanumeric(32),
      qrIssuedAt: now,
      qrExpiresAt: tomorrow,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  }

  static createVisit(guestId: string, hostId: string, overrides: Partial<Record<string, unknown>> = {}) {
    const now = new Date()
    const checkedIn = overrides.checkedInAt || now
    const stayHours = faker.number.float({ min: 0.5, max: 8 })
    
    return {
      id: this.generateId(),
      guestId,
      hostId,
      invitationId: null,
      invitedAt: now,
      checkedInAt: checkedIn,
      checkedOutAt: overrides.checkedOutAt !== undefined 
        ? overrides.checkedOutAt 
        : new Date(checkedIn.getTime() + stayHours * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      overrideReason: null,
      overrideBy: null,
      createdAt: now,
      ...overrides,
    }
  }

  static createPolicy(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 1,
      guestMonthlyLimit: 3,
      hostConcurrentLimit: 3,
      updatedAt: new Date(),
      ...overrides,
    }
  }

  static createBlacklistedGuest(overrides: Partial<Record<string, unknown>> = {}) {
    return this.createGuest({
      blacklistedAt: faker.date.recent({ days: 90 }),
      email: faker.internet.email({ provider: 'blacklisted' }),
      ...overrides,
    })
  }

  static createGuestWithoutTerms(overrides: Partial<Record<string, unknown>> = {}) {
    return this.createGuest({
      termsAcceptedAt: null,
      ...overrides,
    })
  }

  static createActiveVisit(guestId: string, hostId: string, overrides: Partial<Record<string, unknown>> = {}) {
    return this.createVisit(guestId, hostId, {
      checkedInAt: faker.date.recent({ days: 1 }),
      checkedOutAt: null,
      ...overrides,
    })
  }

  static createExpiredInvitation(guestId: string, hostId: string, overrides: Partial<Record<string, unknown>> = {}) {
    const pastDate = faker.date.past()
    
    return this.createInvitation(guestId, hostId, {
      status: InvitationStatus.EXPIRED,
      inviteDate: pastDate,
      qrIssuedAt: pastDate,
      qrExpiresAt: new Date(pastDate.getTime() + 24 * 60 * 60 * 1000),
      ...overrides,
    })
  }

  static createGuestBatch(count: number, overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown>[] {
    return Array.from({ length: count }, () => this.createGuest(overrides))
  }

  static createHostBatch(count: number, overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown>[] {
    return Array.from({ length: count }, () => this.createHost(overrides))
  }

  static createScenario(type: 'atLimit' | 'overLimit' | 'underLimit', guest: Record<string, unknown>, host: Record<string, unknown>) {
    const visits = []
    const limits = {
      atLimit: 3,
      overLimit: 5,
      underLimit: 1,
    }

    const count = limits[type]
    for (let i = 0; i < count; i++) {
      visits.push(this.createVisit(guest.id, host.id, {
        checkedInAt: faker.date.recent({ days: 20 }),
        checkedOutAt: faker.date.recent({ days: 19 }),
      }))
    }

    return visits
  }
}