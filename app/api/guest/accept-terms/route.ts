import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      invitationId,
      termsAccepted,
      visitorAgreementAccepted
    } = body;

    // Validate required fields
    if (!invitationId || !termsAccepted || !visitorAgreementAccepted) {
      return NextResponse.json(
        { error: 'Please accept both agreements to continue' },
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

    // Check if profile is completed
    if (!invitation.guest.profileCompleted) {
      return NextResponse.json(
        { error: 'Please complete your profile first' },
        { status: 400 }
      );
    }

    // Check if invitation is still valid
    if (invitation.status === 'EXPIRED' || invitation.status === 'CHECKED_IN') {
      return NextResponse.json(
        { error: 'This invitation is no longer valid' },
        { status: 400 }
      );
    }

    // Update guest with terms acceptance
    const updatedGuest = await prisma.guest.update({
      where: { id: invitation.guestId },
      data: {
        termsAcceptedAt: new Date(),
      },
    });

    // Create acceptance record for the invitation
    await prisma.acceptance.create({
      data: {
        guestId: invitation.guestId,
        invitationId: invitation.id,
        termsVersion: '1.0',
        visitorAgreementVersion: '1.0',
      },
    });

    return NextResponse.json({
      guest: updatedGuest,
      message: 'Terms accepted successfully. Your host will be notified.',
    });
  } catch (error) {
    console.error('Error accepting terms:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}