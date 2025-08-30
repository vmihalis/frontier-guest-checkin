'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, UserCheck, TrendingUp, AlertTriangle } from 'lucide-react';

interface AdminStats {
  overview: {
    totalGuests: number;
    totalVisits: number;
    activeVisits: number;
    todayVisits: number;
    weekVisits: number;
    monthVisits: number;
  };
  invitations: {
    total: number;
    pending: number;
    activated: number;
    checkedIn: number;
  };
  system: {
    blacklistedGuests: number;
    discountsSent: number;
    overrideCount: number;
  };
  topHosts: Array<{
    id: string;
    name: string;
    email: string;
    visitCount: number;
  }>;
  dailyTrends: Array<{
    date: string;
    visits: number;
  }>;
  recentOverrides: Array<{
    id: string;
    guestName: string;
    guestEmail: string;
    hostName: string;
    overrideReason: string;
    overrideBy: string;
    createdAt: string;
  }>;
}

interface OverviewTabProps {
  onDataLoaded?: () => void;
}

export default function OverviewTab({ onDataLoaded }: OverviewTabProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        // Signal that data is loaded
        onDataLoaded?.();
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load overview stats. Please refresh.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, onDataLoaded]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded animate-pulse mb-1" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalGuests}</div>
            <p className="text-xs text-muted-foreground">
              Registered visitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.activeVisits}</div>
            <p className="text-xs text-muted-foreground">
              Currently in building
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Visits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.todayVisits}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.overview.weekVisits - stats.overview.todayVisits} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.system.blacklistedGuests}</div>
            <p className="text-xs text-muted-foreground">
              Blacklisted guests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Hosts</CardTitle>
            <CardDescription>Most active hosts by visit count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topHosts.slice(0, 5).map((host, index) => (
                <div key={host.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{host.name}</p>
                      <p className="text-sm text-muted-foreground">{host.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{host.visitCount} visits</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Trend</CardTitle>
            <CardDescription>Daily visit counts for the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.dailyTrends.map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-muted h-2 rounded">
                      <div 
                        className="bg-primary h-2 rounded" 
                        style={{ 
                          width: `${(day.visits / Math.max(...stats.dailyTrends.map(d => d.visits))) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8">{day.visits}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}