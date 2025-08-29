import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateQRToken } from '@/lib/qr-token';
import { validateAdmitGuest, shouldTriggerDiscount, checkExistingActiveVisit } from '@/lib/validations';
import { nowInLA, calculateVisitExpiration } from '@/lib/timezone';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'QR token is required' },
        { status: 400 }
      );
    }

    // Validate and decode QR token
    const tokenValidation = validateQRToken(token);
    if (!tokenValidation.isValid || !tokenValidation.data) {
      return NextResponse.json(
        { error: tokenValidation.error || 'Invalid QR token' },
        { status: 400 }
      );
    }

    const { inviteId, guestEmail, hostId } = tokenValidation.data;

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id: inviteId },
      include: { guest: true },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.guest.email !== guestEmail) {
      return NextResponse.json(
        { error: 'Token does not match guest email' },
        { status: 400 }
      );
    }

    // Check for existing active visit (re-entry)
    const { hasActiveVisit, activeVisit } = await checkExistingActiveVisit(
      hostId,
      guestEmail
    );

    if (hasActiveVisit) {
      return NextResponse.json({
        success: true,
        reEntry: true,
        visit: activeVisit,
        guest: invitation.guest,
        message: 'Welcome back! Your existing visit is still active.',
      });
    }

    // Validate business rules for new visit
    const validation = await validateAdmitGuest(
      hostId,
      invitation.guestId,
      guestEmail,
      invitation.qrExpiresAt
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const now = nowInLA();
    const expiresAt = calculateVisitExpiration(now);

    // Create new visit
    const visit = await prisma.visit.create({
      data: {
        guestId: invitation.guestId,
        hostId,
        invitationId: inviteId,
        checkedInAt: now,
        expiresAt,
      },
      include: {
        guest: true,
        host: true,
      },
    });

    // Update invitation status
    await prisma.invitation.update({
      where: { id: inviteId },
      data: { status: 'CHECKED_IN' },
    });

    // Check if discount should be triggered
    const shouldDiscount = await shouldTriggerDiscount(invitation.guestId);
    if (shouldDiscount) {
      await prisma.discount.create({
        data: {
          guestId: invitation.guestId,
          emailSent: false, // Mock implementation
        },
      });
    }

    return NextResponse.json({
      success: true,
      visit,
      guest: invitation.guest,
      host: visit.host,
      discountTriggered: shouldDiscount,
      message: shouldDiscount 
        ? 'Check-in successful! Discount earned (3rd lifetime visit).' 
        : 'Check-in successful! Welcome to BerlinHouse.',
    });
  } catch (error) {
    console.error('Error processing check-in:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}