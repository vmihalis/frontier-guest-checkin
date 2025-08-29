import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGuestStats } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const showBlacklisted = searchParams.get('blacklisted') === 'true';

    const whereClause: {
      AND: Array<{
        OR?: Array<{ name?: { contains: string; mode: 'insensitive' } } | { email?: { contains: string; mode: 'insensitive' } }>;
        blacklistedAt?: { not: null };
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
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to 100 guests for performance
    });

    // Get stats for each guest
    const guestsWithStats = await Promise.all(
      guests.map(async (guest) => {
        const stats = await getGuestStats(guest.email);
        return {
          ...guest,
          ...stats,
          isBlacklisted: !!guest.blacklistedAt,
          hasAcceptedTerms: !!guest.termsAcceptedAt
        };
      })
    );

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