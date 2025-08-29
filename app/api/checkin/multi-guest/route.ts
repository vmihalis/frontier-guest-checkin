import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAdmitGuest, shouldTriggerDiscount, checkExistingActiveVisit } from '@/lib/validations';
import { nowInLA, calculateVisitExpiration } from '@/lib/timezone';
import { sendDiscountEmail } from '@/lib/email';
import type { MultiGuestData } from '@/lib/qr-token';

// TODO: Replace with actual auth middleware
async function getCurrentUserId(_request: NextRequest): Promise<string> {
  // Mock implementation - in production, get from auth session
  // For development, use the first host user from the database
  const hostUser = await prisma.user.findFirst({
    where: { role: 'host' },
    select: { id: true }
  });
  
  if (!hostUser) {
    throw new Error('No host user found in database. Run npm run db:seed first.');
  }
  
  return hostUser.id;
}

export async function POST(request: NextRequest) {
  try {
    const { guest }: { guest: MultiGuestData } = await request.json();

    if (!guest || !guest.e || !guest.n) {
      return NextResponse.json(
        { error: 'Guest email and name are required' },
        { status: 400 }
      );
    }

    const hostId = await getCurrentUserId(request);

    // Find or create the guest
    let guestRecord = await prisma.guest.findUnique({
      where: { email: guest.e }
    });

    if (!guestRecord) {
      // For multi-guest QR codes, we might not have all the required info
      // Create a basic guest record that can be updated later
      guestRecord = await prisma.guest.create({
        data: {
          email: guest.e,
          name: guest.n,
          country: 'Unknown', // Default value - can be updated later
          contactMethod: null,
          contactValue: null,
        }
      });

      // Create basic acceptance record for terms
      await prisma.acceptance.create({
        data: {
          guestId: guestRecord.id,
          termsVersion: '1.0',
          visitorAgreementVersion: '1.0',
        },
      });
    } else {
      // Update name in case it's different
      if (guestRecord.name !== guest.n) {
        await prisma.guest.update({
          where: { id: guestRecord.id },
          data: { name: guest.n }
        });
        guestRecord.name = guest.n;
      }
    }

    // Check for existing active visit (re-entry)
    const { hasActiveVisit, activeVisit } = await checkExistingActiveVisit(
      hostId,
      guest.e
    );

    if (hasActiveVisit) {
      return NextResponse.json({
        success: true,
        reEntry: true,
        visit: activeVisit,
        guest: guestRecord,
        message: 'Welcome back! Your existing visit is still active.',
      });
    }

    // Validate business rules for new visit
    const validation = await validateAdmitGuest(
      hostId,
      guestRecord.id,
      guest.e,
      null // Multi-guest QRs don't have expiration tokens
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
        guestId: guestRecord.id,
        hostId,
        invitationId: null, // Multi-guest QRs don't have specific invitation IDs
        checkedInAt: now,
        expiresAt,
      },
      include: {
        guest: true,
        host: true,
      },
    });

    // Check if discount should be triggered and send email
    const shouldDiscount = await shouldTriggerDiscount(guestRecord.id);
    let discountEmailSent = false;
    
    if (shouldDiscount) {
      // Create discount record first (for idempotency)
      const discount = await prisma.discount.create({
        data: {
          guestId: guestRecord.id,
          emailSent: false,
        },
      });

      // Send discount email (non-blocking - don't fail check-in if email fails)
      try {
        const emailResult = await sendDiscountEmail(
          guestRecord.email,
          guestRecord.name
        );
        
        if (emailResult.success) {
          // Update discount record to mark email as sent
          await prisma.discount.update({
            where: { id: discount.id },
            data: {
              emailSent: true,
              sentAt: nowInLA(),
            },
          });
          discountEmailSent = true;
          console.log(`Discount email sent successfully: ${emailResult.messageId}`);
        } else {
          console.error('Failed to send discount email:', emailResult.error);
          // TODO: Queue for retry in background job system
        }
      } catch (error) {
        console.error('Email service error during discount trigger:', error);
        // TODO: Queue for retry in background job system
      }
    }

    return NextResponse.json({
      success: true,
      visit,
      guest: guestRecord,
      host: visit.host,
      discountTriggered: shouldDiscount,
      discountEmailSent,
      message: shouldDiscount 
        ? `Check-in successful! Discount earned (3rd lifetime visit).${discountEmailSent ? ' Check your email!' : ''}` 
        : 'Check-in successful! Welcome to Frontier Tower.',
    });
  } catch (error) {
    console.error('Error processing multi-guest check-in:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}