import { PrismaClient } from '@prisma/client'
import { DatabaseHelpers } from '../utils/DatabaseHelpers'
import { QRPayloadGenerator } from '../utils/QRPayloadGenerator'
import { TestDataFactory } from '../utils/TestDataFactory'

/**
 * Integration tests that run against STAGING database
 * 
 * CRITICAL: These tests run against real staging data
 * - DO NOT run against production
 * - Uses STAGING_DATABASE_URL environment variable
 * - Tests real multi-guest check-in flows
 */
export class StagingDatabaseTests {
  private static stagingPrisma: PrismaClient

  static getStagingPrisma(): PrismaClient {
    if (!this.stagingPrisma) {
      const stagingUrl = process.env.STAGING_DATABASE_URL
      
      if (!stagingUrl) {
        throw new Error('STAGING_DATABASE_URL not configured. Set environment variable.')
      }

      if (stagingUrl.includes('prod') || stagingUrl.includes('production')) {
        throw new Error('REFUSING to run tests against production database!')
      }

      this.stagingPrisma = new PrismaClient({
        datasourceUrl: stagingUrl,
        log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
      })
    }
    return this.stagingPrisma
  }

  static async verifyEnvironment() {
    console.log('\n🔍 Verifying Staging Environment')
    console.log('=' .repeat(50))

    const stagingUrl = process.env.STAGING_DATABASE_URL
    if (!stagingUrl) {
      throw new Error('❌ STAGING_DATABASE_URL not set')
    }

    if (stagingUrl.includes('prod')) {
      throw new Error('❌ REFUSING to test against production!')
    }

    console.log('✅ Staging database URL configured')
    console.log(`   URL: ${stagingUrl.replace(/:[^:@]*@/, ':***@')}`)

    const prisma = this.getStagingPrisma()
    
    try {
      await prisma.$connect()
      console.log('✅ Successfully connected to staging database')
      
      const stats = await prisma.$transaction([
        prisma.user.count(),
        prisma.guest.count(),
        prisma.visit.count(),
      ])
      
      console.log(`✅ Staging data: ${stats[0]} users, ${stats[1]} guests, ${stats[2]} visits`)
    } catch (error: any) {
      throw new Error(`❌ Failed to connect to staging: ${error.message}`)
    }
  }

  static async testRealMultiGuestCheckin() {
    console.log('\n🎯 STAGING: Multi-Guest Check-in Test')
    console.log('=' .repeat(50))

    const prisma = this.getStagingPrisma()

    // Find real staging guests with terms accepted
    const validGuests = await prisma.guest.findMany({
      where: {
        blacklistedAt: null,
        termsAcceptedAt: { not: null },
      },
      take: 3,
      orderBy: { createdAt: 'desc' }
    })

    if (validGuests.length < 3) {
      console.log('⚠️  Insufficient valid guests in staging. Creating test guests...')
      
      // Create test guests in staging
      for (let i = 0; i < 3; i++) {
        await prisma.guest.create({
          data: TestDataFactory.createGuest({
            email: `staging.test.guest.${Date.now()}.${i}@frontier.test`,
          })
        })
      }

      // Re-fetch
      const newGuests = await prisma.guest.findMany({
        where: {
          blacklistedAt: null,
          termsAcceptedAt: { not: null },
        },
        take: 3,
        orderBy: { createdAt: 'desc' }
      })
      
      validGuests.push(...newGuests)
    }

    // Find a real host
    let host = await prisma.user.findFirst({
      where: { role: 'host' },
      orderBy: { createdAt: 'desc' }
    })

    if (!host) {
      console.log('⚠️  No hosts in staging. Creating test host...')
      host = await prisma.user.create({
        data: TestDataFactory.createHost({
          email: `staging.test.host.${Date.now()}@frontier.test`,
        })
      })
    }

    // Generate QR payload for these real staging guests
    const qrPayload = QRPayloadGenerator.createMultiGuestPayload(
      validGuests.slice(0, 3),
      {
        hostId: host.id,
        eventId: `staging-integration-test-${Date.now()}`,
        expiresIn: 3600,
        sign: true,
      }
    )

    console.log(`\n📱 Testing QR payload with ${validGuests.length} staging guests`)
    console.log(`Host: ${host.name} (${host.email})`)

    // Validate QR payload
    const parsed = JSON.parse(qrPayload)
    const validation = QRPayloadGenerator.validatePayload(parsed)
    
    console.log(`✅ QR Validation: ${validation.valid ? 'PASSED' : 'FAILED'}`)
    if (!validation.valid) {
      console.log('Errors:', validation.errors)
      return false
    }

    // Test the check-in process
    const results = []
    for (const guestData of parsed.guests) {
      const guest = validGuests.find(g => g.email === guestData.e)
      if (!guest) continue

      try {
        // Check business rules
        const monthlyLimit = await this.verifyGuestMonthlyLimit(guest.id)
        const hostLimit = await this.verifyHostConcurrentLimit(host.id)

        if (!monthlyLimit.withinLimit) {
          results.push({
            email: guest.email,
            status: 'LIMIT_EXCEEDED',
            error: `Monthly limit: ${monthlyLimit.count}/${monthlyLimit.limit}`
          })
          continue
        }

        if (!hostLimit.withinLimit) {
          results.push({
            email: guest.email,
            status: 'HOST_FULL', 
            error: `Host capacity: ${hostLimit.count}/${hostLimit.limit}`
          })
          continue
        }

        // Create invitation in staging
        const invitation = await prisma.invitation.create({
          data: TestDataFactory.createInvitation(guest.id, host.id, {
            status: 'ACTIVATED',
            qrToken: parsed.signature?.substring(0, 32),
          })
        })

        // Create visit in staging
        const visit = await prisma.visit.create({
          data: TestDataFactory.createVisit(guest.id, host.id, {
            invitationId: invitation.id,
            checkedInAt: new Date(),
            checkedOutAt: null,
          })
        })

        results.push({
          email: guest.email,
          status: 'CHECKED_IN',
          visitId: visit.id,
          invitationId: invitation.id,
        })

        console.log(`✅ ${guest.name} checked in successfully`)
      } catch (error: any) {
        results.push({
          email: guest.email,
          status: 'ERROR',
          error: error.message,
        })
        console.log(`❌ ${guest.name} failed: ${error.message}`)
      }
    }

    // Summary
    const successful = results.filter(r => r.status === 'CHECKED_IN')
    const failed = results.filter(r => r.status !== 'CHECKED_IN')

    console.log(`\n📊 STAGING Test Results:`)
    console.log(`✅ Successful check-ins: ${successful.length}`)
    console.log(`❌ Failed check-ins: ${failed.length}`)

    return {
      success: successful.length > 0,
      results,
      qrPayload,
    }
  }

  private static async verifyGuestMonthlyLimit(guestId: string) {
    const prisma = this.getStagingPrisma()
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
    return { count: visitCount, limit, withinLimit: visitCount < limit }
  }

  private static async verifyHostConcurrentLimit(hostId: string) {
    const prisma = this.getStagingPrisma()
    
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
    return { count: activeCount, limit, withinLimit: activeCount < limit }
  }

  static async testGuestInvitationFlow() {
    console.log('\n📋 STAGING: Guest Invitation Flow Test')
    console.log('=' .repeat(50))

    const prisma = this.getStagingPrisma()

    // Find or create a host
    let host = await prisma.user.findFirst({ where: { role: 'host' } })
    if (!host) {
      host = await prisma.user.create({
        data: TestDataFactory.createHost({
          email: `staging.invite.host.${Date.now()}@frontier.test`,
        })
      })
    }

    // Create a new guest for invitation testing
    const newGuest = await prisma.guest.create({
      data: TestDataFactory.createGuest({
        email: `staging.invite.guest.${Date.now()}@frontier.test`,
        termsAcceptedAt: null, // Will need to accept terms
      })
    })

    console.log(`👤 Created guest: ${newGuest.name} (${newGuest.email})`)
    console.log(`🏢 Host: ${host.name} (${host.email})`)

    // Test invitation creation
    const invitation = await prisma.invitation.create({
      data: TestDataFactory.createInvitation(newGuest.id, host.id, {
        status: 'PENDING',
        inviteDate: new Date(),
      })
    })

    console.log(`✅ Invitation created: ${invitation.id}`)

    // Test terms acceptance requirement
    try {
      const visit = await prisma.visit.create({
        data: TestDataFactory.createVisit(newGuest.id, host.id, {
          invitationId: invitation.id,
          checkedInAt: new Date(),
        })
      })
      console.log(`❌ ERROR: Visit created without terms acceptance!`)
      return false
    } catch (error) {
      console.log(`✅ Correctly blocked visit without terms acceptance`)
    }

    // Accept terms
    await prisma.guest.update({
      where: { id: newGuest.id },
      data: { termsAcceptedAt: new Date() }
    })

    await prisma.acceptance.create({
      data: {
        guestId: newGuest.id,
        termsVersion: '1.0.0',
        visitorAgreementVersion: '1.0.0',
      }
    })

    console.log(`✅ Terms accepted for guest`)

    // Now create visit
    const visit = await prisma.visit.create({
      data: TestDataFactory.createVisit(newGuest.id, host.id, {
        invitationId: invitation.id,
        checkedInAt: new Date(),
        checkedOutAt: null,
      })
    })

    console.log(`✅ Visit created successfully: ${visit.id}`)

    return {
      success: true,
      guest: newGuest,
      host,
      invitation,
      visit,
    }
  }

  static async cleanup() {
    if (this.stagingPrisma) {
      await this.stagingPrisma.$disconnect()
    }
  }

  static async runFullStagingTestSuite() {
    console.log('\n🚀 RUNNING FULL STAGING INTEGRATION TESTS')
    console.log('=' .repeat(60))

    try {
      // Verify environment
      await this.verifyEnvironment()
      
      // Test multi-guest check-in
      const multiGuestResult = await this.testRealMultiGuestCheckin()
      
      // Test invitation flow
      const invitationResult = await this.testGuestInvitationFlow()
      
      console.log('\n🎯 STAGING TEST SUITE COMPLETE')
      console.log('=' .repeat(60))
      console.log(`Multi-guest test: ${multiGuestResult.success ? '✅ PASSED' : '❌ FAILED'}`)
      console.log(`Invitation test: ${invitationResult.success ? '✅ PASSED' : '❌ FAILED'}`)
      
      const overallSuccess = multiGuestResult.success && invitationResult.success
      console.log(`\n🏆 OVERALL RESULT: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
      
      return overallSuccess
    } catch (error: any) {
      console.error('❌ STAGING TESTS FAILED:', error.message)
      return false
    } finally {
      await this.cleanup()
    }
  }
}