"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress"; // Component not available
import { 
  Award, 
  Gift, 
  Crown,
  Star,
  Trophy,
  Calendar,
  MapPin,
  TrendingUp
} from "lucide-react";

interface VisitorProfile {
  id: string;
  email: string;
  name: string;
  company: string;
  visitCount: number;
  currentTier: string;
  conversionScore: number;
  recentVisits: Array<{
    date: string;
    host: string;
    location: string;
  }>;
}

interface TierInfo {
  name: string;
  visitThreshold: number;
  benefits: string[];
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  rewards: {
    welcomeBonus?: string;
    monthlyReward?: string;
    specialAccess?: string[];
  };
  nextTier?: {
    name: string;
    visitsNeeded: number;
  };
}

const TIER_INFO: Record<string, TierInfo> = {
  BRONZE: {
    name: "Explorer",
    visitThreshold: 0,
    color: "bg-orange-100 text-orange-800 border-orange-300",
    icon: Award,
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
    color: "bg-gray-100 text-gray-800 border-gray-300",
    icon: Star,
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
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    icon: Trophy,
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
    color: "bg-purple-100 text-purple-800 border-purple-300",
    icon: Crown,
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
    },
    nextTier: {
      name: "Distinguished Guest",
      visitsNeeded: 20
    }
  },
  VIP: {
    name: "Distinguished Guest",
    visitThreshold: 20,
    color: "bg-indigo-100 text-indigo-800 border-indigo-300",
    icon: Crown,
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

interface VisitorProgramProps {
  guestEmail: string;
}

export default function VisitorProgram({ guestEmail }: VisitorProgramProps) {
  const [profile, setProfile] = useState<VisitorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVisitorProfile();
  }, [guestEmail]);

  const fetchVisitorProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/guest/profile?email=${encodeURIComponent(guestEmail)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch visitor profile');
      }
      
      const result = await response.json();
      setProfile(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading your visitor profile...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!profile) return <div className="p-6">Profile not found</div>;

  const currentTier = TIER_INFO[profile.currentTier] || TIER_INFO.BRONZE;
  const nextTier = currentTier.nextTier ? TIER_INFO[currentTier.nextTier.name.toUpperCase().replace(' ', '_')] : null;
  const TierIcon = currentTier.icon;
  const progress = nextTier ? Math.min(100, (profile.visitCount / nextTier.visitThreshold) * 100) : 100;
  const visitsUntilNext = nextTier ? Math.max(0, nextTier.visitThreshold - profile.visitCount) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${currentTier.color.split(' ')[0]} ${currentTier.color.split(' ')[1]}`}>
                <TierIcon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile.name || 'Welcome, Visitor!'}</h1>
                <p className="text-gray-600">{profile.company}</p>
              </div>
            </div>
            <Badge className={currentTier.color}>
              {currentTier.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{profile.visitCount}</p>
              <p className="text-sm text-gray-600">Total Visits</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{profile.conversionScore}</p>
              <p className="text-sm text-gray-600">Engagement Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{profile.recentVisits.length}</p>
              <p className="text-sm text-gray-600">Recent Visits</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{currentTier.visitThreshold}+</p>
              <p className="text-sm text-gray-600">Tier Threshold</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress to Next Tier */}
      {nextTier && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Progress to {nextTier.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Current Progress</span>
                <span>{profile.visitCount} / {nextTier.visitThreshold} visits</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              {visitsUntilNext > 0 ? (
                <p className="text-sm text-gray-600 text-center">
                  {visitsUntilNext} more visit{visitsUntilNext !== 1 ? 's' : ''} to reach {nextTier.name}!
                </p>
              ) : (
                <p className="text-sm text-green-600 text-center font-medium">
                  🎉 Congratulations! You&apos;ve reached {nextTier.name} status!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Tier Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="h-5 w-5" />
            <span>Your {currentTier.name} Benefits</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <h4 className="font-semibold mb-2">Access & Privileges</h4>
              <ul className="list-disc pl-6 space-y-1">
                {currentTier.benefits.map((benefit, index) => (
                  <li key={index} className="text-sm">{benefit}</li>
                ))}
              </ul>
            </div>
            
            {currentTier.rewards.welcomeBonus && (
              <div>
                <h4 className="font-semibold mb-2">Welcome Bonus</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">{currentTier.rewards.welcomeBonus}</p>
                  <p className="text-xs text-blue-600 mt-1">Present this page at reception to claim!</p>
                </div>
              </div>
            )}
            
            {currentTier.rewards.monthlyReward && (
              <div>
                <h4 className="font-semibold mb-2">Monthly Reward</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">{currentTier.rewards.monthlyReward}</p>
                  <p className="text-xs text-green-600 mt-1">Available after 3+ visits this month</p>
                </div>
              </div>
            )}
            
            {currentTier.rewards.specialAccess && (
              <div>
                <h4 className="font-semibold mb-2">Special Access</h4>
                <div className="flex flex-wrap gap-2">
                  {currentTier.rewards.specialAccess.map((access, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {access}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Visit History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Recent Visits</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {profile.recentVisits.map((visit, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{new Date(visit.date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-600">Hosted by {visit.host}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{visit.location}</p>
                </div>
              </div>
            ))}
            
            {profile.recentVisits.length === 0 && (
              <div className="text-center text-gray-500 py-6">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recent visits recorded</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hosting Interest CTA */}
      {profile.conversionScore >= 60 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">Interested in Hosting?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700 mb-4">
              Based on your engagement, you might be interested in becoming a host yourself! 
              Hosting gives you access to premium workspace solutions and networking opportunities.
            </p>
            <div className="flex space-x-3">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Learn About Hosting
              </Button>
              <Button variant="outline" className="border-blue-300 text-blue-600">
                Schedule Consultation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}