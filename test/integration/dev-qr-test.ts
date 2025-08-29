#!/usr/bin/env tsx

import { DatabaseHelpers } from '../utils/DatabaseHelpers'
import { InvitationQRFlow } from './InvitationQRFlow'

/**
 * Test the corrected QR invitation flow against dev database
 */
async function main() {
  console.log('\n📱 TESTING CORRECTED QR INVITATION FLOW')
  console.log('=' .repeat(60))
  console.log('🎯 Key principle: QR scans MUST originate from invitations table')
  
  try {
    const prisma = DatabaseHelpers.getPrisma()
    
    // Test the complete invitation QR flow
    const result = await InvitationQRFlow.runCompleteInvitationFlow(prisma)
    
    if (result.success) {
      console.log('\n🏆 INVITATION QR FLOW: ✅ ALL TESTS PASSED')
      console.log('\n✅ Verified:')
      console.log('   - QR codes originate from invitations table')
      console.log('   - Guest lookup via invitation token')  
      console.log('   - Business rule validation')
      console.log('   - Multi-guest invitation handling')
      console.log('   - Invalid QR rejection')
    } else {
      console.log('\n❌ TESTS FAILED:', result.error)
    }
    
    await DatabaseHelpers.disconnect()
  } catch (error: unknown) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error))
    await DatabaseHelpers.disconnect()
    process.exit(1)
  }
}

main()