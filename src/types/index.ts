/**
 * Central type exports for the application
 * All types are strictly defined with no 'any' usage
 */

// Re-export Prisma types
export type {
  User,
  Guest,
  Visit,
  Invitation,
  Acceptance,
  Discount,
  LocationCapacity,
  ConversionEvent,
  FrequentVisitor,
  Survey,
  VisitorProgram,
  ReferralReward,
  Achievement,
  Activity,
  
  // Enums
  UserRole,
  InvitationStatus,
  VisitorTier,
  ConversionEventType,
  AcceptanceType
} from '@prisma/client';

// Analytics types
export type {
  ConversionScore,
  GuestAnalytics,
  ConversionEventData,
  ProfileCompletionData,
  SurveyResponseData,
  ReferralData,
  CheckinData,
  EngagementData,
  VisitWithRelations,
  GuestWithAnalytics,
  VisitFrequencyData,
  NetworkAnalytics,
  EngagementMetrics,
  BusinessContext,
  ConversionFactors,
  AnalyticsResponse,
  ConversionMetricsResponse,
  ReferralAnalytics
} from './analytics';

// Visitor program types
export type {
  TierBenefits,
  TierReward,
  VisitorProgress,
  VisitorProgramData,
  EnrollmentData,
  ReferralResponse,
  AchievementData,
  AchievementResponse,
  RewardRedemption,
  VisitorProgramResponse,
  VisitData
} from './visitor-program';

// Admin types
export type {
  AdminStats,
  GuestJourney,
  ExecutiveReport,
  Policies,
  SearchResult,
  Activity
} from './admin';

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form data types
export interface InvitationFormData {
  guestEmail: string;
  guestName?: string;
}

export interface GuestProfileData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  companySize?: string;
}

export interface SurveyFormData {
  satisfactionScore: number;
  npsScore: number;
  hostingInterest: number;
  feedback?: string;
  improvements?: string;
}

// Override types
export interface OverrideData {
  reason: string;
  password: string;
  overriddenBy: string;
  overriddenAt: Date;
}

// Session types
export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  locationId?: string;
}

// QR code types
export interface QRGuestData {
  e: string; // email
  n: string; // name
}

export interface QRBatchData {
  guests: QRGuestData[];
}

export interface QRTokenPayload {
  inviteId?: string;
  guestEmail?: string;
  guests?: QRGuestData[];
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  reason?: string;
  details?: Record<string, string | number | boolean>;
}

// Email types
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}