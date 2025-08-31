import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nowInLA, thirtyDaysAgoInLA } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location'); // Optional location filter
    
    const now = nowInLA();
    const thirtyDaysAgo = thirtyDaysAgoInLA();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // Create location filter for queries
    const locationFilter = locationId ? { locationId } : {};

    // Get basic statistics
    const [
      totalGuests,
      totalVisits,
      activeVisits,
      todayVisits,
      weekVisits,
      monthVisits,
      totalInvitations,
      pendingInvitations,
      activatedInvitations,
      checkedInInvitations,
      blacklistedGuests,
      discountsSent,
      recentOverrides
    ] = await Promise.all([
      // Total guests
      prisma.guest.count(),
      
      // Total visits (location-filtered)
      prisma.visit.count({
        where: { 
          checkedInAt: { not: null },
          ...locationFilter
        }
      }),
      
      // Currently active visits (location-filtered)
      prisma.visit.count({
        where: {
          checkedInAt: { not: null },
          expiresAt: { gt: now },
          ...locationFilter
        }
      }),
      
      // Today's visits (location-filtered)
      prisma.visit.count({
        where: {
          checkedInAt: {
            not: null,
            gte: todayStart
          },
          ...locationFilter
        }
      }),
      
      // This week's visits (location-filtered)
      prisma.visit.count({
        where: {
          checkedInAt: {
            not: null,
            gte: weekAgo
          },
          ...locationFilter
        }
      }),
      
      // This month's visits (30 days) (location-filtered)
      prisma.visit.count({
        where: {
          checkedInAt: {
            not: null,
            gte: thirtyDaysAgo
          },
          ...locationFilter
        }
      }),
      
      // Total invitations (location-filtered)
      prisma.invitation.count({
        where: locationFilter
      }),
      
      // Pending invitations (location-filtered)
      prisma.invitation.count({
        where: { 
          status: 'PENDING',
          ...locationFilter
        }
      }),
      
      // Activated invitations (location-filtered)
      prisma.invitation.count({
        where: { 
          status: 'ACTIVATED',
          ...locationFilter
        }
      }),
      
      // Checked in invitations (location-filtered)
      prisma.invitation.count({
        where: { 
          status: 'CHECKED_IN',
          ...locationFilter
        }
      }),
      
      // Blacklisted guests
      prisma.guest.count({
        where: { blacklistedAt: { not: null } }
      }),
      
      // Discount emails sent
      prisma.discount.count({
        where: { emailSent: true }
      }),
      
      // Recent overrides (last 30 days) (location-filtered)
      prisma.visit.findMany({
        where: {
          overrideReason: { not: null },
          createdAt: { gte: thirtyDaysAgo },
          ...locationFilter
        },
        include: {
          guest: { select: { name: true, email: true } },
          host: { select: { name: true, email: true } },
          location: { select: { name: true, id: true } },
          overrideUser: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Get top hosts by visit count (location-filtered)
    const topHosts = await prisma.user.findMany({
      where: { 
        role: 'host',
        ...(locationId ? { locationId } : {}) // Filter hosts by location too
      },
      select: {
        id: true,
        name: true,
        email: true,
        location: { select: { name: true, id: true } },
        hostedVisits: {
          where: { 
            checkedInAt: { not: null },
            ...locationFilter
          },
          select: { id: true }
        }
      },
      orderBy: {
        hostedVisits: {
          _count: 'desc'
        }
      },
      take: 5
    });

    const topHostsWithCounts = topHosts.map(host => ({
      id: host.id,
      name: host.name,
      email: host.email,
      location: host.location,
      visitCount: host.hostedVisits.length
    }));

    // Get daily visit trends for the last 7 days
    const dailyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const dayVisits = await prisma.visit.count({
        where: {
          checkedInAt: {
            not: null,
            gte: startOfDay,
            lte: endOfDay
          },
          ...locationFilter
        }
      });

      dailyTrends.push({
        date: date.toISOString().split('T')[0],
        visits: dayVisits
      });
    }

    // Get available locations for filtering
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    // Get current location info if filtered
    const currentLocation = locationId 
      ? await prisma.location.findUnique({
          where: { id: locationId },
          select: { id: true, name: true }
        })
      : null;

    return NextResponse.json({
      overview: {
        totalGuests,
        totalVisits,
        activeVisits,
        todayVisits,
        weekVisits,
        monthVisits
      },
      invitations: {
        total: totalInvitations,
        pending: pendingInvitations,
        activated: activatedInvitations,
        checkedIn: checkedInInvitations
      },
      system: {
        blacklistedGuests,
        discountsSent,
        overrideCount: recentOverrides.length
      },
      topHosts: topHostsWithCounts,
      dailyTrends,
      recentOverrides: recentOverrides.map(visit => ({
        id: visit.id,
        guestName: visit.guest.name,
        guestEmail: visit.guest.email,
        hostName: visit.host.name,
        locationName: visit.location.name,
        overrideReason: visit.overrideReason,
        overrideBy: visit.overrideUser?.name || 'System',
        createdAt: visit.createdAt
      })),
      // Location context
      locations,
      currentLocation,
      isLocationFiltered: !!locationId
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}