import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ContactMethod } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      invitationId,
      name, 
      country, 
      contactMethod, 
      contactValue
    } = body;

    // Validate required fields
    if (!invitationId || !name || !country || !contactMethod || !contactValue) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get invitation to find guest
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { guest: true },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation is still valid
    if (invitation.status === 'EXPIRED' || invitation.status === 'CHECKED_IN') {
      return NextResponse.json(
        { error: 'This invitation is no longer valid' },
        { status: 400 }
      );
    }

    // Map contactMethod string to enum value
    const contactMethodEnum = contactMethod.toUpperCase() as ContactMethod;

    // Update guest profile
    const updatedGuest = await prisma.guest.update({
      where: { id: invitation.guestId },
      data: {
        name,
        country,
        contactMethod: contactMethodEnum,
        contactValue,
        profileCompleted: true,
      },
    });

    return NextResponse.json({
      guest: updatedGuest,
      message: 'Profile completed successfully',
    });
  } catch (error) {
    console.error('Error completing guest profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}