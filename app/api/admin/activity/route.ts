import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nowInLA } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location');
    
    const now = nowInLA();
    const twentyFourHoursAgo = new Date(now);
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    // Create location filter for queries
    const locationFilter = locationId ? { locationId } : {};

    // Get recent check-ins
    const recentCheckins = await prisma.visit.findMany({
      where: {
        checkedInAt: {
          not: null,
          gte: twentyFourHoursAgo
        },
        ...locationFilter
      },
      include: {
        guest: {
          select: { name: true, email: true, country: true }
        },
        host: {
          select: { name: true, email: true }
        }
      },
      orderBy: { checkedInAt: 'desc' },
      take: 20
    });

    // Get recent QR activations
    const recentActivations = await prisma.invitation.findMany({
      where: {
        qrIssuedAt: {
          not: null,
          gte: twentyFourHoursAgo
        }
      },
      include: {
        guest: {
          select: { name: true, email: true, country: true }
        },
        host: {
          select: { name: true, email: true }
        }
      },
      orderBy: { qrIssuedAt: 'desc' },
      take: 20
    });

    // Get recent guest registrations
    const recentGuests = await prisma.guest.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get recent blacklist changes (last 7 days for less noise)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentBlacklist = await prisma.guest.findMany({
      where: {
        blacklistedAt: {
          not: null,
          gte: sevenDaysAgo
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        blacklistedAt: true
      },
      orderBy: { blacklistedAt: 'desc' },
      take: 10
    });

    // Get recent overrides
    const recentOverrides = await prisma.visit.findMany({
      where: {
        overrideReason: { not: null },
        createdAt: { gte: twentyFourHoursAgo }
      },
      include: {
        guest: {
          select: { name: true, email: true }
        },
        host: {
          select: { name: true }
        },
        overrideUser: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Combine and format activities
    const activities: Array<{
      type: string;
      timestamp: Date | null;
      title: string;
      description: string;
      icon: string;
      severity: 'info' | 'success' | 'warning' | 'error';
      data: Record<string, unknown>;
    }> = [];

    // Check-ins
    recentCheckins.forEach(visit => {
      activities.push({
        type: 'checkin',
        timestamp: visit.checkedInAt,
        title: `${visit.guest.name} checked in`,
        description: `Hosted by ${visit.host.name}${visit.guest.country ? ` • From ${visit.guest.country}` : ''}`,
        icon: 'user-check',
        severity: 'info',
        data: {
          guestEmail: visit.guest.email,
          hostEmail: visit.host.email,
          override: !!visit.overrideReason
        }
      });
    });

    // QR Activations
    recentActivations.forEach(invitation => {
      activities.push({
        type: 'activation',
        timestamp: invitation.qrIssuedAt,
        title: `QR code activated for ${invitation.guest.name}`,
        description: `Host: ${invitation.host.name} • Status: ${invitation.status}`,
        icon: 'qr-code',
        severity: 'success',
        data: {
          guestEmail: invitation.guest.email,
          hostEmail: invitation.host.email,
          invitationId: invitation.id
        }
      });
    });

    // New guest registrations
    recentGuests.forEach(guest => {
      activities.push({
        type: 'registration',
        timestamp: guest.createdAt,
        title: `New guest registered`,
        description: `${guest.name} (${guest.email})${guest.country ? ` from ${guest.country}` : ''}`,
        icon: 'user-plus',
        severity: 'info',
        data: {
          guestEmail: guest.email,
          guestId: guest.id
        }
      });
    });

    // Blacklist changes
    recentBlacklist.forEach(guest => {
      activities.push({
        type: 'blacklist',
        timestamp: guest.blacklistedAt,
        title: `Guest blacklisted`,
        description: `${guest.name} (${guest.email}) was added to blacklist`,
        icon: 'ban',
        severity: 'warning',
        data: {
          guestEmail: guest.email,
          guestId: guest.id
        }
      });
    });

    // Override events
    recentOverrides.forEach(visit => {
      activities.push({
        type: 'override',
        timestamp: visit.createdAt,
        title: `Security override used`,
        description: `${visit.guest.name} • Reason: ${visit.overrideReason} • By: ${visit.overrideUser?.name || 'System'}`,
        icon: 'shield-alert',
        severity: 'error',
        data: {
          guestEmail: visit.guest.email,
          reason: visit.overrideReason,
          overrideBy: visit.overrideUser?.name
        }
      });
    });

    // Sort all activities by timestamp (filter out null timestamps first)
    const validActivities = activities.filter(activity => activity.timestamp !== null);
    validActivities.sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());

    // Take only the most recent 50 activities
    const recentActivities = validActivities.slice(0, 50);

    return NextResponse.json({
      activities: recentActivities,
      lastUpdated: now,
      totalActivities: activities.length
    });

  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}