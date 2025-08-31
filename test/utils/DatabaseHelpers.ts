import { PrismaClient } from '@prisma/client'
import { TestDataFactory } from './TestDataFactory'

export class DatabaseHelpers {
  private static prisma: PrismaClient

  static getPrisma(): PrismaClient {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        datasourceUrl: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        log: process.env.DEBUG ? ['query', 'error', 'warn'] : [],
      })
      // Set up TestDataFactory with the same prisma client
      TestDataFactory.setPrisma(this.prisma)
    }
    return this.prisma
  }

  static async cleanup() {
    const prisma = this.getPrisma()
    
    await prisma.$transaction([
      prisma.discount.deleteMany(),
      prisma.acceptance.deleteMany(),
      prisma.visit.deleteMany(),
      prisma.invitation.deleteMany(),
      prisma.guest.deleteMany(),
      prisma.user.deleteMany(),
      prisma.location.deleteMany(),
      prisma.policy.deleteMany(),
    ])
    
    // Reset TestDataFactory state after cleanup
    TestDataFactory.resetCounters()
  }

  static async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect()
    }
  }

  static async setupBasicData() {
    const prisma = this.getPrisma()
    
    await this.cleanup()
    
    const policy = await prisma.policy.create({
      data: TestDataFactory.createPolicy(),
    })

    const admin = await prisma.user.create({
      data: TestDataFactory.createAdmin(),
    })

    const security = await prisma.user.create({
      data: TestDataFactory.createSecurity(),
    })

    const hosts = await Promise.all(
      Array.from({ length: 5 }, () =>
        prisma.user.create({ data: TestDataFactory.createHost() })
      )
    )

    const guests = await Promise.all(
      Array.from({ length: 10 }, () =>
        prisma.guest.create({ data: TestDataFactory.createGuest() })
      )
    )

    return {
      policy,
      admin,
      security,
      hosts,
      guests,
    }
  }

  static async createGuestWithVisits(visitCount: number, options: {
    withinLastMonth?: boolean
    allCheckedOut?: boolean
  } = {}) {
    const prisma = this.getPrisma()
    
    const guest = await prisma.guest.create({
      data: TestDataFactory.createGuest(),
    })

    const host = await prisma.user.create({
      data: TestDataFactory.createHost(),
    })

    const visits = []
    for (let i = 0; i < visitCount; i++) {
      const baseDate = options.withinLastMonth
        ? new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000)
        : new Date(Date.now() - (60 - i * 5) * 24 * 60 * 60 * 1000)

      const visit = await prisma.visit.create({
        data: await TestDataFactory.createVisit(guest.id, host.id, {
          checkedInAt: baseDate,
          checkedOutAt: options.allCheckedOut
            ? new Date(baseDate.getTime() + 2 * 60 * 60 * 1000)
            : i < visitCount - 1
            ? new Date(baseDate.getTime() + 2 * 60 * 60 * 1000)
            : null,
        }),
      })
      visits.push(visit)
    }

    return { guest, host, visits }
  }

  static async createHostWithActiveGuests(guestCount: number) {
    const prisma = this.getPrisma()
    
    const host = await prisma.user.create({
      data: TestDataFactory.createHost(),
    })

    const activeVisits = []
    for (let i = 0; i < guestCount; i++) {
      const guest = await prisma.guest.create({
        data: TestDataFactory.createGuest(),
      })

      const visit = await prisma.visit.create({
        data: await TestDataFactory.createActiveVisit(guest.id, host.id),
      })
      activeVisits.push({ guest, visit })
    }

    return { host, activeVisits }
  }

  static async verifyGuestMonthlyLimit(guestId: string): Promise<{
    count: number
    limit: number
    withinLimit: boolean
  }> {
    const prisma = this.getPrisma()
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const [visitCount, policy] = await Promise.all([
      prisma.visit.count({
        where: {
          guestId,
          checkedInAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.policy.findUnique({ where: { id: 1 } }),
    ])

    const limit = policy?.guestMonthlyLimit || 3

    return {
      count: visitCount,
      limit,
      withinLimit: visitCount < limit,
    }
  }

  static async verifyHostConcurrentLimit(hostId: string): Promise<{
    count: number
    limit: number
    withinLimit: boolean
  }> {
    const prisma = this.getPrisma()
    
    const [activeCount, policy] = await Promise.all([
      prisma.visit.count({
        where: {
          hostId,
          checkedInAt: { not: null },
          checkedOutAt: null,
        },
      }),
      prisma.policy.findUnique({ where: { id: 1 } }),
    ])

    const limit = policy?.hostConcurrentLimit || 3

    return {
      count: activeCount,
      limit,
      withinLimit: activeCount < limit,
    }
  }

  static async getCurrentOccupancy(): Promise<{
    total: number
    byHost: Array<{ hostId: string; hostName: string; count: number }>
    longStayers: number
  }> {
    const prisma = this.getPrisma()
    
    const activeVisits = await prisma.visit.findMany({
      where: {
        checkedInAt: { not: null },
        checkedOutAt: null,
      },
      include: {
        host: true,
      },
    })

    const byHost = activeVisits.reduce((acc, visit) => {
      const key = visit.hostId
      if (!acc[key]) {
        acc[key] = {
          hostId: visit.hostId,
          hostName: visit.host.name,
          count: 0,
        }
      }
      acc[key].count++
      return acc
    }, {} as Record<string, { hostId: string; hostName: string; count: number }>)

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const longStayers = activeVisits.filter(
      v => v.checkedInAt && v.checkedInAt < oneDayAgo
    ).length

    return {
      total: activeVisits.length,
      byHost: Object.values(byHost),
      longStayers,
    }
  }

  static async createBlacklistScenario() {
    const prisma = this.getPrisma()
    
    const blacklistedGuests = await Promise.all(
      Array.from({ length: 3 }, () =>
        prisma.guest.create({
          data: TestDataFactory.createBlacklistedGuest(),
        })
      )
    )

    const normalGuests = await Promise.all(
      Array.from({ length: 3 }, () =>
        prisma.guest.create({
          data: TestDataFactory.createGuest(),
        })
      )
    )

    const host = await prisma.user.create({
      data: TestDataFactory.createHost(),
    })

    for (const guest of blacklistedGuests) {
      await prisma.invitation.create({
        data: await TestDataFactory.createInvitation(guest.id, host.id, {
          status: 'PENDING',
          qrToken: null,
        }),
      })
    }

    return {
      blacklistedGuests,
      normalGuests,
      host,
    }
  }

  static async getTestStatistics() {
    const prisma = this.getPrisma()
    
    const [
      totalUsers,
      totalGuests,
      totalVisits,
      activeVisits,
      blacklistedCount,
      withoutTermsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.guest.count(),
      prisma.visit.count(),
      prisma.visit.count({
        where: {
          checkedInAt: { not: null },
          checkedOutAt: null,
        },
      }),
      prisma.guest.count({
        where: { blacklistedAt: { not: null } },
      }),
      prisma.guest.count({
        where: { termsAcceptedAt: null },
      }),
    ])

    return {
      totalUsers,
      totalGuests,
      totalVisits,
      activeVisits,
      blacklistedCount,
      withoutTermsCount,
    }
  }
}