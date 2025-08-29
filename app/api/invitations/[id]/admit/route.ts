import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAdmitGuest, shouldTriggerDiscount, checkExistingActiveVisit } from '@/lib/validations';
import { nowInLA, calculateVisitExpiration } from '@/lib/timezone';

// TODO: Replace with actual auth middleware
function getCurrentUserId(request: NextRequest): string {
  return 'mock-host-id';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hostId = getCurrentUserId(request);
    const invitationId = params.id;

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

    if (invitation.hostId !== hostId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check for existing active visit (re-entry)
    const { hasActiveVisit, activeVisit } = await checkExistingActiveVisit(
      hostId,
      invitation.guest.email
    );

    if (hasActiveVisit) {
      return NextResponse.json({
        reEntry: true,
        activeVisit,
        message: 'Guest already has an active visit. Badge can be reprinted.',
      });
    }

    // Validate business rules for new visit
    const validation = await validateAdmitGuest(
      hostId,
      invitation.guestId,
      invitation.guest.email,
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
        invitationId: invitationId,
        checkedInAt: now,
        expiresAt,
      },
      include: {
        guest: true,
      },
    });

    // Update invitation status
    await prisma.invitation.update({
      where: { id: invitationId },
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
      visit,
      discountTriggered: shouldDiscount,
      message: shouldDiscount 
        ? 'Guest checked in successfully! Discount sent (mock).' 
        : 'Guest checked in successfully!',
    });
  } catch (error) {
    console.error('Error admitting guest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}