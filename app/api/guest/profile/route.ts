import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateFrequentVisitorMetrics, logConversionEvent } from '@/lib/analytics';

/**
 * POST /api/guest/profile
 * Update guest profile with business context during registration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      name, 
      country,
      company,
      jobTitle,
      industry,
      companySize,
      interests,
      phone,
      contactMethod,
      contactValue
    } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find or create guest
    const guest = await prisma.guest.upsert({
      where: { email },
      update: {
        name: name || undefined,
        country: country || undefined,
        company: company || undefined,
        jobTitle: jobTitle || undefined,
        industry: industry || undefined,
        companySize: companySize || undefined,
        interests: interests || [],
        phone: phone || undefined,
        contactMethod: contactMethod || undefined,
        contactValue: contactValue || undefined,
        profileCompleted: true
      },
      create: {
        email,
        name: name || null,
        country: country || null,
        company: company || null,
        jobTitle: jobTitle || null,
        industry: industry || null,
        companySize: companySize || null,
        interests: interests || [],
        phone: phone || null,
        contactMethod: contactMethod || null,
        contactValue: contactValue || null,
        profileCompleted: true
      }
    });

    // Update frequent visitor metrics if guest has visits
    const visitCount = await prisma.visit.count({
      where: { 
        guestId: guest.id,
        checkedInAt: { not: null }
      }
    });

    if (visitCount > 0) {
      await updateFrequentVisitorMetrics(guest.id);
    }

    // Log profile completion event
    await logConversionEvent(
      guest.id,
      'SURVEY_COMPLETED',
      'profile_registration',
      'success',
      {
        hasCompany: !!company,
        hasJobTitle: !!jobTitle,
        hasIndustry: !!industry,
        interestCount: interests?.length || 0
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        guestId: guest.id,
        profileCompleted: true
      }
    });

  } catch (error) {
    console.error('Error updating guest profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/guest/profile
 * Get guest profile information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const guestId = searchParams.get('id');

    if (!email && !guestId) {
      return NextResponse.json(
        { error: 'Email or guest ID is required' },
        { status: 400 }
      );
    }

    const whereClause = email ? { email } : { id: guestId };
    const guest = await prisma.guest.findUnique({
      where: whereClause,
      include: {
        frequentVisitor: true,
        visits: {
          where: { checkedInAt: { not: null } },
          include: {
            host: { select: { name: true, email: true } },
            location: { select: { name: true } }
          },
          orderBy: { checkedInAt: 'desc' },
          take: 5
        }
      }
    });

    if (!guest) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: guest.id,
        email: guest.email,
        name: guest.name,
        country: guest.country,
        company: guest.company,
        jobTitle: guest.jobTitle,
        industry: guest.industry,
        companySize: guest.companySize,
        interests: guest.interests,
        phone: guest.phone,
        contactMethod: guest.contactMethod,
        contactValue: guest.contactValue,
        profileCompleted: guest.profileCompleted,
        visitCount: guest.visits.length,
        currentTier: guest.frequentVisitor?.currentTier || 'BRONZE',
        conversionScore: guest.frequentVisitor?.conversionScore || 0,
        recentVisits: guest.visits.map(visit => ({
          date: visit.checkedInAt,
          host: visit.host.name,
          location: visit.location.name
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching guest profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}