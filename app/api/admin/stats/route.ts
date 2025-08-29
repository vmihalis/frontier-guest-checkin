import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nowInLA, thirtyDaysAgoInLA } from '@/lib/timezone';

export async function GET() {
  try {
    const now = nowInLA();
    const thirtyDaysAgo = thirtyDaysAgoInLA();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

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
      
      // Total visits
      prisma.visit.count({
        where: { checkedInAt: { not: null } }
      }),
      
      // Currently active visits
      prisma.visit.count({
        where: {
          checkedInAt: { not: null },
          expiresAt: { gt: now }
        }
      }),
      
      // Today's visits
      prisma.visit.count({
        where: {
          checkedInAt: {
            not: null,
            gte: todayStart
          }
        }
      }),
      
      // This week's visits
      prisma.visit.count({
        where: {
          checkedInAt: {
            not: null,
            gte: weekAgo
          }
        }
      }),
      
      // This month's visits (30 days)
      prisma.visit.count({
        where: {
          checkedInAt: {
            not: null,
            gte: thirtyDaysAgo
          }
        }
      }),
      
      // Total invitations
      prisma.invitation.count(),
      
      // Pending invitations
      prisma.invitation.count({
        where: { status: 'PENDING' }
      }),
      
      // Activated invitations
      prisma.invitation.count({
        where: { status: 'ACTIVATED' }
      }),
      
      // Checked in invitations
      prisma.invitation.count({
        where: { status: 'CHECKED_IN' }
      }),
      
      // Blacklisted guests
      prisma.guest.count({
        where: { blacklistedAt: { not: null } }
      }),
      
      // Discount emails sent
      prisma.discount.count({
        where: { emailSent: true }
      }),
      
      // Recent overrides (last 30 days)
      prisma.visit.findMany({
        where: {
          overrideReason: { not: null },
          createdAt: { gte: thirtyDaysAgo }
        },
        include: {
          guest: { select: { name: true, email: true } },
          host: { select: { name: true, email: true } },
          overrideUser: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Get top hosts by visit count
    const topHosts = await prisma.user.findMany({
      where: { role: 'host' },
      select: {
        id: true,
        name: true,
        email: true,
        hostedVisits: {
          where: { checkedInAt: { not: null } },
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
          }
        }
      });

      dailyTrends.push({
        date: date.toISOString().split('T')[0],
        visits: dayVisits
      });
    }

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
        overrideReason: visit.overrideReason,
        overrideBy: visit.overrideUser?.name || 'System',
        createdAt: visit.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}