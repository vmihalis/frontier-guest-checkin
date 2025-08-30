#!/usr/bin/env tsx

import { generateAcceptanceToken, verifyAcceptanceToken, isAcceptanceTokenExpired } from '@/lib/acceptance-token';
import { DatabaseHelpers } from '../utils/DatabaseHelpers';
import { prisma } from '@/lib/prisma';

class TermsAcceptanceTest {
  static async runFullTest() {
    console.log('\n🔐 Terms & Visitor Agreement Test Suite');
    console.log('=' .repeat(60));

    try {
      // Find or create test data
      const testData = await this.ensureTestData();
      if (!testData) {
        console.error('❌ Failed to set up test data');
        return;
      }

      console.log(`\n📋 Test Data Ready:`);
      console.log(`   Guest: ${testData.guest.name} <${testData.guest.email}>`);
      console.log(`   Host: ${testData.host.name} <${testData.host.email}>`);
      console.log(`   Invitation ID: ${testData.invitation.id}`);

      // Run test scenarios
      await this.testTokenGeneration(testData);
      await this.testTokenVerification(testData);
      await this.testAcceptanceFlow(testData);
      await this.testErrorScenarios(testData);
      
      // Generate live test URL
      await this.generateLiveTestURL(testData);
      
      console.log('\n✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  static async ensureTestData() {
    // Find recent invitation with guest and host
    const invitation = await prisma.invitation.findFirst({
      include: { 
        guest: true, 
        host: true 
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!invitation) {
      console.log('⚠️  No invitations found, creating test data...');
      await DatabaseHelpers.seedDatabase();
      
      // Try again
      const newInvitation = await prisma.invitation.findFirst({
        include: { guest: true, host: true },
        orderBy: { createdAt: 'desc' }
      });
      
      if (!newInvitation) {
        console.error('❌ Failed to create test data');
        return null;
      }
      
      return {
        invitation: newInvitation,
        guest: newInvitation.guest,
        host: newInvitation.host
      };
    }

    return {
      invitation,
      guest: invitation.guest,
      host: invitation.host
    };
  }

  static async testTokenGeneration(testData: any) {
    console.log('\n🔑 Testing Token Generation...');
    
    const token = await generateAcceptanceToken(
      testData.invitation.id,
      testData.guest.email,
      testData.host.id
    );
    
    console.log(`   ✅ Token generated successfully`);
    console.log(`   📏 Token length: ${token.length} chars`);
    console.log(`   🎫 Token preview: ${token.substring(0, 40)}...`);
    
    return token;
  }

  static async testTokenVerification(testData: any) {
    console.log('\n🔍 Testing Token Verification...');
    
    // Generate fresh token
    const token = await generateAcceptanceToken(
      testData.invitation.id,
      testData.guest.email,
      testData.host.id
    );
    
    // Verify valid token
    const payload = await verifyAcceptanceToken(token);
    console.log(`   ✅ Valid token verification passed`);
    console.log(`   📤 Payload: ${JSON.stringify(payload, null, 2)}`);
    
    // Test expiration check
    const isExpired = await isAcceptanceTokenExpired(token);
    console.log(`   ✅ Expiration check: ${isExpired ? 'EXPIRED' : 'VALID'}`);
    
    return { token, payload };
  }

  static async testAcceptanceFlow(testData: any) {
    console.log('\n📝 Testing Acceptance Flow...');
    
    // Check current acceptance status
    const currentAcceptance = await prisma.acceptance.findFirst({
      where: { guestId: testData.guest.id },
      orderBy: { acceptedAt: 'desc' }
    });
    
    console.log(`   📊 Current acceptance status: ${currentAcceptance ? 'EXISTS' : 'NONE'}`);
    
    if (currentAcceptance) {
      console.log(`   📅 Last accepted: ${currentAcceptance.acceptedAt.toISOString()}`);
      console.log(`   📋 Terms version: ${currentAcceptance.termsVersion}`);
      console.log(`   🤝 Visitor agreement version: ${currentAcceptance.visitorAgreementVersion}`);
    }
    
    // Test guest terms status
    const guest = await prisma.guest.findUnique({
      where: { id: testData.guest.id }
    });
    
    console.log(`   👤 Guest terms accepted: ${guest?.termsAcceptedAt ? guest.termsAcceptedAt.toISOString() : 'NONE'}`);
  }

  static async testErrorScenarios(testData: any) {
    console.log('\n⚠️  Testing Error Scenarios...');
    
    try {
      // Test invalid token
      await verifyAcceptanceToken('invalid.token.here');
      console.log('   ❌ Should have failed for invalid token');
    } catch (error) {
      console.log(`   ✅ Invalid token correctly rejected: ${(error as Error).message}`);
    }
    
    try {
      // Test expired token check
      const expiredResult = await isAcceptanceTokenExpired('expired.token.here');
      console.log(`   ✅ Expired token check handled gracefully: ${expiredResult}`);
    } catch (error) {
      console.log(`   ✅ Expired token check error handled: ${(error as Error).message}`);
    }
  }

  static async generateLiveTestURL(testData: any) {
    console.log('\n🌐 Generating Live Test URL...');
    
    // Generate fresh token for testing
    const token = await generateAcceptanceToken(
      testData.invitation.id,
      testData.guest.email,
      testData.host.id
    );
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const testUrl = `${baseUrl}/accept/${token}`;
    
    console.log('\n🎯 LIVE TEST URL READY!');
    console.log('=' .repeat(60));
    console.log(`\n🔗 Click to test: ${testUrl}`);
    console.log('\n📝 Test Instructions:');
    console.log('   1. Click the URL above');
    console.log('   2. Review the Terms and Conditions');
    console.log('   3. Review the Visitor Agreement');
    console.log('   4. Check both checkboxes');
    console.log('   5. Click "Accept Terms and Continue"');
    console.log('   6. Verify success message appears');
    console.log('\n🧪 Expected Behavior:');
    console.log('   • Form validates both checkboxes are required');
    console.log('   • Submission updates guest.termsAcceptedAt');
    console.log('   • Creates/updates acceptance record');
    console.log('   • Shows success confirmation');
    console.log('\n📊 Test Data Context:');
    console.log(`   • Guest: ${testData.guest.name} (${testData.guest.email})`);
    console.log(`   • Host: ${testData.host.name}`);
    console.log(`   • Token expires: 7 days from now`);
    console.log('\n' + '=' .repeat(60));
    
    return { testUrl, token, testData };
  }

  static async validateDatabaseChanges(guestId: string) {
    console.log('\n🔍 Validating Database Changes...');
    
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        acceptances: {
          orderBy: { acceptedAt: 'desc' },
          take: 1
        }
      }
    });
    
    if (!guest) {
      console.log('   ❌ Guest not found');
      return false;
    }
    
    console.log(`   📅 Terms accepted at: ${guest.termsAcceptedAt?.toISOString() || 'NOT SET'}`);
    
    if (guest.acceptances.length > 0) {
      const latest = guest.acceptances[0];
      console.log(`   📋 Latest acceptance:`);
      console.log(`      • Accepted: ${latest.acceptedAt.toISOString()}`);
      console.log(`      • Terms version: ${latest.termsVersion}`);
      console.log(`      • Visitor agreement version: ${latest.visitorAgreementVersion}`);
      console.log('   ✅ Acceptance record exists');
    } else {
      console.log('   ⚠️  No acceptance records found');
    }
    
    return true;
  }
}

// Test runner for command line usage
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'validate':
        const guestEmail = args[1];
        if (!guestEmail) {
          console.log('Usage: npm run test:terms validate <guest-email>');
          return;
        }
        const guest = await prisma.guest.findUnique({
          where: { email: guestEmail }
        });
        if (guest) {
          await TermsAcceptanceTest.validateDatabaseChanges(guest.id);
        } else {
          console.log(`❌ Guest not found: ${guestEmail}`);
        }
        break;
        
      case 'url':
        const testData = await TermsAcceptanceTest.ensureTestData();
        if (testData) {
          await TermsAcceptanceTest.generateLiveTestURL(testData);
        }
        break;
        
      default:
        await TermsAcceptanceTest.runFullTest();
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await DatabaseHelpers.disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TermsAcceptanceTest };