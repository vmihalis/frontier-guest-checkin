#!/usr/bin/env tsx

import { StagingDatabaseTests } from './StagingDatabaseTests'
import { InvitationQRFlow } from './InvitationQRFlow'

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  console.log('\n🧪 Frontier Integration Test Runner')
  console.log('=' .repeat(50))

  // Safety check
  const env = process.env.NODE_ENV
  if (env === 'production') {
    console.error('❌ REFUSING to run integration tests in production environment!')
    process.exit(1)
  }

  if (!process.env.STAGING_DATABASE_URL) {
    console.error('❌ STAGING_DATABASE_URL not configured')
    console.error('\nSet environment variable:')
    console.error('export STAGING_DATABASE_URL="postgresql://user:pass@staging-host:5432/db"')
    console.error('\nOr create .env.local file with staging database URL')
    process.exit(1)
  }

  try {
    switch (command) {
      case 'verify':
        console.log('\n🔍 Verifying staging environment...')
        await StagingDatabaseTests.verifyEnvironment()
        break

      case 'multi-checkin':
        console.log('\n🎯 Testing multi-guest check-in against staging...')
        await StagingDatabaseTests.verifyEnvironment()
        const result = await StagingDatabaseTests.testRealMultiGuestCheckin()
        process.exit(result.success ? 0 : 1)

      case 'invitation':
        console.log('\n📋 Testing guest invitation flow against staging...')
        await StagingDatabaseTests.verifyEnvironment()
        const inviteResult = await StagingDatabaseTests.testGuestInvitationFlow()
        process.exit(inviteResult.success ? 0 : 1)

      case 'qr-flow':
        console.log('\n📱 Testing QR invitation flow against staging...')
        await StagingDatabaseTests.verifyEnvironment()
        const prisma = StagingDatabaseTests.getStagingPrisma()
        const qrResult = await InvitationQRFlow.runCompleteInvitationFlow(prisma)
        process.exit(qrResult.success ? 0 : 1)

      case 'full':
      case 'all':
        console.log('\n🚀 Running full staging test suite...')
        const fullResult = await StagingDatabaseTests.runFullStagingTestSuite()
        process.exit(fullResult ? 0 : 1)

      default:
        console.log('\nAvailable commands:')
        console.log('  verify        - Check staging database connection')
        console.log('  multi-checkin - Test multi-guest check-in flow')
        console.log('  invitation    - Test guest invitation flow')
        console.log('  qr-flow       - Test QR invitation flow (CORRECT approach)')
        console.log('  full          - Run complete integration suite')
        console.log('')
        console.log('Examples:')
        console.log('  npm run test:staging verify')
        console.log('  npm run test:staging qr-flow')
        console.log('  npm run test:staging full')
        console.log('')
        console.log('⚠️  WARNING: These tests run against STAGING database!')
        console.log('⚠️  Ensure STAGING_DATABASE_URL is set correctly.')
    }
  } catch (error: any) {
    console.error('❌ Integration test failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}