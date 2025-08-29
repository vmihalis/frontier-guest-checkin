/**
 * QR token generation and validation utilities
 * Mock implementation for development - in production, use proper JWT signing
 */

import { nowInLA, getQRTokenExpiration } from "@/lib/timezone";

export interface QRTokenData {
  inviteId: string;
  guestEmail: string;
  hostId: string;
  iat: number;
  exp: number;
}

/**
 * Generate a mock QR token (in production, use proper JWT with signing)
 */
export function generateQRToken(inviteId: string, guestEmail: string, hostId: string): string {
  const now = nowInLA();
  const expires = getQRTokenExpiration();
  
  const tokenData: QRTokenData = {
    inviteId,
    guestEmail,
    hostId,
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(expires.getTime() / 1000),
  };
  
  // Mock token - in production, use JWT signing with a secret
  const mockToken = btoa(JSON.stringify(tokenData));
  return mockToken;
}

/**
 * Validate and decode a QR token
 */
export function validateQRToken(token: string): { isValid: boolean; data?: QRTokenData; error?: string } {
  try {
    // Mock validation - in production, use JWT verification with secret
    const decoded = JSON.parse(atob(token)) as QRTokenData;
    
    const now = Math.floor(nowInLA().getTime() / 1000);
    
    if (decoded.exp < now) {
      return { isValid: false, error: "Token has expired" };
    }
    
    if (!decoded.inviteId || !decoded.guestEmail || !decoded.hostId) {
      return { isValid: false, error: "Invalid token format" };
    }
    
    return { isValid: true, data: decoded };
  } catch {
    return { isValid: false, error: "Invalid token format" };
  }
}

/**
 * Generate QR code display data (for UI display)
 */
export function generateQRDisplayData(token: string): string {
  // In production, this might be a full URL like: https://berlinhouse.app/checkin?token=${token}
  return `berlinhouse://checkin?token=${token}`;
}