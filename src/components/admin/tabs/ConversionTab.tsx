"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Award,
  Clock,
  Mail,
  PhoneCall,
  Calendar
} from "lucide-react";

interface ConversionAnalytics {
  overview: {
    totalGuests: number;
    convertedGuests: number;
    conversionRate: number;
    averageConversionTime: number;
  };
  candidates: Array<{
    guestId: string;
    email: string;
    name: string;
    company: string;
    conversionScore: number;
    currentTier: string;
    totalVisits: number;
    recentVisits: number;
    lastVisitDate: string;
  }>;
  funnelMetrics: {
    totalVisitors: number;
    returningVisitors: number;
    returningRate: number;
    surveyResponders: number;
    surveyRate: number;
    interestedGuests: number;
    interestRate: number;
    outreachContacts: number;
    outreachRate: number;
    conversions: number;
    conversionRate: number;
  };
  recentConversions: Array<{
    id: string;
    email: string;
    name: string;
    company: string;
    becameHostAt: string;
    hostUser: {
      name: string;
      email: string;
    };
  }>;
}

export default function ConversionTab() {
  const [analytics, setAnalytics] = useState<ConversionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30");
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  useEffect(() => {
    fetchConversionAnalytics();
  }, [timeRange, selectedLocation]);

  const fetchConversionAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (timeRange) params.append('period', timeRange);
      if (selectedLocation) params.append('location', selectedLocation);
      
      const response = await fetch(`/api/admin/analytics/conversion?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversion analytics');
      }
      
      const result = await response.json();
      setAnalytics(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleOutreach = async (guestId: string, action: string) => {
    try {
      await fetch(`/api/admin/analytics/guests/${guestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logEvent',
          eventType: action === 'email' ? 'OUTREACH_EMAIL_SENT' : 'FOLLOW_UP_MEETING',
          touchpoint: action,
          outcome: 'scheduled'
        })
      });
      fetchConversionAnalytics(); // Refresh data
    } catch (error) {
      console.error('Error logging outreach:', error);
    }
  };

  if (loading) return <div className="p-6">Loading conversion analytics...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!analytics) return <div className="p-6">No data available</div>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Conversion Analytics</h2>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchConversionAnalytics} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Guests"
          value={analytics.overview.totalGuests.toString()}
          description="All registered guests"
          icon={Users}
          trend={{ value: 0, positive: true }}
        />
        <StatCard
          title="Converted Guests"
          value={analytics.overview.convertedGuests.toString()}
          description="Guests who became hosts"
          icon={Target}
          trend={{ value: 0, positive: true }}
        />
        <StatCard
          title="Conversion Rate"
          value={`${analytics.overview.conversionRate}%`}
          description="Guest to host conversion"
          icon={TrendingUp}
          trend={{ value: 0, positive: true }}
        />
        <StatCard
          title="Avg. Conversion Time"
          value={`${Math.round(analytics.overview.averageConversionTime)} days`}
          description="Average conversion time"
          icon={Clock}
          trend={{ value: 0, positive: false }}
        />
      </div>

      <Tabs defaultValue="candidates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="candidates">Top Candidates</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="conversions">Recent Conversions</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>High-Potential Conversion Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.candidates.map((candidate) => (
                  <div key={candidate.guestId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-semibold">{candidate.name || candidate.email}</h3>
                            <p className="text-sm text-gray-600">{candidate.company}</p>
                          </div>
                          <Badge 
                            variant={candidate.currentTier === 'PLATINUM' ? 'default' : 
                                   candidate.currentTier === 'GOLD' ? 'secondary' : 'outline'}
                          >
                            {candidate.currentTier}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <span>Score: {candidate.conversionScore}/100</span>
                          <span>Visits: {candidate.totalVisits}</span>
                          <span>Recent: {candidate.recentVisits}</span>
                          <span>Last: {new Date(candidate.lastVisitDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOutreach(candidate.guestId, 'email')}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleOutreach(candidate.guestId, 'meeting')}
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                    
                    {/* Conversion Score Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${candidate.conversionScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <FunnelStage
                  title="Total Visitors"
                  value={analytics.funnelMetrics.totalVisitors}
                  percentage={100}
                  color="bg-blue-500"
                />
                <FunnelStage
                  title="Returning Visitors"
                  value={analytics.funnelMetrics.returningVisitors}
                  percentage={analytics.funnelMetrics.returningRate}
                  color="bg-blue-400"
                />
                <FunnelStage
                  title="Survey Responders"
                  value={analytics.funnelMetrics.surveyResponders}
                  percentage={analytics.funnelMetrics.surveyRate}
                  color="bg-green-500"
                />
                <FunnelStage
                  title="Interested Guests"
                  value={analytics.funnelMetrics.interestedGuests}
                  percentage={analytics.funnelMetrics.interestRate}
                  color="bg-yellow-500"
                />
                <FunnelStage
                  title="Outreach Contacts"
                  value={analytics.funnelMetrics.outreachContacts}
                  percentage={analytics.funnelMetrics.outreachRate}
                  color="bg-orange-500"
                />
                <FunnelStage
                  title="Conversions"
                  value={analytics.funnelMetrics.conversions}
                  percentage={analytics.funnelMetrics.conversionRate}
                  color="bg-red-500"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.recentConversions.map((conversion) => (
                  <div key={conversion.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{conversion.name || conversion.email}</h3>
                        <p className="text-sm text-gray-600">{conversion.company}</p>
                        <p className="text-xs text-gray-500">
                          Converted on {new Date(conversion.becameHostAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="default">
                          <Award className="h-3 w-3 mr-1" />
                          Converted
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          Now hosting as: {conversion.hostUser.name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface FunnelStageProps {
  title: string;
  value: number;
  percentage: number;
  color: string;
}

function FunnelStage({ title, value, percentage, color }: FunnelStageProps) {
  return (
    <div className="flex items-center space-x-4">
      <div className="w-32 text-sm font-medium">{title}</div>
      <div className="flex-1">
        <div className="w-full bg-gray-200 rounded-full h-8 relative">
          <div 
            className={`${color} h-8 rounded-full transition-all duration-500 flex items-center justify-between px-3`}
            style={{ width: `${Math.max(percentage, 5)}%` }}
          >
            <span className="text-white text-sm font-medium">{value}</span>
            <span className="text-white text-sm">{Math.round(percentage)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}