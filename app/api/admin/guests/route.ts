import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGuestStats } from '@/lib/validations';
import { getGuestAcceptanceStatus } from '@/lib/acceptance-helpers';
import { thirtyDaysAgoInLA } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const showBlacklisted = searchParams.get('blacklisted') === 'true';
    const locationId = searchParams.get('location');

    const whereClause: {
      AND: Array<{
        OR?: Array<{ name?: { contains: string; mode: 'insensitive' } } | { email?: { contains: string; mode: 'insensitive' } }>;
        blacklistedAt?: { not: null };
        visits?: { some: { locationId: string } };
      }>;
    } = {
      AND: [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    };

    // Filter by blacklist status if specified
    if (showBlacklisted) {
      whereClause.AND.push({
        blacklistedAt: { not: null }
      });
    }
    
    // Filter by location if specified
    if (locationId) {
      whereClause.AND.push({
        visits: { some: { locationId } }
      });
    }

    const guests = await prisma.guest.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
        contactMethod: true,
        contactValue: true,
        blacklistedAt: true,
        createdAt: true,
        termsAcceptedAt: true,
        acceptances: true, // Include acceptances for status calculation
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to 100 guests for performance
    });

    // Get all guest IDs for bulk stats query
    const guestIds = guests.map(g => g.id);
    
    // Early return if no guests to avoid unnecessary queries
    if (guestIds.length === 0) {
      return NextResponse.json({ 
        guests: [],
        total: 0 
      });
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get visit counts for all guests in a single query
    const visitStats = await prisma.visit.groupBy({
      by: ['guestId'],
      where: {
        guestId: { in: guestIds },
        checkedInAt: { not: null }
      },
      _count: true
    });
    
    const recentVisitStats = await prisma.visit.groupBy({
      by: ['guestId'],
      where: {
        guestId: { in: guestIds },
        checkedInAt: { 
          not: null,
          gte: thirtyDaysAgo
        }
      },
      _count: true
    });
    
    // Get discount status for all guests
    const discounts = await prisma.discount.findMany({
      where: {
        guestId: { in: guestIds }
      },
      select: {
        guestId: true
      }
    });
    
    // Create maps for quick lookup
    const visitCountMap = new Map(visitStats.map(v => [v.guestId, v._count]));
    const recentVisitCountMap = new Map(recentVisitStats.map(v => [v.guestId, v._count]));
    const discountMap = new Set(discounts.map(d => d.guestId));
    
    // Combine data with acceptance status
    const guestsWithStats = guests.map(guest => {
      const acceptanceStatus = getGuestAcceptanceStatus(guest.acceptances);
      
      return {
        id: guest.id,
        name: guest.name,
        email: guest.email,
        country: guest.country,
        isBlacklisted: !!guest.blacklistedAt,
        hasAcceptedTerms: !!guest.termsAcceptedAt, // Legacy field
        hasValidAcceptance: acceptanceStatus.hasValidAcceptance, // New field
        acceptanceStatus: acceptanceStatus.status, // 'valid', 'expired', or 'none'
        lifetimeVisits: visitCountMap.get(guest.id) || 0,
        recentVisits: recentVisitCountMap.get(guest.id) || 0,
        hasDiscount: discountMap.has(guest.id),
        createdAt: guest.createdAt
      };
    });

    return NextResponse.json({ 
      guests: guestsWithStats,
      total: guests.length 
    });
  } catch (error) {
    console.error('Error fetching guests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}