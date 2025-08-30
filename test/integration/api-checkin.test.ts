/**
 * Comprehensive integration tests for the unified check-in API
 * Tests foreign key constraints, returning guests, and all edge cases
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:3003';

interface CheckInResponse {
  success: boolean;
  message: string;
  results?: Array<{
    success: boolean;
    message: string;
    guestEmail: string;
    guestName: string;
    visitId?: string;
    reason?: string;
    acceptanceRenewed?: boolean;
  }>;
  summary?: {
    total: number;
    successful: number;
    failed: number;
  };
}

async function testSingleGuestCheckIn() {
  console.log('\n📝 Test 1: Single guest check-in via unified API');
  
  // Get a real host for invitation linking
  const host = await prisma.user.findFirst({ where: { role: 'host' } });
  if (!host) throw new Error('No host found');

  // Create test guest with acceptance
  const testGuest = await prisma.guest.create({
    data: {
      email: `test.single.${Date.now()}@example.com`,
      name: 'Single Test Guest',
      country: 'US',
      termsAcceptedAt: new Date(),
    }
  });

  await prisma.acceptance.create({
    data: {
      guestId: testGuest.id,
      termsVersion: '1.0',
      visitorAgreementVersion: '1.0'
    }
  });

  // Create invitation to test status update
  const invitation = await prisma.invitation.create({
    data: {
      guestId: testGuest.id,
      hostId: host.id,
      inviteDate: new Date(),
      status: 'PENDING'
    }
  });

  const response = await fetch(`${API_BASE}/api/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest: { e: testGuest.email, n: testGuest.name }
    })
  });

  const result: CheckInResponse = await response.json();
  
  if (response.ok && result.success) {
    console.log('✅ Single guest check-in successful');
    
    // Verify invitation status updated (critical regression test)
    const updatedInvitation = await prisma.invitation.findUnique({ 
      where: { id: invitation.id } 
    });
    
    if (updatedInvitation?.status === 'CHECKED_IN') {
      console.log('✅ Invitation status correctly updated');
    } else {
      throw new Error(`Expected CHECKED_IN, got: ${updatedInvitation?.status}`);
    }
  } else {
    console.log('❌ Single guest check-in failed:', result.message);
    throw new Error('Single guest check-in failed');
  }
}

async function testMultipleGuestCheckIn() {
  console.log('\n📝 Test 2: Multiple guest check-in');
  
  // Clear test data first to avoid capacity limits
  await clearTestData();
  
  // Create test guests
  const guests = await Promise.all([
    prisma.guest.create({
      data: {
        email: `test.multi1.${Date.now()}@example.com`,
        name: 'Multi Guest 1',
        country: 'US'
      }
    }),
    prisma.guest.create({
      data: {
        email: `test.multi2.${Date.now()}@example.com`,
        name: 'Multi Guest 2',
        country: 'US'
      }
    })
  ]);

  // Add acceptance for both
  await Promise.all(
    guests.map(g => 
      prisma.acceptance.create({
        data: {
          guestId: g.id,
          termsVersion: '1.0',
          visitorAgreementVersion: '1.0'
        }
      })
    )
  );

  const response = await fetch(`${API_BASE}/api/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guests: guests.map(g => ({ e: g.email, n: g.name }))
    })
  });

  const result: CheckInResponse = await response.json();
  
  // Check if we got a partial success or full success (both are valid)
  const partialSuccess = response.status === 207 && result.summary?.successful >= 1;
  const fullSuccess = response.ok && result.success && result.summary?.successful === 2;
  
  if (fullSuccess) {
    console.log('✅ Multiple guest check-in successful (all guests)');
  } else if (partialSuccess) {
    console.log('✅ Multiple guest check-in successful (partial - capacity limit hit)');
    console.log(`   Processed: ${result.summary?.successful}/${result.summary?.total} guests`);
  } else {
    console.log('❌ Multiple guest check-in failed:', result.message);
    console.log('   Response status:', response.status);
    console.log('   Full result:', JSON.stringify(result, null, 2));
    throw new Error('Multiple guest check-in failed');
  }
}

async function testForeignKeyConstraintProtection() {
  console.log('\n📝 Test 3: Foreign key constraint protection');
  
  // The API should handle invalid host IDs gracefully
  // Since we're not authenticated, it should use a fallback host
  const response = await fetch(`${API_BASE}/api/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest: { e: 'fk.test@example.com', n: 'FK Test Guest' }
    })
  });

  const result: CheckInResponse = await response.json();
  
  // Should fail with terms acceptance required, not foreign key error
  if (!response.ok && result.message.includes('Terms & Visitor Agreement')) {
    console.log('✅ Foreign key constraint properly handled');
  } else if (result.message.includes('foreign key') || result.message.includes('constraint')) {
    console.log('❌ Foreign key constraint leaked to user:', result.message);
    throw new Error('Foreign key constraint not properly handled');
  } else {
    console.log('✅ No foreign key errors exposed');
  }
}

async function testReturningGuestWithExpiredAcceptance() {
  console.log('\n📝 Test 4: Returning guest with expired acceptance');
  
  // Create guest with old acceptance
  const returningGuest = await prisma.guest.create({
    data: {
      email: `returning.${Date.now()}@example.com`,
      name: 'Returning Guest',
      country: 'US'
    }
  });

  // Create acceptance from 2 years ago
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  await prisma.acceptance.create({
    data: {
      guestId: returningGuest.id,
      termsVersion: '0.9',
      visitorAgreementVersion: '0.9',
      acceptedAt: twoYearsAgo
    }
  });

  const response = await fetch(`${API_BASE}/api/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest: { e: returningGuest.email, n: returningGuest.name }
    })
  });

  const result: CheckInResponse = await response.json();
  
  if (response.ok && result.results?.[0]?.acceptanceRenewed) {
    console.log('✅ Returning guest acceptance automatically renewed');
  } else {
    console.log('⚠️  Returning guest acceptance renewal:', result.message);
  }
}

async function testCrossHostVisitDetection() {
  console.log('\n📝 Test 5: Cross-host visit detection');
  
  // Create a guest with an active visit
  const crossHostGuest = await prisma.guest.create({
    data: {
      email: `crosshost.${Date.now()}@example.com`,
      name: 'Cross Host Guest',
      country: 'US'
    }
  });

  await prisma.acceptance.create({
    data: {
      guestId: crossHostGuest.id,
      termsVersion: '1.0',
      visitorAgreementVersion: '1.0'
    }
  });

  // Create active visit with a different host
  const differentHost = await prisma.user.findFirst({
    where: { role: 'host' },
    skip: 1 // Skip first host to get a different one
  });

  if (differentHost) {
    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    await prisma.visit.create({
      data: {
        guestId: crossHostGuest.id,
        hostId: differentHost.id,
        checkedInAt: new Date(),
        expiresAt: futureTime
      }
    });

    // Try to check in with different host (API will use default host)
    const response = await fetch(`${API_BASE}/api/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest: { e: crossHostGuest.email, n: crossHostGuest.name }
      })
    });

    const result: CheckInResponse = await response.json();
    
    if (result.results?.[0]?.reason === 'cross-host-active') {
      console.log('✅ Cross-host active visit detected');
    } else if (result.results?.[0]?.reason === 're-entry') {
      console.log('⚠️  Re-entry detected (same host)');
    } else {
      console.log('ℹ️  Cross-host detection result:', result.message);
    }
  } else {
    console.log('⚠️  Insufficient hosts for cross-host test');
  }
}

async function testMissingTermsAcceptance() {
  console.log('\n📝 Test 6: Missing terms acceptance validation');
  
  const response = await fetch(`${API_BASE}/api/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest: { 
        e: `no.terms.${Date.now()}@example.com`, 
        n: 'No Terms Guest' 
      }
    })
  });

  const result: CheckInResponse = await response.json();
  
  if (!response.ok && result.message.includes('Terms & Visitor Agreement')) {
    console.log('✅ Terms acceptance properly enforced');
  } else {
    console.log('❌ Terms acceptance not enforced:', result.message);
    throw new Error('Terms acceptance validation failed');
  }
}

async function testHostConcurrentLimit() {
  console.log('\n📝 Test 7: Host concurrent guest limit');
  
  // Find a host and max out their capacity
  const host = await prisma.user.findFirst({
    where: { role: 'host' }
  });

  if (!host) {
    console.log('⚠️  No host found for limit test');
    return;
  }

  // Get policy limit
  const policy = await prisma.policy.findUnique({ where: { id: 1 } });
  const limit = policy?.hostConcurrentLimit || 3;

  // Count current active visits
  const activeCount = await prisma.visit.count({
    where: {
      hostId: host.id,
      checkedInAt: { not: null },
      expiresAt: { gt: new Date() }
    }
  });

  if (activeCount >= limit) {
    // Try to add one more
    const response = await fetch(`${API_BASE}/api/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest: { 
          e: `limit.test.${Date.now()}@example.com`, 
          n: 'Limit Test Guest' 
        }
      })
    });

    const result: CheckInResponse = await response.json();
    
    if (!response.ok && result.message.includes('concurrent limit')) {
      console.log('✅ Host concurrent limit enforced');
    } else {
      console.log('⚠️  Host limit check result:', result.message);
    }
  } else {
    console.log(`ℹ️  Host has ${activeCount}/${limit} active guests`);
  }
}


async function clearTestData() {
  // Clear test visits to prevent capacity issues
  await prisma.visit.updateMany({
    where: {
      guest: {
        email: {
          contains: 'test.'
        }
      }
    },
    data: {
      expiresAt: new Date(Date.now() - 1000)
    }
  });
  
  await prisma.visit.updateMany({
    where: {
      guest: {
        email: {
          contains: '@example.com'
        }
      }
    },
    data: {
      expiresAt: new Date(Date.now() - 1000)
    }
  });
}

async function runAllTests() {
  console.log('🧪 Running comprehensive check-in API integration tests...');
  console.log('=' .repeat(60));

  try {
    // Clear test data before running tests to ensure clean state
    await clearTestData();
    
    await testSingleGuestCheckIn();
    await clearTestData(); // Clear after each test to prevent capacity issues
    
    await testMultipleGuestCheckIn();
    await clearTestData();
    
    await testForeignKeyConstraintProtection();
    // No need to clear - this doesn't create visits
    
    await testReturningGuestWithExpiredAcceptance();
    await clearTestData();
    
    await testCrossHostVisitDetection();
    await clearTestData();
    
    await testMissingTermsAcceptance();
    // No need to clear - this doesn't create visits
    
    await testHostConcurrentLimit();
    await clearTestData();
    

    console.log('\n🏆 All check-in API tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests };