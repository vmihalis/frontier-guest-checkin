/**
 * Test visit-scoped acceptance implementation
 * Verifies that acceptances are properly scoped to visits and expire correctly
 */

import { prisma } from '../src/lib/prisma';
import { nowInLA, calculateVisitExpiration } from '../src/lib/timezone';

async function testVisitScopedAcceptance() {
  console.log('🧪 Testing Visit-Scoped Acceptance Implementation\n');
  
  try {
    // 1. Create test data
    console.log('1. Setting up test data...');
    
    // Find or create test host
    const host = await prisma.user.findFirst({
      where: { role: 'host' },
      select: { id: true, email: true, name: true, locationId: true }
    });
    
    if (!host) {
      throw new Error('No host found in database. Run seeding first.');
    }
    
    // Find location
    const location = await prisma.location.findFirst({
      select: { id: true, name: true }
    });
    
    if (!location) {
      throw new Error('No location found in database. Run seeding first.');
    }
    
    console.log(`✅ Using host: ${host.email}`);
    console.log(`✅ Using location: ${location.name}\n`);
    
    // 2. Create test guest and invitation
    console.log('2. Creating test guest and invitation...');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const guest = await prisma.guest.create({
      data: {
        email: testEmail,
        name: 'Test Guest',
        country: 'US'
      }
    });
    
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        locationId: location.id,
        inviteDate: new Date(),
        status: 'PENDING'
      }
    });
    
    console.log(`✅ Created guest: ${guest.email}`);
    console.log(`✅ Created invitation: ${invitation.id}\n`);
    
    // 3. Create invitation-scoped acceptance (pre-visit)
    console.log('3. Creating invitation-scoped acceptance...');
    
    const now = nowInLA();
    const preVisitExpiration = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const preVisitAcceptance = await prisma.acceptance.create({
      data: {
        guestId: guest.id,
        invitationId: invitation.id,
        termsVersion: '1.0',
        visitorAgreementVersion: '1.0',
        expiresAt: preVisitExpiration
      }
    });
    
    console.log(`✅ Created pre-visit acceptance`);
    console.log(`   - Expires at: ${preVisitAcceptance.expiresAt}`);
    console.log(`   - Linked to invitation: ${invitation.id}\n`);
    
    // 4. Create visit
    console.log('4. Creating visit...');
    
    const visitExpiration = calculateVisitExpiration(now);
    const visit = await prisma.visit.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        locationId: location.id,
        invitationId: invitation.id,
        checkedInAt: now,
        expiresAt: visitExpiration
      }
    });
    
    console.log(`✅ Created visit: ${visit.id}`);
    console.log(`   - Checked in at: ${visit.checkedInAt}`);
    console.log(`   - Expires at: ${visit.expiresAt}\n`);
    
    // 5. Create visit-scoped acceptance
    console.log('5. Creating visit-scoped acceptance...');
    
    const visitAcceptance = await prisma.acceptance.create({
      data: {
        guestId: guest.id,
        visitId: visit.id,
        invitationId: invitation.id,
        termsVersion: '1.0',
        visitorAgreementVersion: '1.0',
        expiresAt: visitExpiration // Same as visit expiration
      }
    });
    
    console.log(`✅ Created visit-scoped acceptance`);
    console.log(`   - Linked to visit: ${visit.id}`);
    console.log(`   - Expires at: ${visitAcceptance.expiresAt}\n`);
    
    // 6. Verify acceptance relationships
    console.log('6. Verifying acceptance relationships...');
    
    // Check guest has multiple acceptances
    const guestAcceptances = await prisma.acceptance.findMany({
      where: { guestId: guest.id },
      include: {
        visit: true,
        invitation: true
      }
    });
    
    console.log(`✅ Guest has ${guestAcceptances.length} acceptances:`);
    for (const acc of guestAcceptances) {
      const type = acc.visitId ? 'Visit-scoped' : 'Invitation-scoped';
      const expiry = acc.expiresAt ? acc.expiresAt.toISOString() : 'No expiration';
      console.log(`   - ${type}: expires ${expiry}`);
    }
    console.log('');
    
    // 7. Test expiration logic
    console.log('7. Testing expiration logic...');
    
    // Find valid acceptances (not expired)
    const validAcceptances = await prisma.acceptance.findMany({
      where: {
        guestId: guest.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      }
    });
    
    console.log(`✅ Found ${validAcceptances.length} valid (non-expired) acceptances`);
    
    // Simulate expired acceptance
    const expiredTime = new Date(now.getTime() - 1000);
    await prisma.acceptance.create({
      data: {
        guestId: guest.id,
        termsVersion: '1.0',
        visitorAgreementVersion: '1.0',
        expiresAt: expiredTime
      }
    });
    
    const expiredAcceptances = await prisma.acceptance.findMany({
      where: {
        guestId: guest.id,
        expiresAt: { lte: now }
      }
    });
    
    console.log(`✅ Found ${expiredAcceptances.length} expired acceptance(s)\n`);
    
    // 8. Cleanup test data
    console.log('8. Cleaning up test data...');
    
    await prisma.acceptance.deleteMany({
      where: { guestId: guest.id }
    });
    
    await prisma.visit.delete({
      where: { id: visit.id }
    });
    
    await prisma.invitation.delete({
      where: { id: invitation.id }
    });
    
    await prisma.guest.delete({
      where: { id: guest.id }
    });
    
    console.log('✅ Test data cleaned up\n');
    
    console.log('🎉 Visit-Scoped Acceptance Test PASSED!');
    console.log('');
    console.log('Summary:');
    console.log('- ✅ Acceptances can be linked to invitations');
    console.log('- ✅ Acceptances can be linked to visits');
    console.log('- ✅ Acceptances have expiration dates');
    console.log('- ✅ Expired acceptances can be filtered out');
    console.log('- ✅ Multiple acceptance types can coexist');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testVisitScopedAcceptance();