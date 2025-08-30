'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText } from 'lucide-react';

interface ExecutiveReport {
  period: {
    type: string;
    startDate: string;
    endDate: string;
    label: string;
  };
  metrics: {
    totalVisits: { value: number; change: number; previous: number };
    uniqueGuests: { value: number; change: number; previous: number };
    newGuests: { value: number; change: number; previous: number };
    totalInvitations: { value: number; change: number; previous: number };
    qrActivations: { value: number; change: number; previous: number };
    overrideCount: number;
    blacklistAdditions: number;
    discountsSent: number;
  };
  conversions: {
    invitationToActivation: number;
    activationToVisit: number;
    overallConversion: number;
  };
  topHosts: Array<{ id: string; name: string; email: string; visitCount: number }>;
  demographics: {
    countries: Array<{ country: string; count: number }>;
    contactMethods: Array<{ method: string; count: number }>;
  };
  systemHealth: {
    overrideRate: number;
    blacklistGrowth: number;
    emailDeliveryRate: number;
  };
  generatedAt: string;
}

interface ReportsTabProps {
  isActive?: boolean;
}

export default function ReportsTab({ isActive = false }: ReportsTabProps) {
  const [executiveReport, setExecutiveReport] = useState<ExecutiveReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('weekly');
  const { toast } = useToast();

  const loadExecutiveReport = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/reports?period=${reportPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setExecutiveReport(data);
        setHasLoaded(true);
      }
    } catch (error) {
      console.error('Error loading executive report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load executive report. Please refresh.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [reportPeriod, toast]);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadExecutiveReport();
    }
  }, [isActive, hasLoaded, loadExecutiveReport]);

  useEffect(() => {
    if (isActive && hasLoaded) {
      loadExecutiveReport();
    }
  }, [reportPeriod, isActive, hasLoaded, loadExecutiveReport]);

  if (!isActive || isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="h-6 w-48 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-64 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-9 w-40 bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-16 bg-muted rounded animate-pulse mb-1" />
                    <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Executive Summary Reports
            </CardTitle>
            <CardDescription>Comprehensive analytics and business insights</CardDescription>
          </div>
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {executiveReport ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Visits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{executiveReport.metrics.totalVisits.value}</div>
                  <p className={`text-xs ${executiveReport.metrics.totalVisits.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {executiveReport.metrics.totalVisits.change >= 0 ? '+' : ''}{executiveReport.metrics.totalVisits.change}% from previous period
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Unique Guests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{executiveReport.metrics.uniqueGuests.value}</div>
                  <p className={`text-xs ${executiveReport.metrics.uniqueGuests.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {executiveReport.metrics.uniqueGuests.change >= 0 ? '+' : ''}{executiveReport.metrics.uniqueGuests.change}% from previous period
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{executiveReport.conversions.overallConversion}%</div>
                  <p className="text-xs text-muted-foreground">Invitation to visit</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Countries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {executiveReport.demographics.countries.slice(0, 5).map((country) => (
                      <div key={country.country} className="flex items-center justify-between">
                        <span className="text-sm">{country.country}</span>
                        <Badge variant="outline">{country.count} visitors</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Override Rate</span>
                      <Badge variant={executiveReport.systemHealth.overrideRate > 10 ? "destructive" : "default"}>
                        {executiveReport.systemHealth.overrideRate}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">New Blacklists</span>
                      <Badge variant="outline">{executiveReport.systemHealth.blacklistGrowth}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Loading executive report...
          </p>
        )}
      </CardContent>
    </Card>
  );
}