'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminData } from '@/contexts/AdminDataContext';
import { UserCheck, Activity, Mail, QrCode, UserPlus, ShieldAlert, Gift, FileCheck, UserX, Ban, Users, ArrowRightLeft } from 'lucide-react';

interface JourneyTabProps {
  selectedGuestId?: string;
  onClose?: () => void;
  isActive?: boolean;
}

export default function JourneyTab({ selectedGuestId, onClose, isActive = false }: JourneyTabProps) {
  const { selectedGuest, isLoadingJourney, loadGuestJourney, clearSelectedGuest } = useAdminData();

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
      'user-check': UserCheck,
      'qr-code': QrCode,
      'user-plus': UserPlus,
      'ban': Ban,
      'shield-alert': ShieldAlert,
      'gift': Gift,
      'file-check': FileCheck,
      'user-x': UserX,
      'mail': Mail,
      'users': Users,
      'arrow-right-left': ArrowRightLeft,
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

  // Load guest journey when selectedGuestId changes
  useEffect(() => {
    if (isActive && selectedGuestId && selectedGuest?.guest?.id !== selectedGuestId) {
      loadGuestJourney(selectedGuestId);
    }
  }, [isActive, selectedGuestId, selectedGuest, loadGuestJourney]);

  // Show loading skeleton when loading
  if (isActive && isLoadingJourney) {
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
              clearSelectedGuest();
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
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
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
                    <div className="flex justify-between">
                      <span className="text-sm">Unique Hosts</span>
                      <Badge variant="outline">{selectedGuest.summary.uniqueHosts.total}</Badge>
                    </div>
                  </div>
                  
                  {/* Host Transfer Indicator */}
                  {selectedGuest.summary.hostTransferCount > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800">
                        {selectedGuest.summary.hostTransferCount} host transfer{selectedGuest.summary.hostTransferCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  
                  {/* Host Relationship Details */}
                  <div className="space-y-2 pt-2 border-t">
                    {selectedGuest.summary.mostFrequentHost && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Most Frequent Visit Host</span>
                        <p className="text-xs text-muted-foreground">
                          {selectedGuest.summary.mostFrequentHost.name} ({selectedGuest.summary.mostFrequentHost.count} visits)
                        </p>
                      </div>
                    )}
                    {selectedGuest.summary.mostFrequentInviter && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Most Frequent Inviter</span>
                        <p className="text-xs text-muted-foreground">
                          {selectedGuest.summary.mostFrequentInviter.name} ({selectedGuest.summary.mostFrequentInviter.count} invitations)
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-3">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedGuest.timeline.map((event, index) => {
                  return (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className={`p-2 rounded-full ${getSeverityColor(event.severity)}`}>
                      {getIconComponent(event.icon)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{event.title}</h4>
                          {/* Override Badge */}
                          {(event.data as any)?.overrideReason && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                              <ShieldAlert className="h-3 w-3 mr-1" />
                              Override
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      
                      {/* Additional Host Context */}
                      {(event.data as any)?.invitationHost && (event.data as any)?.isHostMismatch && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Mail className="h-3 w-3" />
                            <span>Originally invited by: {(event.data as any).invitationHost.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 mt-1">
                            <UserCheck className="h-3 w-3" />
                            <span>Visited: {(event.data as any).hostName}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
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