/**
 * Timezone utilities for America/Los_Angeles business rules
 * All time calculations should use this timezone for consistency
 */

const TIMEZONE = 'America/Los_Angeles';

/**
 * Get current date and time in Los Angeles timezone
 */
export function nowInLA(): Date {
  return new Date();
}

/**
 * Get current date in Los Angeles timezone as YYYY-MM-DD string
 */
export function todayInLA(): string {
  const now = nowInLA();
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: TIMEZONE,
  }).format(now);
}

/**
 * Convert a date to Los Angeles timezone
 */
export function toLA(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Get end of day (23:59:59.999) in Los Angeles timezone for a given date
 */
export function endOfDayInLA(date: Date): Date {
  const laDate = toLA(date);
  const endOfDay = new Date(laDate);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

/**
 * Check if current time is after 11:59 PM in Los Angeles
 * Returns true if entries should be blocked
 */
export function isAfterCutoff(): boolean {
  const now = nowInLA();
  const laTime = toLA(now);
  const hours = laTime.getHours();
  const minutes = laTime.getMinutes();
  
  return hours === 23 && minutes >= 59;
}

/**
 * Calculate visit expiration: min(checkInAt + 24h, same-day 23:59 LA time)
 */
export function calculateVisitExpiration(checkInAt: Date): Date {
  const checkInLA = toLA(checkInAt);
  const twentyFourHoursLater = new Date(checkInLA.getTime() + 24 * 60 * 60 * 1000);
  const endOfSameDay = endOfDayInLA(checkInLA);
  
  return twentyFourHoursLater < endOfSameDay ? twentyFourHoursLater : endOfSameDay;
}

/**
 * Get 30 days ago from current time for rolling window calculations
 */
export function thirtyDaysAgoInLA(): Date {
  const now = nowInLA();
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

/**
 * Format date for display in LA timezone
 */
export function formatDateInLA(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Format datetime for display in LA timezone
 */
export function formatDateTimeInLA(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

/**
 * Format time for display in LA timezone (HH:MM)
 */
export function formatTimeInLA(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Calculate next eligible date for a guest (30 days from last visit)
 */
export function calculateNextEligibleDate(lastVisitDate: Date): Date {
  return new Date(lastVisitDate.getTime() + 30 * 24 * 60 * 60 * 1000);
}

/**
 * Check if a date is today in LA timezone
 */
export function isTodayInLA(date: Date): boolean {
  const today = todayInLA();
  const dateStr = formatDateInLA(date);
  return dateStr === today;
}

/**
 * Get QR token expiration (30 minutes from now)
 */
export function getQRTokenExpiration(): Date {
  const now = nowInLA();
  return new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
}

/**
 * Format countdown timer (MM:SS)
 */
export function formatCountdown(expiresAt: Date): string {
  const now = nowInLA();
  const remaining = expiresAt.getTime() - now.getTime();
  
  if (remaining <= 0) {
    return '00:00';
  }
  
  const minutes = Math.floor(remaining / (60 * 1000));
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export const TIMEZONE_DISPLAY = 'America/Los_Angeles';