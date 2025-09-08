import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getGuestAnalytics, calculateConversionScore, logConversionEvent } from '@/lib/analytics';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/analytics/guests/[id]
 * Detailed guest analytics and conversion insights
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: guestId } = await params;
    
    // Get comprehensive guest analytics
    const [guestAnalytics, conversionScore, recentEvents, visitHistory] = await Promise.all([
      getGuestAnalytics(guestId),
      calculateConversionScore(guestId),
      prisma.conversionEvent.findMany({
        where: { guestId },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.visit.findMany({
        where: { 
          guestId,
          checkedInAt: { not: null }
        },
        include: {
          host: { select: { name: true, email: true } },
          location: { select: { name: true } }
        },
        orderBy: { checkedInAt: 'desc' },
        take: 50
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        analytics: guestAnalytics,
        conversionScore,
        recentEvents,
        visitHistory
      }
    });

  } catch (error) {
    console.error('Error fetching guest analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/analytics/guests/[id]
 * Update guest conversion tracking or log events
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: guestId } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'updateConversionInterest':
        await prisma.guest.update({
          where: { id: guestId },
          data: {
            conversionInterest: data.interest,
            lastOutreachAt: data.contacted ? new Date() : undefined
          }
        });
        break;

      case 'markAsConverted':
        await prisma.guest.update({
          where: { id: guestId },
          data: {
            becameHostAt: new Date(),
            hostUserId: data.hostUserId
          }
        });
        
        await logConversionEvent(
          guestId,
          'CONVERSION_COMPLETED',
          'admin_dashboard',
          'success',
          { convertedBy: userId, newHostId: data.hostUserId }
        );
        break;

      case 'logEvent':
        await logConversionEvent(
          guestId,
          data.eventType,
          data.touchpoint,
          data.outcome,
          data.eventData
        );
        break;

      case 'updateBusinessContext':
        await prisma.guest.update({
          where: { id: guestId },
          data: {
            company: data.company,
            jobTitle: data.jobTitle,
            industry: data.industry,
            companySize: data.companySize
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
    console.error('Error updating guest analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}