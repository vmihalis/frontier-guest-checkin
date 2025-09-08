/**
 * Strict type definitions for visitor program system
 */

import type { 
  VisitorTier,
  Guest,
  Visit,
  FrequentVisitor
} from '@prisma/client';

// Visit data structure for type safety
export interface VisitData {
  id: string;
  guestId: string;
  hostId: string;
  checkedInAt: Date | null;
  checkedOutAt?: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

// Tier benefit structure
export interface TierReward {
  welcomeBonus?: string;
  monthlyReward?: string;
  specialAccess?: string[];
}

export interface TierBenefits {
  name: string;
  visitThreshold: number;
  benefits: string[];
  rewards: TierReward;
  nextTier?: {
    name: string;
    visitsNeeded: number;
  };
}

// Progress tracking
export interface VisitorProgress {
  visitsThisMonth: number;
  totalVisits: number;
  visitStreak: number;
  daysUntilNextReward: number;
}

// Complete visitor program data
export interface VisitorProgramData {
  currentTier: TierBenefits;
  progress: VisitorProgress;
  availableRewards: string[];
  achievements: string[];
}

// Enrollment data
export interface EnrollmentData {
  guestId: string;
  enrolledAt: Date;
  currentTier: VisitorTier;
  tierProgress: number;
  totalPoints: number;
  availablePoints: number;
  referralCode: string;
}

// Referral tracking
export interface ReferralData {
  referrerId: string;
  referredGuestId: string;
  referralCode: string;
  status: 'pending' | 'completed' | 'expired';
  rewardAmount: number;
  completedAt?: Date;
}

// Achievement data
export interface AchievementData {
  id: string;
  name: string;
  description: string;
  category: 'visits' | 'referrals' | 'engagement' | 'special';
  unlockedAt: Date;
  points: number;
  badge?: string;
}

// Reward redemption
export interface RewardRedemption {
  id: string;
  guestId: string;
  rewardType: string;
  pointsCost: number;
  redeemedAt: Date;
  status: 'pending' | 'approved' | 'delivered';
  metadata?: Record<string, string | number>;
}

// API response types
export interface VisitorProgramResponse {
  success: boolean;
  program?: VisitorProgramData;
  enrollment?: EnrollmentData;
  error?: string;
}

export interface ReferralResponse {
  success: boolean;
  referral?: ReferralData;
  rewards?: any[];
  error?: string;
}

export interface AchievementResponse {
  success: boolean;
  achievements?: AchievementData[];
  newUnlocks?: AchievementData[];
  error?: string;
}