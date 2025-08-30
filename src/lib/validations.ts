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
  currentCount?: number;
  maxCount?: number;
}

/**
 * Get current policies from database
 */
async function getPolicies() {
  const policies = await prisma.policy.findFirst({
    where: { id: 1 }
  });
  
  // Return defaults if no policies exist
  return policies || {
    guestMonthlyLimit: 3,
    hostConcurrentLimit: 3
  };
}

/**
 * Check if host has reached concurrent active guest limit (configurable)
 */
export async function validateHostConcurrentLimit(hostId: string): Promise<ValidationResult> {
  const now = nowInLA();
  const policies = await getPolicies();
  const limit = policies.hostConcurrentLimit;
  
  const activeVisitsCount = await prisma.visit.count({
    where: {
      hostId,
      checkedInAt: { not: null },
      expiresAt: { gt: now },
    },
  });

  if (activeVisitsCount >= limit) {
    return {
      isValid: false,
      error: `Host at capacity with ${activeVisitsCount} guests (max ${limit}). Security can override if needed.`,
      currentCount: activeVisitsCount,
      maxCount: limit,
    };
  }

  return { isValid: true };
}

/**
 * Check if guest has reached 30-day rolling limit (configurable)
 */
export async function validateGuestRollingLimit(guestEmail: string): Promise<ValidationResult> {
  const thirtyDaysAgo = thirtyDaysAgoInLA();
  const policies = await getPolicies();
  const limit = policies.guestMonthlyLimit;
  
  const recentVisits = await prisma.visit.findMany({
    where: {
      guest: { email: guestEmail },
      checkedInAt: { 
        not: null,
        gte: thirtyDaysAgo,
      },
    },
    orderBy: { checkedInAt: 'desc' },
    take: limit,
  });

  if (recentVisits.length >= limit) {
    const oldestRecentVisit = recentVisits[recentVisits.length - 1];
    const nextEligibleDate = calculateNextEligibleDate(oldestRecentVisit.checkedInAt!);
    
    return {
      isValid: false,
      error: `Guest has reached ${limit} visits this month. Next visit available ${nextEligibleDate.toLocaleDateString()}.`,
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
      error: "Building is closed for the night. Check-ins resume tomorrow morning.",
    };
  }

  return { isValid: true };
}

/**
 * Check if guest is blacklisted
 */
export async function validateGuestBlacklist(guestEmail: string): Promise<ValidationResult> {
  const guest = await prisma.guest.findUnique({
    where: { email: guestEmail },
    select: { blacklistedAt: true }
  });

  if (guest?.blacklistedAt) {
    return {
      isValid: false,
      error: "Guest is not authorized for building access. Contact security for assistance.",
    };
  }

  return { isValid: true };
}

/**
 * Check if guest has accepted terms and visitor agreement
 * For returning guests, acceptance is valid if within the last 365 days
 */
export async function validateGuestAcceptance(guestId: string): Promise<ValidationResult> {
  const acceptance = await prisma.acceptance.findFirst({
    where: { guestId },
    orderBy: { acceptedAt: 'desc' },
  });

  if (!acceptance) {
    return {
      isValid: false,
      error: "Guest needs to accept visitor terms before check-in. Email will be sent.",
    };
  }

  // Check if acceptance is within last 365 days (annual renewal)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  if (acceptance.acceptedAt < oneYearAgo) {
    return {
      isValid: false,
      error: "Guest's visitor agreement has expired. New terms acceptance required.",
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
      error: "This QR code has expired. Please generate a new invitation.",
    };
  }

  return { isValid: true };
}

/**
 * Check if guest already has an active visit (for re-entry detection)
 * Enhanced to handle cross-host scenarios
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
    host: {
      id: string;
      name: string;
      email: string;
    };
  };
  crossHostVisit?: boolean;
}> {
  const now = nowInLA();
  
  // Check for active visit with the same host first
  const sameHostActiveVisit = await prisma.visit.findFirst({
    where: {
      hostId,
      guest: { email: guestEmail },
      checkedInAt: { not: null },
      expiresAt: { gt: now },
    },
    include: {
      guest: true,
      host: true,
    },
  });

  if (sameHostActiveVisit) {
    return {
      hasActiveVisit: true,
      activeVisit: sameHostActiveVisit,
      crossHostVisit: false,
    };
  }

  // Check for active visit with a different host
  const crossHostActiveVisit = await prisma.visit.findFirst({
    where: {
      hostId: { not: hostId },
      guest: { email: guestEmail },
      checkedInAt: { not: null },
      expiresAt: { gt: now },
    },
    include: {
      guest: true,
      host: true,
    },
  });

  return {
    hasActiveVisit: !!crossHostActiveVisit,
    activeVisit: crossHostActiveVisit || undefined,
    crossHostVisit: !!crossHostActiveVisit,
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
 * Check if user can override capacity limits
 */
export function canUserOverride(userRole?: string): boolean {
  return userRole === 'security' || userRole === 'admin';
}

/**
 * Enhanced validation for admitting returning guests
 * Handles cross-host scenarios and expired acceptance gracefully
 */
export async function validateAdmitGuestWithRenewal(
  hostId: string,
  guestId: string,
  guestEmail: string,
  qrExpiresAt: Date | null
): Promise<ValidationResult & { requiresAcceptanceRenewal?: boolean }> {
  // Check if guest is blacklisted (early check)
  const blacklistResult = await validateGuestBlacklist(guestEmail);
  if (!blacklistResult.isValid) {
    return blacklistResult;
  }

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

  // Check if guest has recent accepted terms
  const acceptanceResult = await validateGuestAcceptance(guestId);
  if (!acceptanceResult.isValid) {
    // For returning guests, check if they had previous acceptance (expired)
    const hasAnyAcceptance = await prisma.acceptance.findFirst({
      where: { guestId },
    });

    if (hasAnyAcceptance) {
      // Return indication that acceptance renewal is needed
      return {
        isValid: false,
        error: acceptanceResult.error,
        requiresAcceptanceRenewal: true
      };
    } else {
      // First-time guest, full acceptance required
      return acceptanceResult;
    }
  }

  return { isValid: true };
}

/**
 * Comprehensive validation for admitting a guest (check-in)
 * Legacy function - maintained for backward compatibility
 */
export async function validateAdmitGuest(
  hostId: string,
  guestId: string,
  guestEmail: string,
  qrExpiresAt: Date | null
): Promise<ValidationResult> {
  // Use the enhanced validation but ignore renewal flag for backward compatibility
  const result = await validateAdmitGuestWithRenewal(hostId, guestId, guestEmail, qrExpiresAt);
  return {
    isValid: result.isValid,
    error: result.error,
    nextEligibleDate: result.nextEligibleDate,
    currentCount: result.currentCount,
    maxCount: result.maxCount
  };
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

/**
 * Auto-renew terms acceptance for returning guests
 * Creates a new acceptance record with current timestamp and versions
 */
export async function renewGuestAcceptance(
  guestId: string,
  termsVersion: string = "1.0",
  visitorAgreementVersion: string = "1.0"
): Promise<void> {
  await prisma.acceptance.create({
    data: {
      guestId,
      termsVersion,
      visitorAgreementVersion,
    },
  });
}

/**
 * Handle returning guest scenarios with automatic acceptance renewal
 * This function is designed for QR-based check-ins where guests shouldn't 
 * need to manually re-accept terms for each visit
 */
export async function processReturningGuestCheckIn(
  hostId: string,
  guestId: string,
  guestEmail: string,
  qrExpiresAt: Date | null
): Promise<ValidationResult & { acceptanceRenewed?: boolean }> {
  const validation = await validateAdmitGuestWithRenewal(hostId, guestId, guestEmail, qrExpiresAt);
  
  // If guest needs acceptance renewal (returning guest with expired terms)
  if (!validation.isValid && validation.requiresAcceptanceRenewal) {
    try {
      // Auto-renew acceptance for returning guests using QR codes
      await renewGuestAcceptance(guestId);
      
      // Re-validate after renewal
      const revalidation = await validateAdmitGuestWithRenewal(hostId, guestId, guestEmail, qrExpiresAt);
      
      return {
        ...revalidation,
        acceptanceRenewed: true
      };
    } catch (error) {
      return {
        isValid: false,
        error: "Unable to process guest terms update. Technical support needed."
      };
    }
  }
  
  return validation;
}