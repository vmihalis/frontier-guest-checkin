import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { nowInLA, thirtyDaysAgoInLA } from '@/lib/timezone';

/**
 * GET /api/host/referrals
 * Host referral dashboard - shows their referral stats and rewards
 */
export async function GET(request: NextRequest) {
  try {
    // Host authentication
    const hostId = await getCurrentUserId(request);
    const host = await prisma.user.findUnique({
      where: { id: hostId },
      select: { 
        role: true, 
        name: true,
        referralCount: true,
        conversionCount: true,
        rewardBalance: true,
        hostTier: true
      }
    });

    if (!host || host.role !== 'host') {
      return NextResponse.json(
        { error: 'Host access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const periodStart = new Date(nowInLA().getTime() - parseInt(period) * 24 * 60 * 60 * 1000);

    // Get host's referral analytics
    const [
      recentGuests,
      referralEvents,
      conversionCandidates,
      rewardHistory
    ] = await Promise.all([
      // Recent guests hosted
      prisma.visit.findMany({
        where: {
          hostId,
          checkedInAt: { 
            not: null,
            gte: periodStart 
          }
        },
        include: {
          guest: {
            select: {
              id: true,
              email: true,
              name: true,
              company: true,
              becameHostAt: true,
              frequentVisitor: {
                select: {
                  visitCount: true,
                  conversionScore: true,
                  currentTier: true
                }
              }
            }
          }
        },
        orderBy: { checkedInAt: 'desc' },
        take: 20
      }),

      // Referral events
      prisma.referralEvent.findMany({
        where: {
          hostId,
          createdAt: { gte: periodStart }
        },
        include: {
          referredGuest: {
            select: {
              email: true,
              name: true,
              becameHostAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // High conversion potential guests
      prisma.visit.findMany({
        where: {
          hostId,
          checkedInAt: { not: null },
          guest: {
            becameHostAt: null, // Not converted yet
            frequentVisitor: {
              conversionScore: { gte: 60 } // High score
            }
          }
        },
        include: {
          guest: {
            select: {
              id: true,
              email: true,
              name: true,
              company: true,
              conversionInterest: true,
              frequentVisitor: {
                select: {
                  conversionScore: true,
                  currentTier: true,
                  visitCount: true
                }
              }
            }
          }
        },
        orderBy: {
          guest: {
            frequentVisitor: {
              conversionScore: 'desc'
            }
          }
        },
        take: 10
      }),

      // Reward history
      prisma.referralEvent.findMany({
        where: {
          hostId,
          eventType: 'REWARD_EARNED',
          status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate metrics
    const totalGuests = recentGuests.length;
    const convertedGuests = recentGuests.filter(visit => visit.guest.becameHostAt).length;
    const conversionRate = totalGuests > 0 ? (convertedGuests / totalGuests) * 100 : 0;
    
    // Calculate potential rewards from high-score candidates
    const potentialRewards = conversionCandidates.length * 100; // $100 per conversion

    return NextResponse.json({
      success: true,
      data: {
        hostInfo: {
          name: host.name,
          tier: host.hostTier,
          totalReferrals: host.referralCount,
          totalConversions: host.conversionCount,
          rewardBalance: host.rewardBalance,
          conversionRate: Math.round(conversionRate * 100) / 100
        },
        metrics: {
          recentGuests: totalGuests,
          convertedGuests,
          conversionRate: Math.round(conversionRate * 100) / 100,
          potentialRewards
        },
        recentActivity: recentGuests.map(visit => ({
          guestId: visit.guest.id,
          guestName: visit.guest.name,
          guestEmail: visit.guest.email,
          company: visit.guest.company,
          checkedInAt: visit.checkedInAt,
          isConverted: !!visit.guest.becameHostAt,
          convertedAt: visit.guest.becameHostAt,
          visitCount: visit.guest.frequentVisitor?.visitCount || 0,
          conversionScore: visit.guest.frequentVisitor?.conversionScore || 0,
          tier: visit.guest.frequentVisitor?.currentTier || 'BRONZE'
        })),
        conversionCandidates: conversionCandidates.map(visit => ({
          guestId: visit.guest.id,
          guestName: visit.guest.name,
          guestEmail: visit.guest.email,
          company: visit.guest.company,
          conversionScore: visit.guest.frequentVisitor?.conversionScore || 0,
          conversionInterest: visit.guest.conversionInterest || 0,
          visitCount: visit.guest.frequentVisitor?.visitCount || 0,
          tier: visit.guest.frequentVisitor?.currentTier || 'BRONZE',
          potentialReward: 100
        })),
        referralEvents: referralEvents,
        rewardHistory: rewardHistory
      }
    });

  } catch (error) {
    console.error('Error fetching host referrals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/host/referrals
 * Host actions for referral program (recommend guests, track outreach)
 */
export async function POST(request: NextRequest) {
  try {
    const hostId = await getCurrentUserId(request);
    const host = await prisma.user.findUnique({
      where: { id: hostId },
      select: { role: true }
    });

    if (!host || host.role !== 'host') {
      return NextResponse.json(
        { error: 'Host access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, guestId, notes } = body;

    switch (action) {
      case 'recommendGuest':
        // Mark guest as recommended for conversion
        await prisma.guest.update({
          where: { id: guestId },
          data: {
            conversionInterest: Math.max(8, body.interestLevel || 0),
            lastOutreachAt: nowInLA()
          }
        });

        // Log referral event
        await prisma.referralEvent.create({
          data: {
            hostId,
            referredGuestId: guestId,
            eventType: 'GUEST_INVITED',
            status: 'PENDING'
          }
        });

        // Update host referral count
        await prisma.user.update({
          where: { id: hostId },
          data: {
            referralCount: { increment: 1 }
          }
        });
        break;

      case 'logOutreach':
        // Log that host reached out to guest about hosting
        await prisma.guest.update({
          where: { id: guestId },
          data: {
            lastOutreachAt: nowInLA(),
            feedbackText: notes
          }
        });

        await prisma.referralEvent.create({
          data: {
            hostId,
            referredGuestId: guestId,
            eventType: 'GUEST_INVITED',
            status: 'PENDING'
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
    console.error('Error processing host referral action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}