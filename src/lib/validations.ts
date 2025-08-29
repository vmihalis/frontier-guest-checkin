/**
 * Business rule validations for guest invitation system
 * All validations enforce the domain constraints
 */

import { prisma } from "@/lib/prisma";
import { nowInLA, thirtyDaysAgoInLA, isAfterCutoff, calculateNextEligibleDate } from "@/lib/timezone";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  nextEligibleDate?: Date;
}

/**
 * Check if host has reached concurrent active guest limit (3)
 */
export async function validateHostConcurrentLimit(hostId: string): Promise<ValidationResult> {
  const now = nowInLA();
  
  const activeVisitsCount = await prisma.visit.count({
    where: {
      hostId,
      checkedInAt: { not: null },
      expiresAt: { gt: now },
    },
  });

  if (activeVisitsCount >= 3) {
    return {
      isValid: false,
      error: "Host concurrent limit reached (3).",
    };
  }

  return { isValid: true };
}

/**
 * Check if guest has reached 30-day rolling limit (3 visits)
 */
export async function validateGuestRollingLimit(guestEmail: string): Promise<ValidationResult> {
  const thirtyDaysAgo = thirtyDaysAgoInLA();
  
  const recentVisits = await prisma.visit.findMany({
    where: {
      guest: { email: guestEmail },
      checkedInAt: { 
        not: null,
        gte: thirtyDaysAgo,
      },
    },
    orderBy: { checkedInAt: 'desc' },
    take: 3,
  });

  if (recentVisits.length >= 3) {
    const oldestRecentVisit = recentVisits[recentVisits.length - 1];
    const nextEligibleDate = calculateNextEligibleDate(oldestRecentVisit.checkedInAt!);
    
    return {
      isValid: false,
      error: `Guest reached 3 visits in last 30 days. Next eligible on ${nextEligibleDate.toLocaleDateString()}.`,
      nextEligibleDate,
    };
  }

  return { isValid: true };
}

/**
 * Check if current time is after 11:59 PM cutoff
 */
export function validateTimeCutoff(): ValidationResult {
  if (isAfterCutoff()) {
    return {
      isValid: false,
      error: "Entries closed after 11:59 PM.",
    };
  }

  return { isValid: true };
}

/**
 * Check if guest has accepted terms and visitor agreement
 */
export async function validateGuestAcceptance(guestId: string): Promise<ValidationResult> {
  const acceptance = await prisma.acceptance.findFirst({
    where: { guestId },
    orderBy: { acceptedAt: 'desc' },
  });

  if (!acceptance) {
    return {
      isValid: false,
      error: "Guest must accept Terms & Visitor Agreement before activation.",
    };
  }

  return { isValid: true };
}

/**
 * Check if QR token is valid and not expired
 * For multi-guest QRs, qrExpiresAt can be null (no expiration check needed)
 */
export function validateQRToken(qrExpiresAt: Date | null): ValidationResult {
  // Multi-guest QRs don't have expiration dates - allow null
  if (!qrExpiresAt) {
    return { isValid: true };
  }

  const now = nowInLA();
  if (now > qrExpiresAt) {
    return {
      isValid: false,
      error: "QR code has expired. Please regenerate.",
    };
  }

  return { isValid: true };
}

/**
 * Check if guest already has an active visit (for re-entry detection)
 */
export async function checkExistingActiveVisit(hostId: string, guestEmail: string): Promise<{
  hasActiveVisit: boolean;
  activeVisit?: {
    id: string;
    checkedInAt: Date | null;
    expiresAt: Date | null;
    guest: {
      id: string;
      name: string;
      email: string;
    };
  };
}> {
  const now = nowInLA();
  
  const activeVisit = await prisma.visit.findFirst({
    where: {
      hostId,
      guest: { email: guestEmail },
      checkedInAt: { not: null },
      expiresAt: { gt: now },
    },
    include: {
      guest: true,
    },
  });

  return {
    hasActiveVisit: !!activeVisit,
    activeVisit: activeVisit || undefined,
  };
}

/**
 * Comprehensive validation for creating an invitation
 */
export async function validateCreateInvitation(
  hostId: string,
  guestEmail: string
): Promise<ValidationResult> {
  // Check guest rolling limit
  const rollingLimitResult = await validateGuestRollingLimit(guestEmail);
  if (!rollingLimitResult.isValid) {
    return rollingLimitResult;
  }

  return { isValid: true };
}

/**
 * Comprehensive validation for activating QR code
 */
export async function validateActivateQR(
  hostId: string,
  guestId: string,
  guestEmail: string
): Promise<ValidationResult> {
  // Check if guest has accepted terms
  const acceptanceResult = await validateGuestAcceptance(guestId);
  if (!acceptanceResult.isValid) {
    return acceptanceResult;
  }

  // Check guest rolling limit
  const rollingLimitResult = await validateGuestRollingLimit(guestEmail);
  if (!rollingLimitResult.isValid) {
    return rollingLimitResult;
  }

  return { isValid: true };
}

/**
 * Comprehensive validation for admitting a guest (check-in)
 */
export async function validateAdmitGuest(
  hostId: string,
  guestId: string,
  guestEmail: string,
  qrExpiresAt: Date | null
): Promise<ValidationResult> {
  // Check time cutoff
  const timeCutoffResult = validateTimeCutoff();
  if (!timeCutoffResult.isValid) {
    return timeCutoffResult;
  }

  // Check QR token validity
  const qrTokenResult = validateQRToken(qrExpiresAt);
  if (!qrTokenResult.isValid) {
    return qrTokenResult;
  }

  // Check host concurrent limit
  const concurrentLimitResult = await validateHostConcurrentLimit(hostId);
  if (!concurrentLimitResult.isValid) {
    return concurrentLimitResult;
  }

  // Check guest rolling limit
  const rollingLimitResult = await validateGuestRollingLimit(guestEmail);
  if (!rollingLimitResult.isValid) {
    return rollingLimitResult;
  }

  // Check if guest has accepted terms
  const acceptanceResult = await validateGuestAcceptance(guestId);
  if (!acceptanceResult.isValid) {
    return acceptanceResult;
  }

  return { isValid: true };
}

/**
 * Get guest statistics for history display
 */
export async function getGuestStats(guestEmail: string) {
  const thirtyDaysAgo = thirtyDaysAgoInLA();
  
  const [recentVisits, lifetimeVisits, lastVisit, discount] = await Promise.all([
    prisma.visit.count({
      where: {
        guest: { email: guestEmail },
        checkedInAt: { 
          not: null,
          gte: thirtyDaysAgo,
        },
      },
    }),
    prisma.visit.count({
      where: {
        guest: { email: guestEmail },
        checkedInAt: { not: null },
      },
    }),
    prisma.visit.findFirst({
      where: {
        guest: { email: guestEmail },
        checkedInAt: { not: null },
      },
      orderBy: { checkedInAt: 'desc' },
    }),
    prisma.discount.findFirst({
      where: {
        guest: { email: guestEmail },
      },
      orderBy: { triggeredAt: 'desc' },
    }),
  ]);

  return {
    recentVisits,
    lifetimeVisits,
    lastVisitDate: lastVisit?.checkedInAt,
    hasDiscount: !!discount,
  };
}

/**
 * Check if guest should receive discount (3rd lifetime visit)
 */
export async function shouldTriggerDiscount(guestId: string): Promise<boolean> {
  const [lifetimeVisits, existingDiscount] = await Promise.all([
    prisma.visit.count({
      where: {
        guestId,
        checkedInAt: { not: null },
      },
    }),
    prisma.discount.findFirst({
      where: { guestId },
    }),
  ]);

  return lifetimeVisits === 3 && !existingDiscount;
}