'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Activity } from 'lucide-react';

interface Activity {
  type: string;
  timestamp: string;
  title: string;
  description: string;
  icon: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  data: Record<string, unknown>;
}

interface GuestJourney {
  guest: {
    id: string;
    name: string;
    email: string;
    country?: string;
    contactMethod?: string;
    contactValue?: string;
    createdAt: string;
    blacklistedAt?: string;
  };
  timeline: Activity[];
  summary: {
    totalVisits: number;
    totalInvitations: number;
    discountsEarned: number;
    isBlacklisted: boolean;
    lastVisit?: string;
    firstVisit?: string;
    averageVisitsPerMonth: number;
    mostFrequentHost?: { name: string; count: number };
  };
}

interface JourneyTabProps {
  selectedGuestId?: string;
  onClose?: () => void;
  isActive?: boolean;
}

export default function JourneyTab({ selectedGuestId, onClose, isActive = false }: JourneyTabProps) {
  const [selectedGuest, setSelectedGuest] = useState<GuestJourney | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { toast } = useToast();

  const loadGuestJourney = useCallback(async (guestId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/guests/${guestId}/journey`);
      if (response.ok) {
        const data = await response.json();
        setSelectedGuest(data);
        setHasLoaded(true);
      }
    } catch (error) {
      console.error('Error loading guest journey:', error);
      toast({
        title: 'Error',
        description: 'Failed to load guest journey. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
      'user-check': UserCheck,
      'activity': Activity,
    };
    
    const IconComponent = iconMap[iconName] || Activity;
    return <IconComponent className="h-4 w-4" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  useEffect(() => {
    if (isActive && selectedGuestId && !hasLoaded) {
      loadGuestJourney(selectedGuestId);
    } else if (!selectedGuestId) {
      setSelectedGuest(null);
      setHasLoaded(false);
    }
  }, [isActive, selectedGuestId, hasLoaded, loadGuestJourney]);

  useEffect(() => {
    // Reset hasLoaded when selectedGuestId changes
    if (selectedGuestId) {
      setHasLoaded(false);
    }
  }, [selectedGuestId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="h-6 w-48 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-64 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-9 w-16 bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-3">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedGuest) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Guest Journey: {selectedGuest.guest.name}
              </CardTitle>
              <CardDescription>
                Complete visit history and timeline for {selectedGuest.guest.email}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => {
              setSelectedGuest(null);
              onClose?.();
            }}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Visits</span>
                    <Badge variant="outline">{selectedGuest.summary.totalVisits}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Invitations</span>
                    <Badge variant="outline">{selectedGuest.summary.totalInvitations}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Discounts</span>
                    <Badge variant="outline">{selectedGuest.summary.discountsEarned}</Badge>
                  </div>
                  {selectedGuest.summary.mostFrequentHost && (
                    <div>
                      <span className="text-sm">Most Frequent Host</span>
                      <p className="text-xs text-muted-foreground">
                        {selectedGuest.summary.mostFrequentHost.name} ({selectedGuest.summary.mostFrequentHost.count} visits)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-3">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedGuest.timeline.map((event, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className={`p-2 rounded-full ${getSeverityColor(event.severity)}`}>
                      {getIconComponent(event.icon)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{event.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guest Journey</CardTitle>
        <CardDescription>Select a guest from the search results or guest management to view their journey</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground py-8">
          Use the global search above or click &quot;Journey&quot; button in Guest Management to view a guest&apos;s complete timeline.
        </p>
      </CardContent>
    </Card>
  );
}