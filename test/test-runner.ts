#!/usr/bin/env tsx

import { DatabaseHelpers } from './utils/DatabaseHelpers'
import { QRPayloadGenerator } from './utils/QRPayloadGenerator'
import { MultiGuestCheckinScenario } from './scenarios/MultiGuestCheckin'
import fs from 'fs'
import path from 'path'

interface TestOptions {
  scenario?: string
  cleanup?: boolean
  verbose?: boolean
}

class TestRunner {
  static async runTestFromFixture(fixtureName: string) {
    console.log(`\n🎯 Running Test: ${fixtureName}`)
    console.log('=' .repeat(50))

    const fixturePath = path.join(__dirname, 'fixtures', 'multi-checkin-real.json')
    const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))
    
    const scenario = fixtures.scenarios[fixtureName]
    if (!scenario) {
      console.error(`❌ Scenario '${fixtureName}' not found`)
      return
    }

    let guests = scenario.guests

    if (scenario.generate) {
      guests = Array.from({ length: scenario.count }, (_, i) => ({
        e: scenario.template.e.replace('{index}', (i + 1).toString()),
        n: scenario.template.n.replace('{index}', (i + 1).toString()),
      }))
    }

    const qrPayload = JSON.stringify({ emails: guests })
    console.log(`\n📱 QR Payload for ${guests.length} guests:`)
    console.log(qrPayload.substring(0, 200) + '...')

    const prisma = DatabaseHelpers.getPrisma()

    console.log('\n🔍 Database Validation:')
    const results = []
    
    for (const guest of guests) {
      const dbGuest = await prisma.guest.findUnique({
        where: { email: guest.e },
        include: {
          visits: {
            where: {
              checkedInAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            },
            orderBy: { checkedInAt: 'desc' }
          }
        }
      })

      if (!dbGuest) {
        console.log(`⚠️  Guest not found: ${guest.e} - would need to be created`)
        results.push({
          email: guest.e,
          status: 'NOT_FOUND',
          action: 'CREATE_REQUIRED'
        })
        continue
      }

      let status = 'VALID'
      let issues = []

      if (dbGuest.blacklistedAt) {
        status = 'BLACKLISTED'
        issues.push(`Blacklisted on ${dbGuest.blacklistedAt.toISOString().split('T')[0]}`)
      }

      if (!dbGuest.termsAcceptedAt) {
        status = 'NO_TERMS'
        issues.push('Terms not accepted')
      }

      const recentVisits = dbGuest.visits.length
      if (recentVisits >= 3) {
        status = 'LIMIT_EXCEEDED'
        issues.push(`${recentVisits} visits in last 30 days (limit: 3)`)
      }

      results.push({
        email: guest.e,
        name: guest.n,
        status,
        issues,
        recentVisits,
        termsAccepted: !!dbGuest.termsAcceptedAt,
        blacklisted: !!dbGuest.blacklistedAt
      })
    }

    const valid = results.filter(r => r.status === 'VALID')
    const invalid = results.filter(r => r.status !== 'VALID')

    console.log(`\n📊 Validation Results:`)
    console.log(`✅ Valid guests: ${valid.length}`)
    console.log(`❌ Invalid guests: ${invalid.length}`)

    if (invalid.length > 0) {
      console.log('\nInvalid guests:')
      invalid.forEach(guest => {
        console.log(`  • ${guest.email}: ${guest.status}`)
        if (guest.issues && guest.issues.length > 0) {
          guest.issues.forEach((issue: string) => console.log(`    - ${issue}`))
        }
      })
    }

    const stats = await DatabaseHelpers.getTestStatistics()
    console.log('\n🏢 Current Database State:')
    console.log(`Total guests: ${stats.totalGuests}`)
    console.log(`Active visits: ${stats.activeVisits}`)
    console.log(`Blacklisted: ${stats.blacklistedCount}`)
    console.log(`Without terms: ${stats.withoutTermsCount}`)

    return { results, stats, qrPayload }
  }

  static async generateMockFile() {
    console.log('\n🎲 Generating New Mock Data File')
    console.log('=' .repeat(50))

    const prisma = DatabaseHelpers.getPrisma()
    const allGuests = await prisma.guest.findMany({
      take: 10,
      where: {
        blacklistedAt: null,
        termsAcceptedAt: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (allGuests.length < 3) {
      console.error('❌ Need at least 3 valid guests in database')
      console.log('Run: npm run db:seed to create test data')
      return
    }

    const mockData = {
      emails: allGuests.slice(0, 3).map(g => ({
        e: g.email,
        n: g.name
      }))
    }

    const filename = `multi-checkin-${Date.now()}.json`
    const filepath = path.join(process.cwd(), filename)
    
    fs.writeFileSync(filepath, JSON.stringify(mockData, null, 2))
    
    console.log(`✅ Generated: ${filename}`)
    console.log(JSON.stringify(mockData, null, 2))

    return filepath
  }

  static async showAvailableScenarios() {
    const fixturePath = path.join(__dirname, 'fixtures', 'multi-checkin-real.json')
    const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))
    
    console.log('\n📋 Available Test Scenarios:')
    console.log('=' .repeat(40))
    
    Object.entries(fixtures.scenarios).forEach(([name, config]: [string, any]) => {
      const guestCount = config.generate ? config.count : config.guests.length
      console.log(`• ${name}: ${guestCount} guests`)
    })
    
    console.log('\nUsage:')
    console.log('  npm run test:multi valid_three_guests')
    console.log('  npm run test:multi large_group')
    console.log('  npm run test:multi stress_test_50')
  }
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  try {
    switch (command) {
      case 'scenarios':
        await TestRunner.showAvailableScenarios()
        break
      
      case 'generate':
        await TestRunner.generateMockFile()
        break
        
      case 'all':
        await TestRunner.showAvailableScenarios()
        console.log('\n')
        await TestRunner.runTestFromFixture('valid_three_guests')
        await TestRunner.runTestFromFixture('large_group')
        break
        
      default:
        if (command) {
          await TestRunner.runTestFromFixture(command)
        } else {
          console.log('\n🧪 Frontier Guest Check-in Test Runner')
          console.log('=' .repeat(50))
          console.log('\nCommands:')
          console.log('  scenarios  - List available test scenarios')
          console.log('  generate   - Create new mock data from database')
          console.log('  all        - Run multiple scenarios')
          console.log('  [name]     - Run specific scenario')
          console.log('\nExamples:')
          console.log('  npm run test:multi scenarios')
          console.log('  npm run test:multi valid_three_guests')
          console.log('  npm run test:multi generate')
        }
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await DatabaseHelpers.disconnect()
  }
}

if (require.main === module) {
  main()
}

export { TestRunner }