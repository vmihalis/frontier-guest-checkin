import { PrismaClient, UserRole, InvitationStatus, ContactMethod, Prisma } from '@prisma/client'
import { faker } from '@faker-js/faker'

// QR Token generation (copied from qr-token.ts to avoid import issues)
function generateQRToken(inviteId: string, guestEmail: string, hostId: string): string {
  const now = new Date();
  const expires = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  
  const tokenData = {
    inviteId,
    guestEmail,
    hostId,
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(expires.getTime() / 1000),
  };
  
  // Mock token - in production, use JWT signing with a secret
  const mockToken = btoa(JSON.stringify(tokenData));
  return mockToken;
}

const prisma = new PrismaClient()

// Edge case scenarios for comprehensive testing
// Commented out for lint compliance
  

async function seed() {
  console.log('🌍 Seeding interplanetary frontier database...')
  
  // Clear existing data in correct order (respecting foreign keys)
  await prisma.discount.deleteMany()
  await prisma.acceptance.deleteMany()
  await prisma.visit.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.guest.deleteMany()
  await prisma.user.deleteMany()
  await prisma.policy.deleteMany()
  
  // Create global policy (singleton model with id=1)
  const policy = await prisma.policy.upsert({
    where: { id: 1 },
    update: {
      guestMonthlyLimit: 3,
      hostConcurrentLimit: 3,
    },
    create: {
      id: 1,
      guestMonthlyLimit: 3,
      hostConcurrentLimit: 3,
    }
  })
  
  console.log(`✅ Created/updated global policy (monthly limit: ${policy.guestMonthlyLimit}, concurrent limit: ${policy.hostConcurrentLimit})`)
  
  // Create diverse user population
  const users: Prisma.UserCreateInput[] = []
  
  // Admins (global operations)
  for (let i = 0; i < 5; i++) {
    users.push({
      email: faker.internet.email({ provider: 'frontier.admin' }),
      name: faker.person.fullName(),
      role: UserRole.admin,
    })
  }
  
  // Security staff (24/7 coverage across timezones)
  for (let i = 0; i < 20; i++) {
    users.push({
      email: faker.internet.email({ provider: 'frontier.security' }),
      name: faker.person.fullName(),
      role: UserRole.security,
    })
  }
  
  // Hosts (various departments and activity levels)
  for (let i = 0; i < 100; i++) {
    users.push({
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: UserRole.host,
    })
  }
  
  const createdUsers = await Promise.all(
    users.map(user => prisma.user.create({ data: user }))
  )
  
  console.log(`✅ Created ${createdUsers.length} users (${users.filter(u => u.role === UserRole.admin).length} admins, ${users.filter(u => u.role === UserRole.security).length} security, ${users.filter(u => u.role === UserRole.host).length} hosts)`)
  
  // Create diverse guest population with edge cases
  const guests: Prisma.GuestCreateInput[] = []
  
  // Normal guests with terms accepted
  for (let i = 0; i < 200; i++) {
    const contactMethod = faker.helpers.arrayElement([ContactMethod.PHONE, ContactMethod.TELEGRAM, null])
    guests.push({
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phone: faker.phone.number({ style: 'international' }),
      country: faker.location.countryCode(),
      contactMethod,
      contactValue: contactMethod === ContactMethod.TELEGRAM ? `@${faker.internet.username()}` : faker.phone.number({ style: 'international' }),
      termsAcceptedAt: faker.date.recent({ days: 30 }),
      blacklistedAt: null,
    })
  }
  
  // Blacklisted guests (various reasons)
  for (let i = 0; i < 20; i++) {
    guests.push({
      email: faker.internet.email({ provider: 'suspicious' }),
      name: faker.person.fullName(),
      phone: faker.phone.number({ style: 'international' }),
      country: faker.location.countryCode(),
      contactMethod: null,
      contactValue: null,
      termsAcceptedAt: faker.date.past(),
      blacklistedAt: faker.date.recent({ days: 180 }),
    })
  }
  
  // Guests who haven't accepted terms
  for (let i = 0; i < 30; i++) {
    guests.push({
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phone: faker.phone.number({ style: 'international' }),
      country: faker.location.countryCode(),
      contactMethod: null,
      contactValue: null,
      termsAcceptedAt: null,
      blacklistedAt: null,
    })
  }
  
  // Edge case: Same person, multiple emails (attempting to bypass limits)
  const duplicatePerson = faker.person.fullName()
  const duplicatePhone = faker.phone.number({ style: 'national' })
  for (let i = 0; i < 5; i++) {
    guests.push({
      email: `${duplicatePerson.toLowerCase().replace(' ', '.')}+${i}@gmail.com`,
      name: duplicatePerson,
      phone: duplicatePhone,
      country: 'US',
      contactMethod: ContactMethod.PHONE,
      contactValue: duplicatePhone,
      termsAcceptedAt: faker.date.recent(),
      blacklistedAt: null,
    })
  }
  
  const createdGuests = await Promise.all(
    guests.map(guest => prisma.guest.create({ data: guest }))
  )
  
  console.log(`✅ Created ${createdGuests.length} guests (${guests.filter(g => g.blacklistedAt).length} blacklisted, ${guests.filter(g => !g.termsAcceptedAt).length} without terms)`)
  
  // Create invitations and visits with all edge cases
  const hosts = createdUsers.filter(u => u.role === UserRole.host)
  const activeGuests = createdGuests.filter(g => !g.blacklistedAt && g.termsAcceptedAt)
  const blacklistedGuests = createdGuests.filter(g => g.blacklistedAt)
  
  // const invitations: Prisma.InvitationCreateInput[] = []
  // const visits: Prisma.VisitCreateInput[] = []
  
  // Historical visits with invitations (last 6 months)
  for (let i = 0; i < 300; i++) {
    const host = faker.helpers.arrayElement(hosts)
    const guest = faker.helpers.arrayElement(activeGuests)
    const inviteDate = faker.date.recent({ days: 180 })
    
    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        inviteDate,
        status: InvitationStatus.CHECKED_IN,
        qrToken: faker.string.alphanumeric(32),
        qrIssuedAt: inviteDate,
        qrExpiresAt: new Date(inviteDate.getTime() + 24 * 60 * 60 * 1000),
      }
    })
    
    // Create corresponding visit
    const checkedIn = new Date(inviteDate.getTime() + faker.number.int({ min: 0, max: 8 }) * 60 * 60 * 1000)
    const stayHours = faker.helpers.arrayElement([0.5, 1, 2, 4, 8, 24])
    const checkedOut = faker.datatype.boolean({ probability: 0.95 }) 
      ? new Date(checkedIn.getTime() + stayHours * 60 * 60 * 1000)
      : null // 5% never checked out
    
    await prisma.visit.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        invitationId: invitation.id,
        invitedAt: inviteDate,
        checkedInAt: checkedIn,
        checkedOutAt: checkedOut,
        expiresAt: new Date(inviteDate.getTime() + 24 * 60 * 60 * 1000),
      }
    })
  }
  
  // Currently active visits (checked in, not out)
  for (let i = 0; i < 50; i++) {
    const host = faker.helpers.arrayElement(hosts)
    const guest = faker.helpers.arrayElement(activeGuests)
    const inviteDate = faker.date.recent({ days: 1 })
    
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        inviteDate,
        status: InvitationStatus.CHECKED_IN,
        qrToken: faker.string.alphanumeric(32),
        qrIssuedAt: inviteDate,
        qrExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      }
    })
    
    await prisma.visit.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        invitationId: invitation.id,
        invitedAt: inviteDate,
        checkedInAt: faker.date.recent({ days: 1 }),
        checkedOutAt: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }
    })
  }
  
  // Edge case: Rapid check-ins (stress test)
  const stressTestTime = new Date()
  const stressHost = faker.helpers.arrayElement(hosts)
  for (let i = 0; i < 20; i++) {
    const guest = faker.helpers.arrayElement(activeGuests)
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: stressHost.id,
        inviteDate: stressTestTime,
        status: InvitationStatus.CHECKED_IN,
        qrToken: faker.string.alphanumeric(32),
        qrIssuedAt: stressTestTime,
        qrExpiresAt: new Date(stressTestTime.getTime() + 24 * 60 * 60 * 1000),
      }
    })
    
    await prisma.visit.create({
      data: {
        guestId: guest.id,
        hostId: stressHost.id,
        invitationId: invitation.id,
        invitedAt: stressTestTime,
        checkedInAt: new Date(stressTestTime.getTime() + i * 1000), // 1 second apart
        checkedOutAt: null,
        expiresAt: new Date(stressTestTime.getTime() + 24 * 60 * 60 * 1000),
        overrideReason: 'Mass arrival event - stress test',
      }
    })
  }
  
  // Edge case: Midnight crossing visits
  const midnight = new Date()
  midnight.setHours(23, 45, 0, 0)
  for (let i = 0; i < 10; i++) {
    const host = faker.helpers.arrayElement(hosts)
    const guest = faker.helpers.arrayElement(activeGuests)
    
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        inviteDate: midnight,
        status: InvitationStatus.CHECKED_IN,
        qrToken: faker.string.alphanumeric(32),
        qrIssuedAt: midnight,
        qrExpiresAt: new Date(midnight.getTime() + 48 * 60 * 60 * 1000),
      }
    })
    
    await prisma.visit.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        invitationId: invitation.id,
        invitedAt: midnight,
        checkedInAt: midnight,
        checkedOutAt: new Date(midnight.getTime() + 2 * 60 * 60 * 1000), // Crosses midnight
        expiresAt: new Date(midnight.getTime() + 48 * 60 * 60 * 1000),
      }
    })
  }
  
  // Edge case: Forgotten checkouts (badges never returned)
  for (let i = 0; i < 5; i++) {
    const host = faker.helpers.arrayElement(hosts)
    const guest = faker.helpers.arrayElement(activeGuests)
    const inviteDate = faker.date.recent({ days: 30 })
    
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        inviteDate,
        status: InvitationStatus.CHECKED_IN,
        qrToken: faker.string.alphanumeric(32),
        qrIssuedAt: inviteDate,
        qrExpiresAt: new Date(inviteDate.getTime() + 24 * 60 * 60 * 1000),
      }
    })
    
    await prisma.visit.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        invitationId: invitation.id,
        invitedAt: inviteDate,
        checkedInAt: inviteDate,
        checkedOutAt: null, // Never checked out
        expiresAt: new Date(inviteDate.getTime() + 24 * 60 * 60 * 1000),
        overrideReason: 'Badge never returned - possible forgotten checkout',
      }
    })
  }
  
  // Edge case: Guest hitting monthly limit
  const frequentGuest = faker.helpers.arrayElement(activeGuests)
  const frequentHost = faker.helpers.arrayElement(hosts)
  for (let i = 0; i < 10; i++) {
    const inviteDate = faker.date.recent({ days: 25 })
    
    const invitation = await prisma.invitation.create({
      data: {
        guestId: frequentGuest.id,
        hostId: frequentHost.id,
        inviteDate,
        status: InvitationStatus.CHECKED_IN,
        qrToken: faker.string.alphanumeric(32),
        qrIssuedAt: inviteDate,
        qrExpiresAt: new Date(inviteDate.getTime() + 24 * 60 * 60 * 1000),
      }
    })
    
    await prisma.visit.create({
      data: {
        guestId: frequentGuest.id,
        hostId: frequentHost.id,
        invitationId: invitation.id,
        invitedAt: inviteDate,
        checkedInAt: inviteDate,
        checkedOutAt: new Date(inviteDate.getTime() + 2 * 60 * 60 * 1000),
        expiresAt: new Date(inviteDate.getTime() + 24 * 60 * 60 * 1000),
      }
    })
  }
  
  // Edge case: Host at concurrent limit
  const popularHost = faker.helpers.arrayElement(hosts)
  const now = new Date()
  for (let i = 0; i < 5; i++) {
    const guest = faker.helpers.arrayElement(activeGuests)
    
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: popularHost.id,
        inviteDate: now,
        status: InvitationStatus.CHECKED_IN,
        qrToken: faker.string.alphanumeric(32),
        qrIssuedAt: now,
        qrExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      }
    })
    
    await prisma.visit.create({
      data: {
        guestId: guest.id,
        hostId: popularHost.id,
        invitationId: invitation.id,
        invitedAt: now,
        checkedInAt: now,
        checkedOutAt: null,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        overrideReason: i >= 3 ? 'Host over concurrent limit - override required' : null,
      }
    })
  }
  
  // Edge case: Expired invitations (never used)
  for (let i = 0; i < 20; i++) {
    const host = faker.helpers.arrayElement(hosts)
    const guest = faker.helpers.arrayElement(activeGuests)
    const inviteDate = faker.date.recent({ days: 30 })
    
    await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        inviteDate,
        status: InvitationStatus.EXPIRED,
        qrToken: faker.string.alphanumeric(32),
        qrIssuedAt: inviteDate,
        qrExpiresAt: new Date(inviteDate.getTime() + 24 * 60 * 60 * 1000),
      }
    })
  }
  
  // Edge case: Blacklisted guest attempts (should be blocked)
  for (let i = 0; i < 10; i++) {
    const host = faker.helpers.arrayElement(hosts)
    const guest = faker.helpers.arrayElement(blacklistedGuests)
    const inviteDate = faker.date.recent({ days: 10 })
    
    await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        inviteDate,
        status: InvitationStatus.PENDING, // Never activated due to blacklist
        qrToken: null, // QR never generated
        qrIssuedAt: null,
        qrExpiresAt: null,
      }
    })
  }
  
  // Create acceptance records for guests with terms
  const acceptances = activeGuests.map(guest => ({
    guestId: guest.id,
    termsVersion: '1.0.0',
    visitorAgreementVersion: '1.0.0',
    acceptedAt: guest.termsAcceptedAt || new Date(),
  }))
  
  await prisma.acceptance.createMany({
    data: acceptances,
  })
  
  console.log(`✅ Created ${acceptances.length} acceptance records`)
  
  // Create discount triggers for frequent visitors
  const frequentVisitorIds = await prisma.visit.groupBy({
    by: ['guestId'],
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gte: 5,
        },
      },
    },
  })
  
  for (const visitor of frequentVisitorIds) {
    await prisma.discount.create({
      data: {
        guestId: visitor.guestId,
        emailSent: faker.datatype.boolean(),
        sentAt: faker.datatype.boolean() ? faker.date.recent({ days: 7 }) : null,
      }
    })
  }
  
  console.log(`✅ Created ${frequentVisitorIds.length} discount records for frequent visitors`)
  
  // Summary statistics
  console.log('\n📊 Database seeded with edge cases:')
  console.log('=====================================')
  
  const stats = await prisma.$transaction([
    prisma.user.count(),
    prisma.guest.count(),
    prisma.invitation.count(),
    prisma.visit.count(),
    prisma.guest.count({ where: { blacklistedAt: { not: null } } }),
    prisma.guest.count({ where: { termsAcceptedAt: null } }),
    prisma.visit.count({ where: { checkedOutAt: null } }),
    prisma.invitation.count({ where: { status: InvitationStatus.EXPIRED } }),
    prisma.invitation.count({ where: { status: InvitationStatus.PENDING } }),
    prisma.acceptance.count(),
    prisma.discount.count(),
  ])
  
  console.log(`Total users: ${stats[0]}`)
  console.log(`Total guests: ${stats[1]}`)
  console.log(`Total invitations: ${stats[2]}`)
  console.log(`Total visits: ${stats[3]}`)
  console.log(`Blacklisted guests: ${stats[4]}`)
  console.log(`Guests without terms: ${stats[5]}`)
  console.log(`Currently checked in: ${stats[6]}`)
  console.log(`Expired invitations: ${stats[7]}`)
  console.log(`Pending invitations: ${stats[8]}`)
  console.log(`Terms acceptances: ${stats[9]}`)
  console.log(`Discount triggers: ${stats[10]}`)
  
  // Test edge case queries
  console.log('\n🧪 Testing edge case queries:')
  console.log('==============================')
  
  // Monthly limit check for frequent guest
  const monthlyVisits = await prisma.visit.count({
    where: {
      guestId: frequentGuest.id,
      checkedInAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  })
  console.log(`Frequent guest visits (last 30 days): ${monthlyVisits} (limit: ${policy.guestMonthlyLimit})`)
  
  // Concurrent guests for popular host
  const concurrentGuests = await prisma.visit.count({
    where: {
      hostId: popularHost.id,
      checkedInAt: { not: null },
      checkedOutAt: null
    }
  })
  console.log(`Popular host concurrent guests: ${concurrentGuests} (limit: ${policy.hostConcurrentLimit})`)
  
  // Long-staying guests (>24 hours)
  const longStayers = await prisma.visit.count({
    where: {
      checkedInAt: {
        lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      checkedOutAt: null
    }
  })
  console.log(`Guests checked in >24 hours: ${longStayers}`)
  
  // Blacklist enforcement check
  const blacklistAttempts = await prisma.invitation.count({
    where: {
      guest: {
        blacklistedAt: { not: null }
      },
      status: InvitationStatus.PENDING
    }
  })
  console.log(`Blocked blacklist invitation attempts: ${blacklistAttempts}`)
  
  // 🔥 BATTLE TEST INVITATIONS - Using multi-checkin-real.json fixture data
  console.log('\n🎯 Creating battle test invitations from fixture data...')
  
  const battleHost = hosts[0] // Use first host for all battle tests
  const qrExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday for expired QR
  
  // Battle test guests from multi-checkin-real.json fixture
  const battleTestGuests = [
    { email: 'Shaun79@gmail.com', name: 'Ms. Vicki Bruen', shouldSucceed: true },
    { email: 'Javonte.Feil-Koelpin@hotmail.com', name: 'Jorge Aufderhar', shouldSucceed: true },
    { email: 'Alexanne19@suspicious', name: 'Alexis Thiel', shouldSucceed: false } // This one will be expired
  ]
  
  // Create or find these specific guests
  const battleInvitations = []
  for (const guestData of battleTestGuests) {
    // Create the guest if they don't exist
    const guest = await prisma.guest.upsert({
      where: { email: guestData.email },
      update: {},
      create: {
        email: guestData.email,
        name: guestData.name,
        phone: faker.phone.number({ style: 'international' }),
        country: faker.location.countryCode(),
        termsAcceptedAt: new Date(),
        blacklistedAt: null,
      }
    })
    
    // Create invitation first without QR token
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: battleHost.id,
        status: guestData.shouldSucceed ? InvitationStatus.ACTIVATED : InvitationStatus.EXPIRED,
        inviteDate: new Date(),
        qrToken: null, // Will be set after creation
        qrIssuedAt: new Date(),
        qrExpiresAt: guestData.shouldSucceed ? qrExpiry : yesterday
      }
    })

    // Generate proper QR token now that we have the invitation ID
    const properQRToken = guestData.shouldSucceed 
      ? generateQRToken(invitation.id, guest.email, battleHost.id)
      : null; // Expired invitations don't need valid tokens

    // Update invitation with proper QR token
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { 
        qrToken: properQRToken || `EXPIRED-${Date.now()}-${guestData.email.split('@')[0]}`
      }
    })
    
    battleInvitations.push({ guest, invitation, shouldSucceed: guestData.shouldSucceed })
  }

  console.log('\n🎯 BATTLE TEST DATA CREATED (fixture-based):')
  console.log('===========================================')
  battleInvitations.forEach(({ guest, invitation, shouldSucceed }) => {
    const status = shouldSucceed ? '✅ SUCCESS (VALID QR)' : '❌ FAIL (EXPIRED QR)'
    console.log(`${status}: ${guest.email} - ${guest.name}`)
    console.log(`   QR Token: ${invitation.qrToken}`)
    console.log(`   Expires: ${invitation.qrExpiresAt?.toLocaleString()}`)
  })
  console.log('\n🔥 Ready for battle testing!')
  console.log('- Enable demo mode: DEMO_MODE=true npm run dev')
  console.log('- Navigate to /checkin')
  console.log('- First two QRs should succeed, third should fail with expired error')

  console.log('\n✨ Seeding complete! Database ready for interplanetary frontier operations.')
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })