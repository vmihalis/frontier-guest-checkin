/**
 * Guest Analytics and Conversion Scoring System
 * Implements AI-powered conversion prediction and visitor engagement tracking
 */

import { prisma } from "@/lib/prisma";
import { nowInLA, thirtyDaysAgoInLA } from "@/lib/timezone";
import type { Guest, Visit, VisitorTier, ConversionEventType } from "@prisma/client";
import type { 
  ConversionScore, 
  GuestAnalytics,
  ConversionEventData,
  ProfileCompletionData,
  SurveyResponseData,
  ReferralData,
  CheckinData,
  EngagementData,
  GuestWithAnalytics
} from "@/types/analytics";

export type { 
  ConversionScore, 
  GuestAnalytics,
  ConversionEventData 
};

/**
 * Calculate AI-powered conversion score for a guest
 */
export async function calculateConversionScore(guestId: string): Promise<ConversionScore> {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: {
      visits: {
        where: { checkedInAt: { not: null } },
        orderBy: { checkedInAt: 'desc' },
        include: { host: true, location: true }
      },
      frequentVisitor: true,
      surveys: {
        orderBy: { completedAt: 'desc' },
        take: 5
      },
      conversionEvents: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!guest) {
    throw new Error('Guest not found');
  }

  const now = nowInLA();
  const thirtyDaysAgo = thirtyDaysAgoInLA();
  
  // 1. Visit Frequency Score (0-25 points)
  const recentVisits = guest.visits.filter(v => v.checkedInAt && v.checkedInAt >= thirtyDaysAgo).length;
  const totalVisits = guest.visits.length;
  const visitFrequency = Math.min(25, (recentVisits * 5) + (totalVisits * 2));

  // 2. Engagement Level Score (0-25 points)
  const avgSatisfaction = guest.surveys.reduce((sum, s) => sum + (s.satisfactionScore || 0), 0) / Math.max(guest.surveys.length, 1);
  const avgNPS = guest.surveys.reduce((sum, s) => sum + (s.npsScore || 0), 0) / Math.max(guest.surveys.length, 1);
  const hostingInterest = guest.surveys.reduce((sum, s) => sum + (s.hostingInterest || 0), 0) / Math.max(guest.surveys.length, 1);
  const engagementLevel = Math.min(25, (avgSatisfaction * 3) + (avgNPS * 1.5) + (hostingInterest * 4));

  // 3. Network Effect Score (0-25 points)
  const uniqueHosts = new Set(guest.visits.map(v => v.hostId)).size;
  const colleaguesEstimate = await estimateColleaguesInBuilding(guest.email);
  const networkEffect = Math.min(25, (uniqueHosts * 4) + (colleaguesEstimate * 2));

  // 4. Business Context Score (0-25 points)
  let businessContext = 0;
  if (guest.company) businessContext += 8;
  if (guest.jobTitle) businessContext += 6;
  if (guest.industry) businessContext += 5;
  if (guest.companySize === 'Enterprise') businessContext += 6;
  else if (guest.companySize === 'SME') businessContext += 4;
  else if (guest.companySize === 'Startup') businessContext += 2;

  // 5. Recency Bonus/Penalty (-10 to +10 points)
  const daysSinceLastVisit = guest.visits[0]?.checkedInAt 
    ? Math.floor((now.getTime() - guest.visits[0].checkedInAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  
  let recency = 0;
  if (daysSinceLastVisit <= 7) recency = 10;
  else if (daysSinceLastVisit <= 14) recency = 5;
  else if (daysSinceLastVisit <= 30) recency = 0;
  else if (daysSinceLastVisit <= 60) recency = -5;
  else recency = -10;

  const totalScore = Math.max(0, Math.min(100, visitFrequency + engagementLevel + networkEffect + businessContext + recency));

  // Determine tier based on visits and engagement
  const tier = determineVisitorTier(totalVisits, totalScore);

  // Generate recommendations
  const recommendations = generateRecommendations(totalScore, {
    visitFrequency,
    engagementLevel,
    networkEffect,
    businessContext,
    recency
  });

  const nextActions = generateNextActions(totalScore, guest, recentVisits);

  return {
    score: totalScore,
    tier,
    factors: {
      visitFrequency,
      engagementLevel,
      networkEffect,
      businessContext,
      recency
    },
    recommendations,
    nextActions
  };
}

/**
 * Estimate colleagues in building based on email domain
 */
async function estimateColleaguesInBuilding(email: string): Promise<number> {
  if (!email || !email.includes('@')) return 0;
  
  const domain = email.split('@')[1];
  if (!domain || domain.includes('gmail.') || domain.includes('yahoo.') || domain.includes('outlook.')) {
    return 0; // Personal email domains
  }

  // Count unique guests with same domain
  const colleagueCount = await prisma.guest.count({
    where: {
      email: { endsWith: `@${domain}` },
      visits: { some: { checkedInAt: { not: null } } }
    }
  });

  return Math.max(0, colleagueCount - 1); // Subtract self
}

/**
 * Determine visitor tier based on visits and score
 */
function determineVisitorTier(totalVisits: number, score: number): VisitorTier {
  if (score >= 80 || totalVisits >= 11) return 'PLATINUM';
  if (score >= 65 || totalVisits >= 6) return 'GOLD';
  if (score >= 45 || totalVisits >= 3) return 'SILVER';
  return 'BRONZE';
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(score: number, factors: ConversionScore['factors']): string[] {
  const recommendations: string[] = [];

  if (score >= 80) {
    recommendations.push("High conversion potential - schedule personal meeting");
    recommendations.push("Offer trial hosting program immediately");
  } else if (score >= 60) {
    recommendations.push("Strong candidate - send personalized outreach email");
    recommendations.push("Invite to next building networking event");
  } else if (score >= 40) {
    recommendations.push("Moderate interest - nurture with valuable content");
    recommendations.push("Survey about hosting interest");
  } else {
    recommendations.push("Early stage - focus on experience improvement");
    recommendations.push("Gather more business context data");
  }

  if (factors.visitFrequency < 15) {
    recommendations.push("Encourage more frequent visits with incentives");
  }

  if (factors.engagementLevel < 15) {
    recommendations.push("Send satisfaction survey to understand concerns");
  }

  if (factors.networkEffect < 15) {
    recommendations.push("Introduce to other hosts/guests from same industry");
  }

  return recommendations;
}

/**
 * Generate next action items
 */
function generateNextActions(score: number, guest: Guest, recentVisits: number): string[] {
  const actions: string[] = [];

  if (score >= 80) {
    actions.push("Schedule conversion call within 48 hours");
    actions.push("Prepare custom hosting demo");
  } else if (score >= 60) {
    actions.push("Send personalized email within 1 week");
    actions.push("Add to high-priority follow-up list");
  } else if (score >= 40) {
    actions.push("Add to monthly nurture campaign");
    actions.push("Track for 3-month re-evaluation");
  }

  if (!guest.company) {
    actions.push("Collect missing business context in next survey");
  }

  if (recentVisits >= 2) {
    actions.push("Send post-visit satisfaction survey");
  }

  return actions;
}

/**
 * Update or create frequent visitor record
 */
export async function updateFrequentVisitorMetrics(guestId: string): Promise<void> {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: {
      visits: {
        where: { checkedInAt: { not: null } },
        orderBy: { checkedInAt: 'desc' }
      }
    }
  });

  if (!guest) return;

  const visitCount = guest.visits.length;
  const totalDuration = guest.visits.reduce((sum, visit) => {
    if (visit.checkedInAt && visit.expiresAt) {
      const duration = Math.floor((visit.expiresAt.getTime() - visit.checkedInAt.getTime()) / (1000 * 60));
      return sum + Math.min(duration, 720); // Cap at 12 hours
    }
    return sum + 240; // Default 4 hours if no explicit checkout
  }, 0);

  const averageStay = visitCount > 0 ? totalDuration / visitCount : 0;
  const uniqueHostsCount = new Set(guest.visits.map(v => v.hostId)).size;
  const lastVisitAt = guest.visits[0]?.checkedInAt || null;

  // Calculate visit streak
  const visitStreak = calculateVisitStreak(guest.visits);
  
  // Get/calculate conversion score
  const conversionData = await calculateConversionScore(guestId);

  await prisma.frequentVisitor.upsert({
    where: { guestId },
    update: {
      visitCount,
      totalDuration,
      averageStay,
      lastVisitAt,
      visitStreak,
      longestStreak: Math.max(visitStreak, (await prisma.frequentVisitor.findUnique({ where: { guestId } }))?.longestStreak || 0),
      uniqueHostsCount,
      conversionScore: conversionData.score,
      currentTier: conversionData.tier,
      lastScoreUpdate: nowInLA(),
      colleaguesInBuilding: await estimateColleaguesInBuilding(guest.email),
      networkScore: conversionData.factors.networkEffect
    },
    create: {
      guestId,
      visitCount,
      totalDuration,
      averageStay,
      lastVisitAt,
      visitStreak,
      longestStreak: visitStreak,
      uniqueHostsCount,
      conversionScore: conversionData.score,
      currentTier: conversionData.tier,
      colleaguesInBuilding: await estimateColleaguesInBuilding(guest.email),
      networkScore: conversionData.factors.networkEffect
    }
  });
}

/**
 * Determine company size category
 */
function determineCompanySize(size: string | null): 'small' | 'medium' | 'large' | 'enterprise' {
  if (!size) return 'small';
  if (size === 'Enterprise' || size === 'enterprise') return 'enterprise';
  if (size === 'Large' || size === 'large') return 'large';
  if (size === 'Medium' || size === 'medium' || size === 'SME') return 'medium';
  return 'small';
}

/**
 * Estimate employee count based on company size
 */
function estimateEmployeeCount(size: string | null): number {
  if (!size) return 10;
  if (size === 'Enterprise' || size === 'enterprise') return 1000;
  if (size === 'Large' || size === 'large') return 500;
  if (size === 'Medium' || size === 'medium' || size === 'SME') return 100;
  return 10;
}

/**
 * Determine potential value
 */
function determinePotentialValue(size: string | null, visitCount: number): 'low' | 'medium' | 'high' {
  const sizeCategory = determineCompanySize(size);
  if (sizeCategory === 'enterprise' && visitCount >= 3) return 'high';
  if (sizeCategory === 'large' && visitCount >= 5) return 'high';
  if (sizeCategory === 'medium' && visitCount >= 3) return 'medium';
  if (visitCount >= 6) return 'medium';
  return 'low';
}

/**
 * Calculate average days between visits
 */
function calculateAverageDaysBetweenVisits(visits: Visit[]): number {
  if (visits.length < 2) return 0;
  
  const sortedVisits = visits
    .filter(v => v.checkedInAt)
    .sort((a, b) => b.checkedInAt!.getTime() - a.checkedInAt!.getTime());
  
  if (sortedVisits.length < 2) return 0;
  
  let totalDays = 0;
  for (let i = 0; i < sortedVisits.length - 1; i++) {
    const daysBetween = Math.floor(
      (sortedVisits[i].checkedInAt!.getTime() - sortedVisits[i + 1].checkedInAt!.getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    totalDays += daysBetween;
  }
  
  return Math.round(totalDays / (sortedVisits.length - 1));
}

/**
 * Determine visit pattern based on frequency
 */
function determineVisitPattern(totalVisits: number, monthlyVisits: number): 'frequent' | 'regular' | 'occasional' | 'rare' {
  if (monthlyVisits >= 4) return 'frequent';
  if (monthlyVisits >= 2) return 'regular';
  if (totalVisits >= 3) return 'occasional';
  return 'rare';
}

/**
 * Calculate consecutive month visit streak
 */
function calculateVisitStreak(visits: Visit[]): number {
  if (visits.length === 0) return 0;
  
  const now = nowInLA();
  const visitMonths = visits
    .filter(v => v.checkedInAt)
    .map(v => {
      const date = v.checkedInAt!;
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    })
    .filter((month, index, arr) => arr.indexOf(month) === index) // Remove duplicates
    .sort()
    .reverse();

  let streak = 0;
  let currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  for (const visitMonth of visitMonths) {
    if (visitMonth === currentMonth) {
      streak++;
      // Move to previous month
      const [year, month] = currentMonth.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1); // month - 2 because Date months are 0-indexed
      currentMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Log conversion events for tracking
 */
export async function logConversionEvent(
  guestId: string,
  eventType: ConversionEventType,
  touchpoint?: string,
  outcome?: string,
  eventData?: ConversionEventData
): Promise<void> {
  await prisma.conversionEvent.create({
    data: {
      guestId,
      eventType,
      touchpoint,
      outcome,
      eventData: eventData ? JSON.parse(JSON.stringify(eventData)) : null
    }
  });
}

/**
 * Get comprehensive guest analytics
 */
export async function getGuestAnalytics(guestId: string): Promise<GuestAnalytics> {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: {
      visits: {
        where: { checkedInAt: { not: null } },
        orderBy: { checkedInAt: 'desc' }
      },
      frequentVisitor: true,
      surveys: {
        orderBy: { completedAt: 'desc' },
        take: 1
      }
    }
  });

  if (!guest) {
    throw new Error('Guest not found');
  }

  const thirtyDaysAgo = thirtyDaysAgoInLA();
  const recentVisits = guest.visits.filter(v => v.checkedInAt && v.checkedInAt >= thirtyDaysAgo).length;
  const uniqueHostsCount = new Set(guest.visits.map(v => v.hostId)).size;
  
  const totalDuration = guest.visits.reduce((sum, visit) => {
    if (visit.checkedInAt && visit.expiresAt) {
      return sum + Math.floor((visit.expiresAt.getTime() - visit.checkedInAt.getTime()) / (1000 * 60));
    }
    return sum + 240; // Default 4 hours
  }, 0);

  const averageStayMinutes = guest.visits.length > 0 ? totalDuration / guest.visits.length : 0;
  const latestSurvey = guest.surveys[0];

  // Get conversion score details
  const conversionScore = await calculateConversionScore(guestId);
  
  // Get timeline of conversion events
  const timeline = await prisma.conversionEvent.findMany({
    where: { guestId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return {
    guest: {
      id: guest.id,
      email: guest.email,
      name: guest.name,
      company: guest.company,
      jobTitle: guest.jobTitle,
      industry: guest.industry,
      companySize: guest.companySize,
      lastVisitDate: guest.visits[0]?.checkedInAt || null,
      becameHostAt: guest.becameHostAt,
      visits: guest.visits,
      frequentVisitor: guest.frequentVisitor,
      surveys: guest.surveys
    } as unknown as GuestWithAnalytics,
    visitFrequency: {
      totalVisits: guest.visits.length,
      monthlyVisits: recentVisits,
      averageDaysBetweenVisits: calculateAverageDaysBetweenVisits(guest.visits),
      lastVisitDaysAgo: guest.visits[0]?.checkedInAt 
        ? Math.floor((nowInLA().getTime() - guest.visits[0].checkedInAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999,
      visitPattern: determineVisitPattern(guest.visits.length, recentVisits)
    },
    network: {
      uniqueHosts: uniqueHostsCount,
      repeatHost: uniqueHostsCount < guest.visits.length,
      domainColleagues: await estimateColleaguesInBuilding(guest.email),
      referralCount: 0, // TODO: Implement referral counting
      networkScore: guest.frequentVisitor?.networkScore || 0
    },
    engagement: {
      profileCompleted: !!(guest.company && guest.jobTitle),
      surveyCompleted: guest.surveys.length > 0,
      hasReferrals: false, // TODO: Implement referral check
      programEnrolled: !!guest.frequentVisitor,
      engagementScore: latestSurvey?.satisfactionScore || 0
    },
    business: {
      companySize: determineCompanySize(guest.companySize),
      industry: guest.industry || undefined,
      employeeCount: estimateEmployeeCount(guest.companySize),
      potentialValue: determinePotentialValue(guest.companySize, guest.visits.length)
    },
    conversion: conversionScore,
    timeline
  };
}

/**
 * Get top conversion candidates for outreach
 */
export async function getTopConversionCandidates(limit: number = 20): Promise<GuestAnalytics[]> {
  const candidates = await prisma.guest.findMany({
    where: {
      blacklistedAt: null,
      becameHostAt: null, // Not already converted
      frequentVisitor: {
        conversionScore: { gte: 40 } // Minimum threshold
      }
    },
    include: {
      visits: {
        where: { checkedInAt: { not: null } },
        orderBy: { checkedInAt: 'desc' }
      },
      frequentVisitor: true,
      surveys: {
        orderBy: { completedAt: 'desc' },
        take: 1
      }
    },
    orderBy: {
      frequentVisitor: {
        conversionScore: 'desc'
      }
    },
    take: limit
  });

  return Promise.all(candidates.map(async (guest) => {
    const analytics = await getGuestAnalytics(guest.id);
    return analytics;
  }));
}