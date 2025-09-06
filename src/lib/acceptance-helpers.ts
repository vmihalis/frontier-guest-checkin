/**
 * Helper functions for working with visit-scoped acceptances
 * Provides utilities to check acceptance validity and status
 */

import type { Acceptance } from '@prisma/client';

export interface AcceptanceStatus {
  hasValidAcceptance: boolean;
  status: 'valid' | 'expired' | 'none';
  type?: 'visit-scoped' | 'invitation-scoped' | 'general';
  expiresAt?: Date | null;
  acceptedAt?: Date;
  termsVersion?: string;
  daysUntilExpiry?: number;
  isExpired?: boolean;
}

/**
 * Get the current acceptance status for a guest
 * Checks all acceptances and returns the most relevant valid one
 */
export function getGuestAcceptanceStatus(
  acceptances: Acceptance[],
  referenceDate: Date = new Date()
): AcceptanceStatus {
  if (!acceptances || acceptances.length === 0) {
    return {
      hasValidAcceptance: false,
      status: 'none'
    };
  }

  // Sort by acceptedAt desc to get most recent first
  const sortedAcceptances = [...acceptances].sort(
    (a, b) => b.acceptedAt.getTime() - a.acceptedAt.getTime()
  );

  // Find the first valid acceptance
  for (const acceptance of sortedAcceptances) {
    const isValid = isAcceptanceValid(acceptance, referenceDate);
    
    if (isValid) {
      const type = getAcceptanceType(acceptance);
      const daysUntilExpiry = acceptance.expiresAt 
        ? Math.ceil((acceptance.expiresAt.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      return {
        hasValidAcceptance: true,
        status: 'valid',
        type,
        expiresAt: acceptance.expiresAt,
        acceptedAt: acceptance.acceptedAt,
        termsVersion: acceptance.termsVersion,
        daysUntilExpiry,
        isExpired: false
      };
    }
  }

  // No valid acceptance found - return the most recent expired one for context
  const mostRecent = sortedAcceptances[0];
  if (mostRecent) {
    const type = getAcceptanceType(mostRecent);
    
    return {
      hasValidAcceptance: false,
      status: 'expired',
      type,
      expiresAt: mostRecent.expiresAt,
      acceptedAt: mostRecent.acceptedAt,
      termsVersion: mostRecent.termsVersion,
      daysUntilExpiry: 0,
      isExpired: true
    };
  }

  return {
    hasValidAcceptance: false,
    status: 'none'
  };
}

/**
 * Check if a specific acceptance is currently valid
 */
export function isAcceptanceValid(
  acceptance: Acceptance,
  referenceDate: Date = new Date()
): boolean {
  // If no expiration date, check if it's recent (within 365 days for legacy)
  if (!acceptance.expiresAt) {
    const oneYearAgo = new Date(referenceDate);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return acceptance.acceptedAt > oneYearAgo;
  }

  // Check if not expired
  return acceptance.expiresAt > referenceDate;
}

/**
 * Determine the type of acceptance based on its associations
 */
export function getAcceptanceType(acceptance: Acceptance): AcceptanceStatus['type'] {
  if (acceptance.visitId) {
    return 'visit-scoped';
  }
  if (acceptance.invitationId) {
    return 'invitation-scoped';
  }
  return 'general';
}

/**
 * Get a human-readable description of the acceptance status
 */
export function getAcceptanceStatusDescription(status: AcceptanceStatus): string {
  if (status.status === 'none') {
    return 'No terms acceptance on record';
  }

  if (status.status === 'expired') {
    if (status.expiresAt) {
      return `Terms expired on ${new Date(status.expiresAt).toLocaleDateString()}`;
    }
    return 'Terms acceptance has expired';
  }

  if (status.status === 'valid') {
    if (status.type === 'visit-scoped' && status.daysUntilExpiry !== undefined) {
      if (status.daysUntilExpiry === 0) {
        return 'Terms valid until end of today';
      } else if (status.daysUntilExpiry === 1) {
        return 'Terms valid for 1 more day';
      } else if (status.daysUntilExpiry > 1) {
        return `Terms valid for ${status.daysUntilExpiry} more days`;
      }
    }
    
    if (status.type === 'invitation-scoped') {
      return 'Terms accepted for upcoming visit';
    }
    
    return `Terms accepted (v${status.termsVersion || '1.0'})`;
  }

  return 'Unknown acceptance status';
}

/**
 * Get acceptance status badge color based on status
 */
export function getAcceptanceStatusColor(status: AcceptanceStatus): {
  text: string;
  bg: string;
  border: string;
} {
  if (status.status === 'valid') {
    // Check if expiring soon (within 1 day)
    if (status.daysUntilExpiry !== undefined && status.daysUntilExpiry <= 1) {
      return {
        text: 'text-yellow-700 dark:text-yellow-400',
        bg: 'bg-yellow-50 dark:bg-yellow-500/20',
        border: 'border-yellow-200 dark:border-yellow-500/30'
      };
    }
    
    return {
      text: 'text-green-700 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-500/20',
      border: 'border-green-200 dark:border-green-500/30'
    };
  }

  if (status.status === 'expired') {
    return {
      text: 'text-red-700 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-500/20',
      border: 'border-red-200 dark:border-red-500/30'
    };
  }

  // No acceptance
  return {
    text: 'text-gray-700 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-500/20',
    border: 'border-gray-200 dark:border-gray-500/30'
  };
}

/**
 * Filter acceptances to only show currently valid ones
 */
export function filterValidAcceptances(
  acceptances: Acceptance[],
  referenceDate: Date = new Date()
): Acceptance[] {
  return acceptances.filter(acc => isAcceptanceValid(acc, referenceDate));
}

/**
 * Group acceptances by their type
 */
export function groupAcceptancesByType(acceptances: Acceptance[]): {
  visitScoped: Acceptance[];
  invitationScoped: Acceptance[];
  general: Acceptance[];
} {
  const visitScoped: Acceptance[] = [];
  const invitationScoped: Acceptance[] = [];
  const general: Acceptance[] = [];

  acceptances.forEach(acc => {
    const type = getAcceptanceType(acc);
    switch (type) {
      case 'visit-scoped':
        visitScoped.push(acc);
        break;
      case 'invitation-scoped':
        invitationScoped.push(acc);
        break;
      case 'general':
        general.push(acc);
        break;
    }
  });

  return { visitScoped, invitationScoped, general };
}