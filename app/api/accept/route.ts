import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAcceptanceToken } from '@/lib/acceptance-token';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      token, 
      termsAccepted, 
      visitorAgreementAccepted,
      termsVersion = '1.0',
      visitorAgreementVersion = '1.0'
    } = body;

    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: 'Acceptance token is required' },
        { status: 400 }
      );
    }

    if (!termsAccepted || !visitorAgreementAccepted) {
      return NextResponse.json(
        { error: 'Both Terms and Conditions and Visitor Agreement must be accepted' },
        { status: 400 }
      );
    }

    // Verify the acceptance token
    let tokenPayload;
    try {
      tokenPayload = await verifyAcceptanceToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid token' },
        { status: 401 }
      );
    }

    const { invitationId, guestEmail, hostId } = tokenPayload;

    // Verify the invitation exists and belongs to the token
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { guest: true, host: true },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.guest.email !== guestEmail || invitation.hostId !== hostId) {
      return NextResponse.json(
        { error: 'Token does not match invitation details' },
        { status: 403 }
      );
    }

    // Check if guest has already accepted terms (allow re-acceptance for demo purposes)
    const existingAcceptance = await prisma.acceptance.findFirst({
      where: { guestId: invitation.guestId },
      orderBy: { acceptedAt: 'desc' },
    });

    let acceptance;
    if (existingAcceptance) {
      // Update existing acceptance with new timestamp
      acceptance = await prisma.acceptance.update({
        where: { id: existingAcceptance.id },
        data: {
          termsVersion,
          visitorAgreementVersion,
          acceptedAt: new Date(),
        },
      });
    } else {
      // Create new acceptance record
      acceptance = await prisma.acceptance.create({
        data: {
          guestId: invitation.guestId,
          termsVersion,
          visitorAgreementVersion,
        },
      });
    }

    // Update guest's terms acceptance timestamp
    await prisma.guest.update({
      where: { id: invitation.guestId },
      data: {
        termsAcceptedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Terms and Visitor Agreement accepted successfully',
      acceptance,
      invitation: {
        id: invitation.id,
        hostName: invitation.host.name,
        guestName: invitation.guest.name,
        inviteDate: invitation.inviteDate,
      },
    });

  } catch (error) {
    console.error('Error processing terms acceptance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}