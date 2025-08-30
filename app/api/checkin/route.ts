import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { validateAdmitGuest, shouldTriggerDiscount, checkExistingActiveVisit, processReturningGuestCheckIn } from '@/lib/validations';
import { nowInLA, calculateVisitExpiration } from '@/lib/timezone';
import { sendDiscountEmail } from '@/lib/email';
import { validateQRToken } from '@/lib/qr-token';
import type { GuestData } from '@/lib/qr-token';

interface CheckInRequest {
  // For single guest via QR token (legacy)
  token?: string;
  // For single/batch guest via direct guest data
  guest?: GuestData;
  guests?: GuestData[];
  // Override parameters
  overrideReason?: string;
  overridePassword?: string;
}

/**
 * Unified Check-In API
 * 
 * Handles both single and multiple guest check-ins through one endpoint.
 * Supports:
 * - Single guest via QR token: { token: "..." }
 * - Single guest via data: { guest: { e: "email", n: "name" } }
 * - Multiple guests: { guests: [{ e: "email", n: "name" }, ...] }
 */
export async function POST(request: NextRequest) {
  try {
    const body: CheckInRequest = await request.json();
    const { token, guest, guests, overrideReason, overridePassword } = body;

    // Parse and normalize input to array of guests
    let guestList: GuestData[] = [];

    if (token) {
      // Handle legacy QR token format
      const tokenValidation = validateQRToken(token);
      if (!tokenValidation.isValid || !tokenValidation.data) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Invalid QR code format',
            error: tokenValidation.error
          },
          { status: 400 }
        );
      }

      const { guestEmail } = tokenValidation.data;
      const guestRecord = await prisma.guest.findUnique({
        where: { email: guestEmail },
        select: { name: true, email: true }
      });

      if (!guestRecord) {
        return NextResponse.json(
          { 
            success: false,
            message: `Guest ${guestEmail} not found in database`,
            guestEmail
          },
          { status: 404 }
        );
      }

      guestList = [{ e: guestRecord.email, n: guestRecord.name }];
    } else if (guest) {
      // Single guest direct format
      guestList = [guest];
    } else if (guests && guests.length > 0) {
      // Multiple guests format
      guestList = guests;
    } else {
      return NextResponse.json(
        { 
          success: false,
          message: 'No guest data provided. Include either token, guest, or guests in request.'
        },
        { status: 400 }
      );
    }

    // Validate guest data
    for (const g of guestList) {
      if (!g || !g.e || !g.n) {
        return NextResponse.json(
          { 
            success: false,
            message: 'All guests must have email (e) and name (n) fields',
            invalidGuest: g
          },
          { status: 400 }
        );
      }
    }

    // Get host ID
    let hostId: string;
    try {
      hostId = await getCurrentUserId(request);
    } catch {
      // No authentication - find a demo host for QR scanner
      const hostUser = await prisma.user.findFirst({
        where: { role: 'host' },
        select: { id: true, email: true, name: true },
        orderBy: { email: 'asc' }
      });
      
      if (!hostUser) {
        return NextResponse.json(
          { 
            success: false,
            message: 'No host found in database. Please run database seeding.'
          },
          { status: 500 }
        );
      }
      
      console.log('Using demo host for check-in:', hostUser.email);
      hostId = hostUser.id;
    }
    
    // Validate hostId is a string
    if (!hostId || typeof hostId !== 'string') {
      console.error('Invalid host ID:', { hostId, type: typeof hostId });
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid host ID. Please contact support.'
        },
        { status: 500 }
      );
    }

    // Process each guest check-in
    const results = [];
    const now = nowInLA();

    for (const guestData of guestList) {
      try {
        const result = await processGuestCheckIn({
          guest: guestData,
          hostId,
          overrideReason,
          overridePassword,
          now
        });
        results.push(result);
      } catch (error) {
        console.error(`Error processing guest ${guestData.e}:`, error);
        results.push({
          success: false,
          message: `Check-in failed for ${guestData.n}`,
          guestEmail: guestData.e,
          guestName: guestData.n,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Determine overall success
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const overallSuccess = successCount === totalCount;

    const responseMessage = totalCount === 1
      ? (overallSuccess ? `${results[0].guestName} checked in successfully` : results[0].message)
      : `${successCount}/${totalCount} guests checked in successfully`;

    return NextResponse.json({
      success: overallSuccess,
      message: responseMessage,
      results,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      }
    }, { 
      status: overallSuccess ? 200 : (successCount > 0 ? 207 : 400) // 207 = partial success
    });

  } catch (error) {
    console.error('Check-in API error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'System error during check-in. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process individual guest check-in
 */
async function processGuestCheckIn({
  guest,
  hostId,
  overrideReason,
  overridePassword,
  now
}: {
  guest: GuestData;
  hostId: string;
  overrideReason?: string;
  overridePassword?: string;
  now: Date;
}) {
  // Validate host exists before processing
  const hostExists = await prisma.user.findUnique({
    where: { id: hostId },
    select: { id: true }
  });
  
  if (!hostExists) {
    console.error('Host not found in processGuestCheckIn:', { hostId });
    return {
      success: false,
      message: `Invalid host ID. Cannot process check-in.`,
      guestEmail: guest.e,
      guestName: guest.n,
      reason: 'invalid-host'
    };
  }
  
  // Find or create guest record
  const guestRecord = await prisma.guest.upsert({
    where: { email: guest.e },
    update: {
      name: guest.n,
    },
    create: {
      email: guest.e,
      name: guest.n,
      country: 'US', // Default for guest batch QRs
    },
  });

  // Check for blacklist
  if (guestRecord.blacklistedAt) {
    return {
      success: false,
      message: `${guest.n} is on the blacklist and cannot be checked in`,
      guestEmail: guest.e,
      guestName: guest.n,
      reason: 'blacklisted'
    };
  }

  // Check for existing active visit (re-entry and cross-host detection)
  const { hasActiveVisit, activeVisit, crossHostVisit } = await checkExistingActiveVisit(hostId, guest.e);
  if (hasActiveVisit && activeVisit) {
    if (crossHostVisit) {
      return {
        success: true,
        message: `${guest.n} is already checked in with ${activeVisit.host.name}`,
        guestEmail: guest.e,
        guestName: guest.n,
        visitId: activeVisit.id,
        checkedInAt: activeVisit.checkedInAt,
        expiresAt: activeVisit.expiresAt,
        reason: 'cross-host-active',
        currentHost: activeVisit.host.name
      };
    } else {
      return {
        success: true,
        message: `${guest.n} is already checked in`,
        guestEmail: guest.e,
        guestName: guest.n,
        visitId: activeVisit.id,
        checkedInAt: activeVisit.checkedInAt,
        expiresAt: activeVisit.expiresAt,
        reason: 're-entry'
      };
    }
  }

  // Use enhanced validation for returning guests with automatic acceptance renewal
  const validation = await processReturningGuestCheckIn(hostId, guestRecord.id, guest.e, null);
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.error || `Cannot check in ${guest.n} - capacity or policy limits exceeded`,
      guestEmail: guest.e,
      guestName: guest.n,
      reason: 'policy-violation',
      details: validation.error
    };
  }

  // Handle override if needed
  let overrideUserId: string | null = null;
  // Note: Override logic should be handled at capacity validation level
  // For now, we'll use the override parameters if provided
  if (overrideReason || overridePassword) {
    const securityUser = await prisma.user.findFirst({
      where: { role: 'security' },
      select: { id: true },
      orderBy: { email: 'asc' }
    });
    overrideUserId = securityUser?.id || null;
  }

  // Create visit record
  const expiresAt = calculateVisitExpiration(now);
  const visit = await prisma.visit.create({
    data: {
      guestId: guestRecord.id,
      hostId,
      invitationId: null, // QR codes don't have specific invitation IDs
      checkedInAt: now,
      expiresAt,
      overrideReason: overrideReason || null,
      overrideBy: overrideUserId,
    },
  });

  // Check for discount eligibility
  const shouldSendDiscount = await shouldTriggerDiscount(guestRecord.id);
  if (shouldSendDiscount) {
    try {
      await sendDiscountEmail(guest.e, guest.n);
    } catch (emailError) {
      console.error('Discount email failed:', emailError);
      // Don't fail check-in for email issues
    }
  }

  // Include acceptance renewal information in response
  let message = `${guest.n} checked in successfully`;
  if (validation.acceptanceRenewed) {
    message += ' (terms acceptance renewed)';
  }

  return {
    success: true,
    message,
    guestEmail: guest.e,
    guestName: guest.n,
    visitId: visit.id,
    checkedInAt: visit.checkedInAt,
    expiresAt: visit.expiresAt,
    discountSent: shouldSendDiscount,
    acceptanceRenewed: validation.acceptanceRenewed || false
  };
}