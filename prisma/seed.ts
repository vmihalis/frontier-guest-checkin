import { PrismaClient, UserRole, InvitationStatus, ContactMethod, Prisma } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Edge case scenarios for comprehensive testing
// Commented out for lint compliance

// Helper function to get location for a host
type LocationType = { id: string; name: string; [key: string]: unknown };
type HostType = { locationId?: string | null; [key: string]: unknown };

function getLocationForHost(host: HostType, activeLocations: LocationType[], mainLocation: LocationType) {
  return host.locationId 
    ? activeLocations.find(loc => loc.id === host.locationId) || mainLocation
    : mainLocation
}

async function seed() {
  console.log('🌍 Seeding interplanetary frontier database...')
  
  // Clear existing data in correct order (respecting foreign keys)
  await prisma.discount.deleteMany()
  await prisma.acceptance.deleteMany()
  await prisma.visit.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.guest.deleteMany()
  await prisma.user.deleteMany()
  await prisma.location.deleteMany()
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
  
  // Create multi-location infrastructure
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        name: 'Frontier Tower Main',
        address: '101 California Street, San Francisco, CA 94111',
        timezone: 'America/Los_Angeles',
        isActive: true,
        settings: {
          checkInCutoffHour: 23, // 11 PM
          maxDailyVisits: 500,
          requiresEscort: false
        }
      }
    }),
    prisma.location.create({
      data: {
        name: 'Frontier West Campus',
        address: '1455 Market Street, San Francisco, CA 94103',
        timezone: 'America/Los_Angeles',
        isActive: true,
        settings: {
          checkInCutoffHour: 22, // 10 PM
          maxDailyVisits: 200,
          requiresEscort: true
        }
      }
    }),
    prisma.location.create({
      data: {
        name: 'Frontier East Hub',
        address: '525 Market Street, San Francisco, CA 94105',
        timezone: 'America/Los_Angeles',
        isActive: true,
        settings: {
          checkInCutoffHour: 24, // 12 AM (24/7)
          maxDailyVisits: 100,
          requiresEscort: false
        }
      }
    }),
    // Test location (inactive)
    prisma.location.create({
      data: {
        name: 'Frontier South (Under Construction)',
        address: '200 Brannan Street, San Francisco, CA 94107',
        timezone: 'America/Los_Angeles',
        isActive: false,
        settings: {
          checkInCutoffHour: 0,
          maxDailyVisits: 0,
          requiresEscort: true
        }
      }
    })
  ])
  
  const [mainLocation, westLocation, eastLocation, constructionLocation] = locations
  
  console.log(`✅ Created ${locations.length} locations:`)
  locations.forEach(loc => {
    const status = loc.isActive ? '🟢 Active' : '🔴 Inactive'
    console.log(`  ${status} ${loc.name} - ${loc.address}`)
  })
  
  // Create diverse user population
  const users: Prisma.UserCreateInput[] = []
  
  // Demo users for consistent development
  users.push({
    email: 'demo.host@frontier.dev',
    name: 'Demo Host',
    role: UserRole.host,
    location: { connect: { id: mainLocation.id } }
  })
  
  users.push({
    email: 'demo.security@frontier.dev',
    name: 'Demo Security',
    role: UserRole.security,
    location: { connect: { id: mainLocation.id } }
  })
  
  // Admins (global operations - no specific location)
  for (let i = 0; i < 5; i++) {
    users.push({
      email: faker.internet.email({ provider: 'frontier.admin' }),
      name: faker.person.fullName(),
      role: UserRole.admin,
      // Admins have no fixed location - they manage all locations
    })
  }
  
  // Security staff distributed across locations (24/7 coverage)
  const activeLocations = [mainLocation, westLocation, eastLocation]
  for (let i = 0; i < 20; i++) {
    const assignedLocation = faker.helpers.arrayElement(activeLocations)
    users.push({
      email: faker.internet.email({ provider: 'frontier.security' }),
      name: faker.person.fullName(),
      role: UserRole.security,
      location: { connect: { id: assignedLocation.id } }
    })
  }
  
  // Hosts distributed across locations (weighted toward main location)
  for (let i = 0; i < 100; i++) {
    // Weight distribution: 60% main, 25% west, 15% east
    let assignedLocation: typeof mainLocation
    const rand = Math.random()
    if (rand < 0.6) assignedLocation = mainLocation
    else if (rand < 0.85) assignedLocation = westLocation
    else assignedLocation = eastLocation
    
    users.push({
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: UserRole.host,
      location: { connect: { id: assignedLocation.id } }
    })
  }
  
  const createdUsers = await Promise.all(
    users.map(user => prisma.user.create({ data: user }))
  )
  
  console.log(`✅ Created ${createdUsers.length} users:`)
  console.log(`  ${users.filter(u => u.role === UserRole.admin).length} admins (global)`)
  console.log(`  ${users.filter(u => u.role === UserRole.security).length} security staff`)
  console.log(`  ${users.filter(u => u.role === UserRole.host).length} hosts`)
  
  // Show location distribution for hosts
  const hostsByLocation = createdUsers.filter(u => u.role === UserRole.host)
  const locationCounts = activeLocations.map(loc => ({
    name: loc.name,
    count: hostsByLocation.filter(h => h.locationId === loc.id).length
  }))
  console.log('  Host distribution by location:')
  locationCounts.forEach(({ name, count }) => {
    console.log(`    ${name}: ${count} hosts`)
  })
  
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
  
  // Historical visits with invitations (last 6 months) - distributed across locations
  for (let i = 0; i < 300; i++) {
    const host = faker.helpers.arrayElement(hosts)
    const guest = faker.helpers.arrayElement(activeGuests)
    const inviteDate = faker.date.recent({ days: 180 })
    
    // Host's location determines invitation/visit location
    const visitLocation = getLocationForHost(host, activeLocations, mainLocation)
    
    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        locationId: visitLocation.id,
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
        locationId: visitLocation.id,
        invitationId: invitation.id,
        invitedAt: inviteDate,
        checkedInAt: checkedIn,
        checkedOutAt: checkedOut,
        expiresAt: new Date(inviteDate.getTime() + 24 * 60 * 60 * 1000),
      }
    })
  }
  
  // Currently active visits (checked in, not out) - distributed across locations
  for (let i = 0; i < 50; i++) {
    const host = faker.helpers.arrayElement(hosts)
    const guest = faker.helpers.arrayElement(activeGuests)
    const inviteDate = faker.date.recent({ days: 1 })
    const visitLocation = getLocationForHost(host, activeLocations, mainLocation)
    
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        locationId: visitLocation.id,
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
        locationId: visitLocation.id,
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
  const stressLocation = getLocationForHost(stressHost, activeLocations, mainLocation)
  for (let i = 0; i < 20; i++) {
    const guest = faker.helpers.arrayElement(activeGuests)
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: stressHost.id,
        locationId: stressLocation.id,
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
        locationId: stressLocation.id,
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
    const visitLocation = getLocationForHost(host, activeLocations, mainLocation)
    
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        locationId: visitLocation.id,
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
        locationId: visitLocation.id,
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
    const visitLocation = getLocationForHost(host, activeLocations, mainLocation)
    
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        locationId: visitLocation.id,
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
        locationId: visitLocation.id,
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
  const frequentLocation = getLocationForHost(frequentHost, activeLocations, mainLocation)
  for (let i = 0; i < 10; i++) {
    const inviteDate = faker.date.recent({ days: 25 })
    
    const invitation = await prisma.invitation.create({
      data: {
        guestId: frequentGuest.id,
        hostId: frequentHost.id,
        locationId: frequentLocation.id,
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
        locationId: frequentLocation.id,
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
  const popularLocation = getLocationForHost(popularHost, activeLocations, mainLocation)
  const now = new Date()
  for (let i = 0; i < 5; i++) {
    const guest = faker.helpers.arrayElement(activeGuests)
    
    const invitation = await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: popularHost.id,
        locationId: popularLocation.id,
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
        locationId: popularLocation.id,
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
    const visitLocation = getLocationForHost(host, activeLocations, mainLocation)
    
    await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        locationId: visitLocation.id,
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
    const visitLocation = getLocationForHost(host, activeLocations, mainLocation)
    
    await prisma.invitation.create({
      data: {
        guestId: guest.id,
        hostId: host.id,
        locationId: visitLocation.id,
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
  
  // 🔥 BATTLE TEST QR CODES - Guest batch format for unified scanning
  console.log('\n🎯 Creating battle test QR codes (guest batch format)...')
  
  // Battle test guests from multi-checkin-real.json fixture
  const battleTestGuests = [
    { email: 'Shaun79@gmail.com', name: 'Ms. Vicki Bruen', shouldSucceed: true },
    { email: 'Javonte.Feil-Koelpin@hotmail.com', name: 'Jorge Aufderhar', shouldSucceed: true },
    { email: 'Alexanne19@suspicious', name: 'Alexis Thiel', shouldSucceed: false } // This one will be blacklisted
  ]
  
  // Create or find these specific guests
  const battleQRs = []
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
        blacklistedAt: guestData.shouldSucceed ? null : new Date(), // Blacklist the failing one
      }
    })

    // Generate guest batch QR payload (single guest in the array)
    const qrPayload = JSON.stringify({
      guests: [{
        e: guest.email,
        n: guest.name
      }]
    })
    
    battleQRs.push({ 
      guest, 
      qrPayload, 
      shouldSucceed: guestData.shouldSucceed,
      failReason: guestData.shouldSucceed ? null : 'BLACKLISTED'
    })
  }

  // Create acceptance records for battle test guests (required for validation)
  console.log('\n🎯 Creating acceptance records for battle test guests...')
  for (const battleQR of battleQRs) {
    // Only create acceptance records for non-blacklisted guests
    if (battleQR.shouldSucceed) {
      await prisma.acceptance.create({
        data: {
          guestId: battleQR.guest.id,
          termsVersion: '1.0.0',
          visitorAgreementVersion: '1.0.0',
          acceptedAt: new Date()
        }
      });
      console.log(`✅ Created acceptance record for ${battleQR.guest.email}`);
    }
  }

  console.log('\n🎯 BATTLE TEST QR CODES CREATED (guest batch format):')
  console.log('====================================================')
  battleQRs.forEach(({ guest, qrPayload, shouldSucceed, failReason }) => {
    const status = shouldSucceed ? '✅ SUCCESS' : `❌ FAIL (${failReason})`
    console.log(`${status}: ${guest.email} - ${guest.name}`)
    console.log(`   QR Payload: ${qrPayload}`)
  })
  console.log('\n🔥 Ready for unified battle testing!')
  console.log('- Enable demo mode: DEMO_MODE=true npm run dev')
  console.log('- Navigate to /checkin (uses unified check-in API)')
  console.log('- First two QRs should succeed, third should fail with blacklist error')

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