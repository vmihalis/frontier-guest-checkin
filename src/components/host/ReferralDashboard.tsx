"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Trophy, 
  Users, 
  DollarSign, 
  TrendingUp,
  Crown,
  Star,
  Mail,
  MessageSquare,
  Calendar,
  type LucideIcon
} from "lucide-react";

interface ReferralData {
  hostInfo: {
    name: string;
    tier: string;
    totalReferrals: number;
    totalConversions: number;
    rewardBalance: number;
    conversionRate: number;
  };
  metrics: {
    recentGuests: number;
    convertedGuests: number;
    conversionRate: number;
    potentialRewards: number;
  };
  recentActivity: Array<{
    guestId: string;
    guestName: string;
    guestEmail: string;
    company: string;
    checkedInAt: string;
    isConverted: boolean;
    convertedAt?: string;
    visitCount: number;
    conversionScore: number;
    tier: string;
  }>;
  conversionCandidates: Array<{
    guestId: string;
    guestName: string;
    guestEmail: string;
    company: string;
    conversionScore: number;
    conversionInterest: number;
    visitCount: number;
    tier: string;
    potentialReward: number;
  }>;
}

interface TierInfo {
  name: string;
  color: string;
  icon: LucideIcon;
  benefits: string[];
}

const TIER_INFO: Record<string, TierInfo> = {
  BRONZE: {
    name: "Bronze Host",
    color: "bg-orange-100 text-orange-800",
    icon: Trophy,
    benefits: ["Basic referral rewards", "Monthly reports"]
  },
  SILVER: {
    name: "Silver Host", 
    color: "bg-gray-100 text-gray-800",
    icon: Star,
    benefits: ["Enhanced rewards", "Priority support", "Quarterly bonuses"]
  },
  GOLD: {
    name: "Gold Host",
    color: "bg-yellow-100 text-yellow-800", 
    icon: Crown,
    benefits: ["Premium rewards", "VIP support", "Special events access"]
  },
  PLATINUM: {
    name: "Platinum Host",
    color: "bg-purple-100 text-purple-800",
    icon: Crown,
    benefits: ["Maximum rewards", "Dedicated support", "Executive privileges"]
  }
};

export default function ReferralDashboard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendationDialog, setRecommendationDialog] = useState<{
    open: boolean;
    guest?: { id: string; name: string; email: string };
  }>({ open: false });

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/host/referrals');
      if (!response.ok) {
        throw new Error('Failed to fetch referral data');
      }
      
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendGuest = async (guestId: string, notes: string) => {
    try {
      await fetch('/api/host/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recommendGuest',
          guestId,
          notes,
          interestLevel: 8
        })
      });
      setRecommendationDialog({ open: false });
      fetchReferralData(); // Refresh data
    } catch (error) {
      console.error('Error recommending guest:', error);
    }
  };

  if (loading) return <div className="p-6">Loading referral dashboard...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!data) return <div className="p-6">No data available</div>;

  const tierInfo = TIER_INFO[data.hostInfo.tier] || TIER_INFO.BRONZE;
  const TierIcon = tierInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">Referral Dashboard</h1>
          <Badge className={tierInfo.color}>
            {TierIcon && <TierIcon className="h-4 w-4 mr-1" />}
            {tierInfo.name}
          </Badge>
        </div>
        <Button onClick={fetchReferralData} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Referrals"
          value={data.hostInfo.totalReferrals.toString()}
          description="Guests you've referred"
          icon={Users}
          trend={{ value: 0, positive: true }}
        />
        <StatCard
          title="Conversions"
          value={data.hostInfo.totalConversions.toString()}
          description="Referrals who became hosts"
          icon={Trophy}
          trend={{ value: 0, positive: true }}
        />
        <StatCard
          title="Conversion Rate"
          value={`${data.hostInfo.conversionRate}%`}
          description="Success rate"
          icon={TrendingUp}
          trend={{ value: 0, positive: true }}
        />
        <StatCard
          title="Reward Balance"
          value={`$${data.hostInfo.rewardBalance.toFixed(0)}`}
          description="Available rewards"
          icon={DollarSign}
          trend={{ value: 0, positive: true }}
        />
      </div>

      {/* Host Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TierIcon className="h-5 w-5" />
            <span>Your {tierInfo.name} Benefits</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-6 space-y-1">
            {tierInfo.benefits.map((benefit, index) => (
              <li key={index} className="text-sm">{benefit}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Tabs defaultValue="candidates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="candidates">Conversion Candidates</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="rewards">Rewards & History</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>High-Potential Guests to Recommend</CardTitle>
              <p className="text-sm text-gray-600">
                These guests show strong conversion potential. Recommend them to earn rewards!
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.conversionCandidates.map((candidate) => (
                  <div key={candidate.guestId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-semibold">{candidate.guestName}</h3>
                            <p className="text-sm text-gray-600">{candidate.company}</p>
                          </div>
                          <Badge 
                            variant={candidate.tier === 'PLATINUM' ? 'default' : 
                                   candidate.tier === 'GOLD' ? 'secondary' : 'outline'}
                          >
                            {candidate.tier}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <span>Score: {candidate.conversionScore}/100</span>
                          <span>Interest: {candidate.conversionInterest}/10</span>
                          <span>Visits: {candidate.visitCount}</span>
                          <span className="text-green-600 font-medium">
                            Potential: ${candidate.potentialReward}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Recommend
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Recommend {candidate.guestName}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm text-gray-600">
                                Why do you think {candidate.guestName} would be interested in hosting?
                              </p>
                              <Textarea 
                                placeholder="They seem very engaged and asked about workspace options..."
                                rows={4}
                                id={`notes-${candidate.guestId}`}
                              />
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => {}}>
                                  Cancel
                                </Button>
                                <Button onClick={() => {
                                  const textarea = document.getElementById(`notes-${candidate.guestId}`) as HTMLTextAreaElement;
                                  handleRecommendGuest(candidate.guestId, textarea.value);
                                }}>
                                  Submit Recommendation
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    
                    {/* Conversion Score Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Conversion Likelihood</span>
                        <span>{candidate.conversionScore}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${candidate.conversionScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {data.conversionCandidates.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No high-potential candidates at the moment.</p>
                    <p className="text-sm">Keep hosting guests to find conversion opportunities!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Guest Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentActivity.map((activity) => (
                  <div key={`${activity.guestId}-${activity.checkedInAt}`} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{activity.guestName}</h3>
                        <p className="text-sm text-gray-600">{activity.company}</p>
                        <p className="text-xs text-gray-500">
                          Visited on {new Date(activity.checkedInAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {activity.isConverted ? (
                          <Badge variant="default">
                            <Trophy className="h-3 w-3 mr-1" />
                            Converted!
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {activity.tier} Visitor
                          </Badge>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.visitCount} visits • {activity.conversionScore}/100 score
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Potential Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <DollarSign className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-2xl font-bold text-green-600">
                  ${data.metrics.potentialRewards}
                </h3>
                <p className="text-gray-600">
                  Potential rewards from current candidates
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  $100 earned for each guest who becomes a host
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}