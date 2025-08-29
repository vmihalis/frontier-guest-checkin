'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserCheck, 
  Shield, 
  Settings, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Search,
  Ban,
  RotateCcw
} from 'lucide-react';

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

interface Policies {
  id: number;
  guestMonthlyLimit: number;
  hostConcurrentLimit: number;
  updatedAt: string;
}

interface Guest {
  id: string;
  name: string;
  email: string;
  country?: string;
  isBlacklisted: boolean;
  recentVisits: number;
  lifetimeVisits: number;
  lastVisitDate?: string;
  hasDiscount: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [policies, setPolicies] = useState<Policies | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBlacklisted, setShowBlacklisted] = useState(false);
  const { toast } = useToast();

  // Policy form state
  const [policyForm, setPolicyForm] = useState({
    guestMonthlyLimit: 3,
    hostConcurrentLimit: 3
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [statsRes, policiesRes, guestsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/policies'),
        fetch(`/api/admin/guests?query=${searchTerm}&blacklisted=${showBlacklisted}`)
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (policiesRes.ok) {
        const policiesData = await policiesRes.json();
        setPolicies(policiesData);
        setPolicyForm({
          guestMonthlyLimit: policiesData.guestMonthlyLimit,
          hostConcurrentLimit: policiesData.hostConcurrentLimit
        });
      }

      if (guestsRes.ok) {
        const guestsData = await guestsRes.json();
        setGuests(guestsData.guests || []);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load admin data. Please refresh the page.' 
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, showBlacklisted, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePolicyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyForm)
      });

      const data = await response.json();

      if (response.ok) {
        toast({ 
          title: 'Success', 
          description: 'Policies updated successfully!' 
        });
        setPolicies(data.policies);
      } else {
        toast({ 
          title: 'Error', 
          description: data.error || 'Failed to update policies' 
        });
      }
    } catch {
      toast({ 
        title: 'Error', 
        description: 'Network error. Please try again.' 
      });
    }
  };

  const handleBlacklistToggle = async (guestId: string, action: 'blacklist' | 'unblacklist') => {
    try {
      const response = await fetch(`/api/admin/guests/${guestId}/blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();

      if (response.ok) {
        toast({ 
          title: 'Success', 
          description: data.message 
        });
        loadData();
      } else {
        toast({ 
          title: 'Error', 
          description: data.error || 'Failed to update blacklist status' 
        });
      }
    } catch {
      toast({ 
        title: 'Error', 
        description: 'Network error. Please try again.' 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Frontier Tower - Admin Dashboard</h1>
            <p className="text-muted-foreground">System administration and analytics</p>
          </div>
          <Badge variant="default" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Admin Access
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="guests">Guest Management</TabsTrigger>
            <TabsTrigger value="policies">System Policies</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {stats && (
              <>
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
              </>
            )}
          </TabsContent>

          {/* Guest Management Tab */}
          <TabsContent value="guests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Guest Management</CardTitle>
                <CardDescription>Search and manage guest accounts</CardDescription>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search guests by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    variant={showBlacklisted ? "default" : "outline"}
                    onClick={() => setShowBlacklisted(!showBlacklisted)}
                  >
                    {showBlacklisted ? "Show All" : "Show Blacklisted"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {guests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {searchTerm ? 'No guests found matching your search.' : 'No guests found.'}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guest</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Visits (30d)</TableHead>
                        <TableHead>Total Visits</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {guests.map((guest) => (
                        <TableRow key={guest.id}>
                          <TableCell className="font-medium">{guest.name}</TableCell>
                          <TableCell>{guest.email}</TableCell>
                          <TableCell>{guest.country || 'Unknown'}</TableCell>
                          <TableCell>{guest.recentVisits}</TableCell>
                          <TableCell>{guest.lifetimeVisits}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {guest.isBlacklisted && (
                                <Badge variant="destructive">Blacklisted</Badge>
                              )}
                              {guest.hasDiscount && (
                                <Badge variant="success">Discount</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {guest.isBlacklisted ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBlacklistToggle(guest.id, 'unblacklist')}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Unban
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleBlacklistToggle(guest.id, 'blacklist')}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Blacklist
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Policies Tab */}
          <TabsContent value="policies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Policies
                </CardTitle>
                <CardDescription>
                  Configure business rules and limits for the guest check-in system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePolicyUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="guestMonthlyLimit">Guest Monthly Limit</Label>
                      <Input
                        id="guestMonthlyLimit"
                        type="number"
                        min="1"
                        max="100"
                        value={policyForm.guestMonthlyLimit}
                        onChange={(e) => setPolicyForm({
                          ...policyForm,
                          guestMonthlyLimit: parseInt(e.target.value)
                        })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum visits per guest in a 30-day rolling window
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hostConcurrentLimit">Host Concurrent Limit</Label>
                      <Input
                        id="hostConcurrentLimit"
                        type="number"
                        min="1"
                        max="50"
                        value={policyForm.hostConcurrentLimit}
                        onChange={(e) => setPolicyForm({
                          ...policyForm,
                          hostConcurrentLimit: parseInt(e.target.value)
                        })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum active guests per host at any time
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Current Settings</p>
                        {policies && (
                          <p className="text-sm text-muted-foreground">
                            Last updated: {new Date(policies.updatedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Button type="submit">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Update Policies
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Override Activities</CardTitle>
                <CardDescription>Security override actions in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.recentOverrides && stats.recentOverrides.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guest</TableHead>
                        <TableHead>Host</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Override By</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentOverrides.map((override) => (
                        <TableRow key={override.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{override.guestName}</p>
                              <p className="text-sm text-muted-foreground">{override.guestEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>{override.hostName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{override.overrideReason}</Badge>
                          </TableCell>
                          <TableCell>{override.overrideBy}</TableCell>
                          <TableCell>
                            {new Date(override.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No override activities in the last 30 days.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}