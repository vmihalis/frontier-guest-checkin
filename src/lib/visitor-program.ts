/**
 * Frequent Visitor Program Logic
 * Handles tier progression, rewards, and engagement mechanics
 */

import { prisma } from "@/lib/prisma";
import { logConversionEvent } from "@/lib/analytics";
import { sendEmail } from "@/lib/email";
import { nowInLA, thirtyDaysAgoInLA } from "@/lib/timezone";
import type { VisitorTier, Guest, FrequentVisitor, Visit } from "@prisma/client";
import type { 
  TierBenefits, 
  VisitorProgramData as VisitorProgram,
  VisitData
} from "@/types/visitor-program";

export type { TierBenefits, VisitorProgram };

export const TIER_BENEFITS: Record<VisitorTier, TierBenefits> = {
  BRONZE: {
    name: "Explorer",
    visitThreshold: 0,
    benefits: [
      "Welcome to Frontier Tower",
      "Basic visitor access",
      "Building WiFi access"
    ],
    rewards: {
      welcomeBonus: "Welcome coffee voucher"
    },
    nextTier: {
      name: "Connector", 
      visitsNeeded: 3
    }
  },
  SILVER: {
    name: "Connector", 
    visitThreshold: 3,
    benefits: [
      "All Explorer benefits",
      "Priority check-in",
      "Guest lounge access",
      "Building event invitations"
    ],
    rewards: {
      welcomeBonus: "Lunch voucher",
      monthlyReward: "Free parking day"
    },
    nextTier: {
      name: "Ambassador",
      visitsNeeded: 6
    }
  },
  GOLD: {
    name: "Ambassador",
    visitThreshold: 6, 
    benefits: [
      "All Connector benefits",
      "Conference room booking",
      "Gym day pass access",
      "Networking event priority",
      "Concierge service"
    ],
    rewards: {
      welcomeBonus: "Executive lunch",
      monthlyReward: "Spa facility access",
      specialAccess: ["Executive lounge", "Rooftop terrace"]
    },
    nextTier: {
      name: "VIP",
      visitsNeeded: 11
    }
  },
  PLATINUM: {
    name: "VIP",
    visitThreshold: 11,
    benefits: [
      "All Ambassador benefits", 
      "24/7 building access",
      "Personal workspace reservation",
      "Hosting trial program eligibility",
      "Direct line to building management"
    ],
    rewards: {
      welcomeBonus: "VIP orientation meeting",
      monthlyReward: "Complimentary meeting room",
      specialAccess: ["Executive floor", "Private dining", "Wellness center"]
    }
  },
  VIP: {
    name: "Distinguished Guest",
    visitThreshold: 20,
    benefits: [
      "All VIP benefits",
      "Personalized concierge service",
      "Private event hosting privileges",
      "First access to new amenities",
      "Quarterly business consultation"
    ],
    rewards: {
      welcomeBonus: "Executive welcome package",
      monthlyReward: "Private event space",
      specialAccess: ["All premium facilities", "Executive parking"]
    }
  }
};

/**
 * Get visitor program status for a guest
 */
export async function getVisitorProgramStatus(guestId: string): Promise<VisitorProgram | null> {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: {
      frequentVisitor: true,
      visits: {
        where: { checkedInAt: { not: null } },
        orderBy: { checkedInAt: 'desc' }
      }
    }
  });

  if (!guest) return null;

  const currentTier = guest.frequentVisitor?.currentTier || 'BRONZE';
  const tierInfo = TIER_BENEFITS[currentTier];
  
  const thirtyDaysAgo = thirtyDaysAgoInLA();
  const visitsThisMonth = guest.visits.filter(
    visit => visit.checkedInAt && visit.checkedInAt >= thirtyDaysAgo
  ).length;

  const achievements = await calculateAchievements(guest, guest.frequentVisitor);
  const availableRewards = await getAvailableRewards(guest, guest.frequentVisitor);

  return {
    currentTier: tierInfo,
    progress: {
      visitsThisMonth,
      totalVisits: guest.visits.length,
      visitStreak: guest.frequentVisitor?.visitStreak || 0,
      daysUntilNextReward: calculateDaysUntilNextReward(guest.visits)
    },
    availableRewards,
    achievements
  };
}

/**
 * Process tier progression and rewards after a visit
 */
export async function processTierProgression(guestId: string): Promise<{
  tierChanged: boolean;
  newTier?: VisitorTier;
  rewardsEarned: string[];
  achievementsUnlocked: string[];
}> {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: {
      frequentVisitor: true,
      visits: {
        where: { checkedInAt: { not: null } },
        orderBy: { checkedInAt: 'desc' }
      }
    }
  });

  if (!guest) {
    throw new Error('Guest not found');
  }

  const totalVisits = guest.visits.length;
  const currentTier = guest.frequentVisitor?.currentTier || 'BRONZE';
  
  // Determine new tier based on visit count
  const newTier = determineNewTier(totalVisits);
  const tierChanged = newTier !== currentTier;
  
  const rewardsEarned: string[] = [];
  const achievementsUnlocked: string[] = [];

  // Update tier if changed
  if (tierChanged) {
    await prisma.frequentVisitor.upsert({
      where: { guestId },
      update: {
        currentTier: newTier,
        tierAchievedAt: nowInLA()
      },
      create: {
        guestId,
        currentTier: newTier,
        tierAchievedAt: nowInLA(),
        visitCount: totalVisits
      }
    });

    // Add tier upgrade rewards
    const tierBenefits = TIER_BENEFITS[newTier];
    if (tierBenefits.rewards.welcomeBonus) {
      rewardsEarned.push(tierBenefits.rewards.welcomeBonus);
    }
    
    achievementsUnlocked.push(`Achieved ${tierBenefits.name} status!`);
    
    // Log tier achievement event
    await logConversionEvent(
      guestId,
      'SURVEY_COMPLETED',
      'tier_progression',
      'success',
      undefined
    );
  }

  // Check for visit milestone achievements
  const milestoneAchievements = checkVisitMilestones(totalVisits);
  achievementsUnlocked.push(...milestoneAchievements);

  // Check for streak achievements
  const streakAchievements = checkStreakMilestones(guest.frequentVisitor?.visitStreak || 0);
  achievementsUnlocked.push(...streakAchievements);

  // Monthly rewards for active tiers
  if (shouldEarnMonthlyReward(guest.visits)) {
    const tierBenefits = TIER_BENEFITS[newTier];
    if (tierBenefits.rewards.monthlyReward) {
      rewardsEarned.push(tierBenefits.rewards.monthlyReward);
    }
  }

  // Send tier upgrade email if significant change
  if (tierChanged && (newTier === 'GOLD' || newTier === 'PLATINUM' || newTier === 'VIP')) {
    await sendTierUpgradeEmail(guest, newTier);
  }

  return {
    tierChanged,
    newTier: tierChanged ? newTier : undefined,
    rewardsEarned,
    achievementsUnlocked
  };
}

/**
 * Determine tier based on visit count
 */
function determineNewTier(totalVisits: number): VisitorTier {
  if (totalVisits >= 20) return 'VIP';
  if (totalVisits >= 11) return 'PLATINUM';  
  if (totalVisits >= 6) return 'GOLD';
  if (totalVisits >= 3) return 'SILVER';
  return 'BRONZE';
}

/**
 * Calculate achievements for a guest
 */
async function calculateAchievements(
  guest: Guest, 
  frequentVisitor: FrequentVisitor | null
): Promise<string[]> {
  const achievements: string[] = [];
  const visitCount = frequentVisitor?.visitCount || 0;
  const visitStreak = frequentVisitor?.visitStreak || 0;
  
  // Visit count achievements
  if (visitCount >= 1) achievements.push("First Visit");
  if (visitCount >= 5) achievements.push("Regular Visitor");
  if (visitCount >= 10) achievements.push("Frequent Flyer");
  if (visitCount >= 25) achievements.push("Building Veteran");
  if (visitCount >= 50) achievements.push("Frontier Legend");

  // Streak achievements
  if (visitStreak >= 2) achievements.push("Consistent Visitor");
  if (visitStreak >= 3) achievements.push("Monthly Regular");
  if (visitStreak >= 6) achievements.push("Half-Year Streak");
  if (visitStreak >= 12) achievements.push("Annual Champion");

  // Special achievements
  if (guest.company) achievements.push("Business Professional");
  if (guest.conversionInterest && guest.conversionInterest >= 8) {
    achievements.push("Future Host");
  }

  return achievements;
}

/**
 * Get available rewards for a guest
 */
async function getAvailableRewards(
  guest: Guest,
  frequentVisitor: FrequentVisitor | null
): Promise<string[]> {
  const rewards: string[] = [];
  const currentTier = frequentVisitor?.currentTier || 'BRONZE';
  const tierBenefits = TIER_BENEFITS[currentTier];
  
  // Tier-based rewards
  if (tierBenefits.rewards.monthlyReward) {
    rewards.push(tierBenefits.rewards.monthlyReward);
  }
  
  if (tierBenefits.rewards.specialAccess) {
    rewards.push(...tierBenefits.rewards.specialAccess);
  }

  // Conversion interest rewards
  if (guest.conversionInterest && guest.conversionInterest >= 7) {
    rewards.push("Hosting Consultation");
    rewards.push("Workspace Trial");
  }

  return rewards;
}

/**
 * Check visit milestone achievements
 */
function checkVisitMilestones(totalVisits: number): string[] {
  const achievements: string[] = [];
  
  // Only add achievement on exact milestone
  if (totalVisits === 5) achievements.push("5 Visit Milestone");
  if (totalVisits === 10) achievements.push("10 Visit Milestone"); 
  if (totalVisits === 15) achievements.push("15 Visit Milestone");
  if (totalVisits === 25) achievements.push("25 Visit Milestone");
  if (totalVisits === 50) achievements.push("50 Visit Milestone");

  return achievements;
}

/**
 * Check streak milestone achievements
 */
function checkStreakMilestones(visitStreak: number): string[] {
  const achievements: string[] = [];
  
  if (visitStreak === 3) achievements.push("3 Month Streak");
  if (visitStreak === 6) achievements.push("6 Month Streak");
  if (visitStreak === 12) achievements.push("1 Year Streak");

  return achievements;
}

/**
 * Calculate days until next reward
 */
function calculateDaysUntilNextReward(visits: Array<{ checkedInAt: Date | null }>): number {
  if (visits.length === 0) return 0;
  
  const now = nowInLA();
  const lastVisit = visits[0].checkedInAt;
  const daysSinceLastVisit = lastVisit ? Math.floor(
    (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)
  ) : 999;
  
  // Monthly rewards cycle
  return Math.max(0, 30 - daysSinceLastVisit);
}

/**
 * Check if guest should earn monthly reward
 */
function shouldEarnMonthlyReward(visits: Array<{ checkedInAt: Date | null }>): boolean {
  if (visits.length === 0) return false;
  
  const thirtyDaysAgo = thirtyDaysAgoInLA();
  const recentVisits = visits.filter(
    visit => visit.checkedInAt && visit.checkedInAt >= thirtyDaysAgo
  );
  
  // Earn monthly reward if 3+ visits this month
  return recentVisits.length >= 3;
}

/**
 * Send tier upgrade notification email
 */
async function sendTierUpgradeEmail(guest: Guest, newTier: VisitorTier): Promise<void> {
  const tierBenefits = TIER_BENEFITS[newTier];
  
  try {
    await sendEmail({
      to: guest.email,
      subject: `🎉 Congratulations! You've achieved ${tierBenefits.name} status`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to ${tierBenefits.name}!</h1>
          <p>Hi ${guest.name || 'Valued Guest'},</p>
          <p>Congratulations on achieving <strong>${tierBenefits.name}</strong> status at Frontier Tower!</p>
          
          <h2>Your New Benefits:</h2>
          <ul>
            ${tierBenefits.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
          </ul>
          
          ${tierBenefits.rewards.welcomeBonus ? 
            `<div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Welcome Bonus:</h3>
              <p><strong>${tierBenefits.rewards.welcomeBonus}</strong></p>
              <p>Present this email at reception to claim your reward!</p>
            </div>` : ''
          }
          
          <p>Thank you for being such a valued member of our community.</p>
          <p>Best regards,<br>The Frontier Tower Team</p>
        </div>
      `
    });
    
    await logConversionEvent(
      guest.id,
      'OUTREACH_EMAIL_SENT',
      'tier_upgrade',
      'success',
      undefined
    );
  } catch (error) {
    console.error('Error sending tier upgrade email:', error);
  }
}