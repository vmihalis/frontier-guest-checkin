import { DatabaseHelpers } from '../utils/DatabaseHelpers'
import { QRPayloadGenerator } from '../utils/QRPayloadGenerator'
import { TestDataFactory } from '../utils/TestDataFactory'

export class MultiGuestCheckinScenario {
  static async setupAndExecute(guestCount: number = 3) {
    console.log(`\n🎯 Multi-Guest Check-in Scenario (${guestCount} guests)`)
    console.log('=' .repeat(50))

    const prisma = DatabaseHelpers.getPrisma()
    const { hosts, guests } = await DatabaseHelpers.setupBasicData()

    const selectedGuests = guests.slice(0, Math.min(guestCount, guests.length))
    const host = hosts[0]

    const qrPayload = QRPayloadGenerator.createMultiGuestPayload(
      selectedGuests,
      {
        hostId: host.id,
        eventId: 'test-event-001',
        expiresIn: 3600,
        sign: true,
      }
    )

    console.log('\n📱 QR Payload Generated:')
    const parsed = JSON.parse(qrPayload)
    console.log(`- Guests: ${parsed.guests.length}`)
    console.log(`- Host ID: ${parsed.hostId}`)
    console.log(`- Event ID: ${parsed.eventId}`)
    console.log(`- Expires: ${parsed.expiresAt}`)
    console.log(`- Signed: ${!!parsed.signature}`)

    const validation = QRPayloadGenerator.validatePayload(parsed)
    console.log(`\n✅ Validation: ${validation.valid ? 'PASSED' : 'FAILED'}`)
    if (!validation.valid) {
      console.log('Errors:', validation.errors)
    }

    const results = []
    for (const guestData of parsed.guests) {
      try {
        const guest = await prisma.guest.findUnique({
          where: { email: guestData.e },
        })

        if (!guest) {
          results.push({
            email: guestData.e,
            status: 'NOT_FOUND',
            error: 'Guest not in database',
          })
          continue
        }

        if (guest.blacklistedAt) {
          results.push({
            email: guestData.e,
            status: 'BLACKLISTED',
            error: `Blacklisted on ${guest.blacklistedAt}`,
          })
          continue
        }

        if (!guest.termsAcceptedAt) {
          results.push({
            email: guestData.e,
            status: 'NO_TERMS',
            error: 'Terms not accepted',
          })
          continue
        }

        const monthlyLimit = await DatabaseHelpers.verifyGuestMonthlyLimit(guest.id)
        if (!monthlyLimit.withinLimit) {
          results.push({
            email: guestData.e,
            status: 'LIMIT_EXCEEDED',
            error: `Monthly limit (${monthlyLimit.count}/${monthlyLimit.limit})`,
          })
          continue
        }

        const hostLimit = await DatabaseHelpers.verifyHostConcurrentLimit(host.id)
        if (!hostLimit.withinLimit) {
          results.push({
            email: guestData.e,
            status: 'HOST_FULL',
            error: `Host at capacity (${hostLimit.count}/${hostLimit.limit})`,
          })
          continue
        }

        const invitation = await prisma.invitation.create({
          data: TestDataFactory.createInvitation(guest.id, host.id, {
            status: 'ACTIVATED',
          }),
        })

        const visit = await prisma.visit.create({
          data: TestDataFactory.createVisit(guest.id, host.id, {
            invitationId: invitation.id,
            checkedInAt: new Date(),
            checkedOutAt: null,
          }),
        })

        results.push({
          email: guestData.e,
          status: 'CHECKED_IN',
          visitId: visit.id,
        })
      } catch {
        results.push({
          email: guestData.e,
          status: 'ERROR',
          error: error.message,
        })
      }
    }

    console.log('\n📊 Check-in Results:')
    const successful = results.filter(r => r.status === 'CHECKED_IN')
    const failed = results.filter(r => r.status !== 'CHECKED_IN')

    console.log(`✅ Successful: ${successful.length}`)
    console.log(`❌ Failed: ${failed.length}`)

    if (failed.length > 0) {
      console.log('\nFailed Check-ins:')
      failed.forEach(f => {
        console.log(`  - ${f.email}: ${f.status} - ${f.error}`)
      })
    }

    const occupancy = await DatabaseHelpers.getCurrentOccupancy()
    console.log('\n🏢 Current Occupancy:')
    console.log(`Total: ${occupancy.total}`)
    console.log(`Long-stayers (>24h): ${occupancy.longStayers}`)

    return { qrPayload, results, occupancy }
  }

  static async testVariousScenarios() {
    console.log('\n🧪 Testing Various Multi-Guest Scenarios')
    console.log('=' .repeat(60))

    const scenarios = [
      { name: 'Small Group', count: 3 },
      { name: 'Medium Group', count: 10 },
      { name: 'Large Event', count: 50 },
    ]

    for (const scenario of scenarios) {
      await DatabaseHelpers.cleanup()
      console.log(`\n\n📌 Scenario: ${scenario.name}`)
      await this.setupAndExecute(scenario.count)
    }
  }

  static async testEdgeCases() {
    console.log('\n⚠️  Testing Edge Cases')
    console.log('=' .repeat(60))

    await DatabaseHelpers.cleanup()
    const prisma = DatabaseHelpers.getPrisma()

    await prisma.user.create({
      data: TestDataFactory.createHost(),
    })

    // Create some edge case guests for testing  
    await prisma.guest.create({
      data: TestDataFactory.createGuest(),
    })
    await prisma.guest.create({
      data: TestDataFactory.createBlacklistedGuest(),
    })
    await prisma.guest.create({
      data: TestDataFactory.createGuestWithoutTerms(),
    })
    await prisma.guest.create({
      data: TestDataFactory.createGuest(),
    })

    const scenarios = QRPayloadGenerator.createTestScenarios()

    console.log('\n1️⃣ Mixed Validity Group')
    const mixedPayload = scenarios.mixedValidity()
    console.log('Payload:', mixedPayload.substring(0, 100) + '...')

    console.log('\n2️⃣ Expired QR Code')
    const expiredPayload = scenarios.expired()
    const expiredValidation = QRPayloadGenerator.validatePayload(
      JSON.parse(expiredPayload)
    )
    console.log('Validation:', expiredValidation)

    console.log('\n3️⃣ Invalid Signature')
    const invalidPayload = scenarios.invalidSignature()
    const invalidValidation = QRPayloadGenerator.validatePayload(
      JSON.parse(invalidPayload)
    )
    console.log('Validation:', invalidValidation)

    console.log('\n4️⃣ Duplicate Guests')
    const duplicatePayload = scenarios.duplicateGuests()
    console.log('Payload:', duplicatePayload)

    console.log('\n5️⃣ Malformed Data')
    const malformedPayload = scenarios.malformed()
    const parsed = QRPayloadGenerator.parsePayload(malformedPayload)
    console.log('Parsed:', parsed)
  }
}