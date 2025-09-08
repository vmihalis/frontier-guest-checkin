/**
 * Strict type definitions for analytics system
 */

import type { 
  Guest, 
  Visit, 
  User, 
  Invitation,
  Acceptance,
  Discount,
  ConversionEvent,
  VisitorTier,
  ConversionEventType,
  InvitationStatus,
  UserRole,
  LocationCapacity,
  VisitorProgram,
  ReferralReward,
  Achievement
} from '@prisma/client';

// Event data schemas for conversion events
export interface ProfileCompletionData {
  fieldsCompleted: string[];
  completionPercentage: number;
  timeToComplete: number;
}

export interface SurveyResponseData {
  responses: Array<{
    question: string;
    answer: string;
    rating?: number;
  }>;
  completedAt: string;
}

export interface ReferralData {
  referredBy: string;
  referralCode?: string;
  source: 'email' | 'link' | 'qr';
}

export interface CheckinData {
  method: 'qr' | 'manual' | 'kiosk';
  deviceType?: string;
  location?: string;
  overrideApplied?: boolean;
}

export interface EngagementData {
  action: string;
  duration?: number;
  metadata?: Record<string, string | number | boolean>;
}

// Union type for all possible event data
export type ConversionEventData = 
  | ProfileCompletionData 
  | SurveyResponseData 
  | ReferralData 
  | CheckinData 
  | EngagementData;

// Visit with strict typing
export interface VisitWithRelations extends Visit {
  guest: Guest;
  host: User;
  invitation?: Invitation | null;
}

// Guest with analytics
export interface GuestWithAnalytics extends Guest {
  visits: VisitWithRelations[];
  conversionEvents: ConversionEvent[];
  visitorProgram?: VisitorProgram | null;
  referralRewards: ReferralReward[];
  achievements: Achievement[];
  discounts: Discount[];
  acceptances: Acceptance[];
}

// Analytics result types
export interface VisitFrequencyData {
  totalVisits: number;
  monthlyVisits: number;
  averageDaysBetweenVisits: number;
  lastVisitDaysAgo: number;
  visitPattern: 'frequent' | 'regular' | 'occasional' | 'rare';
}

export interface NetworkAnalytics {
  uniqueHosts: number;
  repeatHost: boolean;
  domainColleagues: number;
  referralCount: number;
  networkScore: number;
}

export interface EngagementMetrics {
  profileCompleted: boolean;
  surveyCompleted: boolean;
  hasReferrals: boolean;
  programEnrolled: boolean;
  engagementScore: number;
}

export interface BusinessContext {
  companySize: 'small' | 'medium' | 'large' | 'enterprise';
  industry?: string;
  employeeCount: number;
  potentialValue: 'low' | 'medium' | 'high';
}

export interface ConversionFactors {
  visitFrequency: number;
  engagementLevel: number;
  networkEffect: number;
  businessContext: number;
  recency: number;
}

export interface ConversionScore {
  score: number;
  tier: VisitorTier;
  factors: ConversionFactors;
  recommendations: string[];
  nextActions: string[];
}

export interface GuestAnalytics {
  guest: GuestWithAnalytics;
  visitFrequency: VisitFrequencyData;
  network: NetworkAnalytics;
  engagement: EngagementMetrics;
  business: BusinessContext;
  conversion: ConversionScore;
  timeline: ConversionEvent[];
}

// API Response types
export interface AnalyticsResponse {
  success: boolean;
  data?: GuestAnalytics;
  error?: string;
}

export interface ConversionMetricsResponse {
  totalGuests: number;
  conversionRate: number;
  tierBreakdown: Record<VisitorTier, number>;
  topReferrers: Array<{
    guestId: string;
    name: string;
    referralCount: number;
  }>;
  recentConversions: ConversionEvent[];
}

export interface ReferralAnalytics {
  referrer: Guest;
  referredGuests: Guest[];
  totalRewards: number;
  conversionRate: number;
  activeReferrals: number;
}