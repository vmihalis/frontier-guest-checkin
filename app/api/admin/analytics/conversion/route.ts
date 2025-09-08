import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { getTopConversionCandidates, getGuestAnalytics } from '@/lib/analytics';
import { nowInLA, thirtyDaysAgoInLA } from '@/lib/timezone';

/**
 * GET /api/admin/analytics/conversion
 * Comprehensive conversion analytics and insights
 */
export async function GET(request: NextRequest) {
  try {
    // Admin authentication check
    const userId = await getCurrentUserId(request);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role !== 'admin' && user?.role !== 'security') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const locationId = searchParams.get('location');
    const limit = parseInt(searchParams.get('limit') || '20');

    const now = nowInLA();
    const periodStart = new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);
    const locationFilter = locationId ? { locationId } : {};

    // Parallel queries for conversion metrics
    const [
      totalGuests,
      convertedGuests,
      conversionCandidates,
      recentConversions,
      conversionEventStats,
      tierDistribution,
      averageConversionTime
    ] = await Promise.all([
      // Total unique guests
      prisma.guest.count({
        where: {
          visits: { some: { checkedInAt: { not: null }, ...locationFilter } }
        }
      }),

      // Successfully converted guests
      prisma.guest.count({
        where: {
          becameHostAt: { not: null },
          visits: { some: { ...locationFilter } }
        }
      }),

      // Top conversion candidates
      getTopConversionCandidates(limit),

      // Recent conversions
      prisma.guest.findMany({
        where: {
          becameHostAt: { 
            gte: periodStart,
            not: null
          },
          visits: { some: { ...locationFilter } }
        },
        include: {
          hostUser: { select: { name: true, email: true } },
          frequentVisitor: true
        },
        orderBy: { becameHostAt: 'desc' },
        take: 10
      }),

      // Conversion event statistics
      prisma.conversionEvent.groupBy({
        by: ['eventType'],
        where: {
          createdAt: { gte: periodStart },
          guest: {
            visits: { some: { ...locationFilter } }
          }
        },
        _count: { id: true }
      }),

      // Visitor tier distribution
      prisma.frequentVisitor.groupBy({
        by: ['currentTier'],
        where: {
          guest: {
            visits: { some: { ...locationFilter } }
          }
        },
        _count: { id: true },
        _avg: { conversionScore: true }
      }),

      // Average time to conversion
      prisma.$queryRaw`
        SELECT AVG(EXTRACT(epoch FROM (became_host_at - created_at)) / 86400) as avg_days
        FROM guests 
        WHERE became_host_at IS NOT NULL 
        AND created_at >= ${periodStart}
      `
    ]);

    // Calculate conversion rate
    const conversionRate = totalGuests > 0 ? (convertedGuests / totalGuests) * 100 : 0;

    // Calculate conversion funnel metrics
    const funnelMetrics = await calculateConversionFunnel(locationFilter, periodStart);

    // Get score distribution
    const scoreDistribution = await prisma.frequentVisitor.groupBy({
      by: [],
      where: {
        guest: {
          visits: { some: { ...locationFilter } }
        }
      },
      _count: {
        id: true
      },
      _avg: { conversionScore: true },
      _min: { conversionScore: true },
      _max: { conversionScore: true }
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalGuests,
          convertedGuests,
          conversionRate: Math.round(conversionRate * 100) / 100,
          averageConversionTime: (averageConversionTime as { avg_days: number }[])?.[0]?.avg_days || 0
        },
        candidates: conversionCandidates,
        recentConversions,
        funnelMetrics,
        eventStats: conversionEventStats,
        tierDistribution,
        scoreDistribution: {
          average: scoreDistribution[0]?._avg?.conversionScore || 0,
          min: scoreDistribution[0]?._min?.conversionScore || 0,
          max: scoreDistribution[0]?._max?.conversionScore || 0,
          total: scoreDistribution[0]?._count?.id || 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching conversion analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate conversion funnel metrics
 */
async function calculateConversionFunnel(locationFilter: { locationId?: string } | undefined, periodStart: Date) {
  const [
    totalVisitors,
    returningVisitors, 
    surveyResponders,
    interestedGuests,
    outreachContacts,
    conversions
  ] = await Promise.all([
    prisma.guest.count({
      where: {
        createdAt: { gte: periodStart },
        visits: { some: { checkedInAt: { not: null }, ...locationFilter } }
      }
    }),
    prisma.guest.count({
      where: {
        createdAt: { gte: periodStart },
        visits: { 
          some: { checkedInAt: { not: null }, ...locationFilter }
        },
        frequentVisitor: {
          visitCount: { gte: 2 }
        }
      }
    }),
    prisma.guest.count({
      where: {
        createdAt: { gte: periodStart },
        visits: { some: { ...locationFilter } },
        surveys: { some: { completedAt: { not: null } } }
      }
    }),
    prisma.guest.count({
      where: {
        createdAt: { gte: periodStart },
        visits: { some: { ...locationFilter } },
        conversionInterest: { gte: 6 } // High interest threshold
      }
    }),
    prisma.guest.count({
      where: {
        createdAt: { gte: periodStart },
        visits: { some: { ...locationFilter } },
        lastOutreachAt: { not: null }
      }
    }),
    prisma.guest.count({
      where: {
        becameHostAt: { gte: periodStart },
        visits: { some: { ...locationFilter } }
      }
    })
  ]);

  return {
    totalVisitors,
    returningVisitors,
    returningRate: totalVisitors > 0 ? (returningVisitors / totalVisitors) * 100 : 0,
    surveyResponders,
    surveyRate: returningVisitors > 0 ? (surveyResponders / returningVisitors) * 100 : 0,
    interestedGuests,
    interestRate: surveyResponders > 0 ? (interestedGuests / surveyResponders) * 100 : 0,
    outreachContacts,
    outreachRate: interestedGuests > 0 ? (outreachContacts / interestedGuests) * 100 : 0,
    conversions,
    conversionRate: outreachContacts > 0 ? (conversions / outreachContacts) * 100 : 0
  };
}