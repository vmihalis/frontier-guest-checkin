import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { nowInLA, thirtyDaysAgoInLA } from '@/lib/timezone';

/**
 * GET /api/admin/analytics/referrals
 * Host referral program analytics and leaderboard
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

    // Parallel queries for referral analytics
    const [
      topReferrers,
      referralStats,
      recentReferrals,
      hostTierDistribution,
      referralRewards,
      conversionRates
    ] = await Promise.all([
      // Top referring hosts
      prisma.user.findMany({
        where: {
          role: 'host',
          ...locationFilter,
          hostedVisits: {
            some: {
              createdAt: { gte: periodStart },
              checkedInAt: { not: null }
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          referralCount: true,
          conversionCount: true,
          rewardBalance: true,
          hostTier: true,
          hostedVisits: {
            where: {
              createdAt: { gte: periodStart },
              checkedInAt: { not: null }
            },
            include: {
              guest: {
                select: {
                  email: true,
                  name: true,
                  becameHostAt: true,
                  frequentVisitor: {
                    select: { conversionScore: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { conversionCount: 'desc' },
        take: limit
      }),

      // Overall referral statistics
      prisma.user.aggregate({
        where: {
          role: 'host',
          ...locationFilter
        },
        _sum: {
          referralCount: true,
          conversionCount: true,
          rewardBalance: true
        },
        _avg: {
          referralCount: true,
          conversionCount: true
        }
      }),

      // Recent referral events
      prisma.referralEvent.findMany({
        where: {
          createdAt: { gte: periodStart },
          host: locationFilter.locationId ? { locationId: locationFilter.locationId } : {}
        },
        include: {
          host: { select: { name: true, email: true } },
          referredGuest: { select: { name: true, email: true, becameHostAt: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),

      // Host tier distribution
      prisma.user.groupBy({
        by: ['hostTier'],
        where: {
          role: 'host',
          ...locationFilter
        },
        _count: { id: true },
        _sum: { conversionCount: true }
      }),

      // Total rewards distributed
      prisma.referralEvent.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: periodStart },
          host: locationFilter.locationId ? { locationId: locationFilter.locationId } : {}
        },
        _sum: { rewardAmount: true },
        _count: { id: true }
      }),

      // Conversion rates by host tier
      prisma.$queryRaw`
        SELECT 
          u.host_tier,
          COUNT(DISTINCT v.guest_id) as total_guests,
          COUNT(DISTINCT CASE WHEN g.became_host_at IS NOT NULL THEN v.guest_id END) as converted_guests,
          ROUND(
            (COUNT(DISTINCT CASE WHEN g.became_host_at IS NOT NULL THEN v.guest_id END)::float / 
             NULLIF(COUNT(DISTINCT v.guest_id), 0)) * 100, 2
          ) as conversion_rate
        FROM users u
        LEFT JOIN visits v ON u.id = v.host_id AND v.checked_in_at IS NOT NULL
        LEFT JOIN guests g ON v.guest_id = g.id
        WHERE u.role = 'host'
        ${locationId ? `AND v.location_id = '${locationId}'` : ''}
        AND v.created_at >= ${periodStart}
        GROUP BY u.host_tier
        ORDER BY conversion_rate DESC
      `
    ]);

    // Calculate enhanced metrics for top referrers
    const enhancedReferrers = topReferrers.map(host => {
      const totalGuests = host.hostedVisits.length;
      const convertedGuests = host.hostedVisits.filter(v => v.guest.becameHostAt).length;
      const conversionRate = totalGuests > 0 ? (convertedGuests / totalGuests) * 100 : 0;
      const avgConversionScore = host.hostedVisits.reduce((sum, v) => 
        sum + (v.guest.frequentVisitor?.conversionScore || 0), 0
      ) / Math.max(totalGuests, 1);

      return {
        ...host,
        metrics: {
          totalGuests,
          convertedGuests,
          conversionRate: Math.round(conversionRate * 100) / 100,
          avgConversionScore: Math.round(avgConversionScore * 100) / 100,
          potentialRewards: conversionRate * 100 // $100 per conversion
        }
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalHosts: topReferrers.length,
          totalReferrals: referralStats._sum.referralCount || 0,
          totalConversions: referralStats._sum.conversionCount || 0,
          totalRewards: referralRewards._sum.rewardAmount || 0,
          avgReferralsPerHost: Math.round((referralStats._avg.referralCount || 0) * 100) / 100,
          avgConversionsPerHost: Math.round((referralStats._avg.conversionCount || 0) * 100) / 100
        },
        topReferrers: enhancedReferrers,
        recentActivity: recentReferrals,
        tierDistribution: hostTierDistribution,
        conversionRatesByTier: conversionRates,
        rewardsSummary: {
          totalDistributed: referralRewards._sum.rewardAmount || 0,
          rewardsCount: referralRewards._count.id || 0,
          pendingRewards: await calculatePendingRewards(locationFilter)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching referral analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/analytics/referrals
 * Process referral rewards or update host tiers
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, hostId, amount, reason } = body;

    switch (action) {
      case 'processReward':
        await prisma.user.update({
          where: { id: hostId },
          data: {
            rewardBalance: { increment: amount }
          }
        });

        await prisma.referralEvent.create({
          data: {
            hostId,
            referredGuestId: body.guestId,
            eventType: 'REWARD_EARNED',
            rewardAmount: amount,
            status: 'COMPLETED'
          }
        });
        break;

      case 'updateTier':
        await prisma.user.update({
          where: { id: hostId },
          data: {
            hostTier: body.newTier
          }
        });
        break;

      case 'resetRewards':
        await prisma.user.update({
          where: { id: hostId },
          data: {
            rewardBalance: 0
          }
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error processing referral action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate pending referral rewards
 */
async function calculatePendingRewards(locationFilter: any): Promise<number> {
  const pendingReferrals = await prisma.referralEvent.aggregate({
    where: {
      status: 'PENDING',
      host: locationFilter.locationId ? { locationId: locationFilter.locationId } : {}
    },
    _sum: { rewardAmount: true }
  });

  return pendingReferrals._sum.rewardAmount || 0;
}