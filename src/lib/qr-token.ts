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

export interface GuestData {
  e: string; // email
  n: string; // name
}

export interface GuestBatchQRData {
  guests: GuestData[];
}

export interface ParsedQRData {
  type: 'single' | 'batch';
  singleGuest?: QRTokenData;
  guestBatch?: GuestBatchQRData;
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
 * Parse QR code data to determine if it's single-guest or batch format
 */
export function parseQRData(qrData: string): ParsedQRData {
  // Type guard to ensure we have a string
  if (typeof qrData !== 'string') {
    throw new Error('Invalid QR data: expected string');
  }
  
  console.log('Parsing QR data:', qrData.substring(0, 100), '...');
  
  // First, try to parse as direct JSON (guest batch or direct single-guest format)
  try {
    const parsed = JSON.parse(qrData);
    console.log('Successfully parsed as JSON:', parsed);
    
    // Check if it's guest batch format
    if (parsed.guests && Array.isArray(parsed.guests)) {
      console.log('Detected guest batch format with', parsed.guests.length, 'guests');
      return {
        type: 'batch',
        guestBatch: parsed as GuestBatchQRData
      };
    }
    
    // Check if it's direct JSON single-guest format
    if (parsed.inviteId && parsed.guestEmail && parsed.hostId) {
      console.log('Detected single guest JSON format');
      return {
        type: 'single',
        singleGuest: parsed as QRTokenData
      };
    }
    
    // If JSON parsed but doesn't match expected formats
    console.log('JSON parsed but unknown format:', Object.keys(parsed));
    return null; // Return null for unknown JSON format
  } catch (jsonError) {
    console.log('JSON parsing failed:', jsonError instanceof Error ? jsonError.message : 'Unknown');
    
    // If JSON parsing failed, try base64 decoding (single-guest token format)
    try {
      const decoded = JSON.parse(atob(qrData)) as QRTokenData;
      console.log('Base64 decoded successfully:', decoded);
      
      if (decoded.inviteId && decoded.guestEmail && decoded.hostId) {
        console.log('Detected base64-encoded single guest token');
        return {
          type: 'single',
          singleGuest: decoded
        };
      }
      
      console.log('Base64 decoded but missing required fields:', Object.keys(decoded));
      return null; // Return null for invalid base64 decoded data
    } catch (base64Error) {
      console.error('QR parsing failed - JSON error:', jsonError instanceof Error ? jsonError.message : 'Unknown');
      console.error('QR parsing failed - Base64 error:', base64Error instanceof Error ? base64Error.message : 'Unknown');
      console.error('Raw QR data (first 200 chars):', qrData.substring(0, 200));
      return null; // Return null for invalid data instead of throwing
    }
  }
}

/**
 * Generate guest batch QR data for a host
 */
export function generateMultiGuestQR(guests: Array<{email: string, name: string}>): string {
  const qrData: GuestBatchQRData = {
    guests: guests.map(g => ({
      e: g.email,
      n: g.name
    }))
  };
  
  return JSON.stringify(qrData);
}

/**
 * Generate QR code display data (for UI display)
 */
export function generateQRDisplayData(token: string): string {
  // In production, this might be a full URL like: https://berlinhouse.app/checkin?token=${token}
  return `berlinhouse://checkin?token=${token}`;
}