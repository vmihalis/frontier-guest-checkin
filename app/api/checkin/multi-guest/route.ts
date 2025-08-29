import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { validateAdmitGuest, shouldTriggerDiscount, checkExistingActiveVisit } from '@/lib/validations';
import { nowInLA, calculateVisitExpiration } from '@/lib/timezone';
import { sendDiscountEmail } from '@/lib/email';
import type { MultiGuestData } from '@/lib/qr-token';

export async function POST(request: NextRequest) {
  try {
    const { guest, overrideReason, overridePassword }: { guest: MultiGuestData; overrideReason?: string; overridePassword?: string } = await request.json();

    if (!guest || !guest.e || !guest.n) {
      return NextResponse.json(
        { error: 'Guest email and name are required' },
        { status: 400 }
      );
    }

    // For QR scanner - use first available host (hackathon mode)
    let hostId: string;
    try {
      hostId = await getCurrentUserId(request);
    } catch {
      // No authentication - use first host user for QR scanner
      const hostUser = await prisma.user.findFirst({
        where: { role: 'host' },
        select: { id: true }
      });
      
      if (!hostUser) {
        return NextResponse.json(
          { error: 'No host user found in database. Run npm run db:seed first.' },
          { status: 500 }
        );
      }
      
      hostId = hostUser.id;
    }

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
      // Check if this is a capacity limit error
      if (validation.error?.includes('concurrent limit')) {
        // Get current count for UI display
        const activeVisitsCount = await prisma.visit.count({
          where: {
            hostId,
            checkedInAt: { not: null },
            expiresAt: { gt: nowInLA() },
          },
        });

        // If override reason provided, validate password first
        if (overrideReason) {
          // Validate override password
          const expectedPassword = process.env.OVERRIDE_PASSWORD || 'meow';
          if (overridePassword !== expectedPassword) {
            return NextResponse.json(
              { 
                error: 'Incorrect password',
                passwordError: true
              },
              { status: 401 }
            );
          }
          // Password correct, proceed with check-in despite limit
          // Continue to create visit with override data
        } else {
          // Always allow override - security will decide at their discretion
          return NextResponse.json(
            { 
              error: validation.error,
              requiresOverride: true,
              canOverride: true, // Always allow override
              currentCount: activeVisitsCount,
              maxCount: 3
            },
            { status: 409 } // Conflict status
          );
        }
      } else {
        // Other validation errors cannot be overridden
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    const now = nowInLA();
    const expiresAt = calculateVisitExpiration(now);

    // Get override user ID if override is being applied
    let overrideUserId: string | null = null;
    if (overrideReason) {
      try {
        overrideUserId = await getCurrentUserId(request);
      } catch {
        // In QR scanner mode without auth, we'll track as system override
        const securityUser = await prisma.user.findFirst({
          where: { role: 'security' },
          select: { id: true }
        });
        overrideUserId = securityUser?.id || null;
      }
    }

    // Create new visit
    const visit = await prisma.visit.create({
      data: {
        guestId: guestRecord.id,
        hostId,
        invitationId: null, // Multi-guest QRs don't have specific invitation IDs
        checkedInAt: now,
        expiresAt,
        overrideReason,
        overrideBy: overrideUserId,
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
        : overrideReason
        ? 'Check-in successful with override! Welcome to Frontier Tower.'
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