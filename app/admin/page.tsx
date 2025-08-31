'use client';

import { useState, useEffect, useCallback } from 'react';
import './globals-responsive.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AdminNavigation } from '@/components/admin/AdminNavigation';
import { PageCard } from '@/components/ui/page-card';
import { StatCard } from '@/components/ui/stat-card';
import { SearchInput } from '@/components/ui/search-input';
import { DataTable, type Column } from '@/components/ui/data-table';
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
  RotateCcw,
  Activity,
  FileText,
  Globe,
  Filter,
  RefreshCw,
  Mail,
  QrCode,
  UserPlus,
  ShieldAlert,
  Gift,
  FileCheck,
  UserX,
  Eye
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';

interface Location {
  id: string;
  name: string;
}

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
    location?: Location;
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
    locationName: string;
    overrideReason: string;
    overrideBy: string;
    createdAt: string;
  }>;
  // Location context
  locations: Location[];
  currentLocation: Location | null;
  isLocationFiltered: boolean;
}

interface Activity {
  type: string;
  timestamp: string;
  title: string;
  description: string;
  icon: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  data: Record<string, unknown>;
}

interface SearchResult {
  type: 'guest' | 'host' | 'visit';
  id: string;
  title: string;
  subtitle: string;
  description: string;
  data: Record<string, unknown>;
  relevanceScore: number;
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

  // Define columns for guest table
  const guestColumns: Column<Guest>[] = [
    { key: 'name', label: 'Guest', className: 'font-medium' },
    { key: 'email', label: 'Email' },
    { key: 'country', label: 'Country', render: (value) => value || 'Unknown' },
    { key: 'recentVisits', label: 'Visits (30d)' },
    { key: 'lifetimeVisits', label: 'Total Visits' },
    {
      key: 'status',
      label: 'Status',
      render: (_, guest) => (
        <div className="flex gap-1">
          {guest.isBlacklisted && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-800 border border-red-200">
              Blacklisted
            </span>
          )}
          {guest.hasDiscount && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-800 border border-green-200">
              Discount
            </span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, guest) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadGuestJourney(guest.id)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Journey
          </Button>
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
        </div>
      ),
      className: 'flex gap-2'
    }
  ];
  const [activities, setActivities] = useState<Activity[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<GuestJourney | null>(null);
  const [executiveReport, setExecutiveReport] = useState<ExecutiveReport | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showBlacklisted, setShowBlacklisted] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('weekly');
  const [quickFilter, setQuickFilter] = useState('all');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  
  const { toast } = useToast();

  // Policy form state
  const [policyForm, setPolicyForm] = useState({
    guestMonthlyLimit: 3,
    hostConcurrentLimit: 3
  });

  // Activity feed auto-refresh
  const [, setActivityRefresh] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Build stats URL with optional location filter
      const statsUrl = selectedLocationId && selectedLocationId !== 'all'
        ? `/api/admin/stats?location=${selectedLocationId}`
        : '/api/admin/stats';
      
      const [statsRes, policiesRes, guestsRes] = await Promise.all([
        fetch(statsUrl),
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
  }, [searchTerm, showBlacklisted, selectedLocationId, toast]);

  const loadActivities = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/activity');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  }, []);

  const loadExecutiveReport = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/reports?period=${reportPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setExecutiveReport(data);
      }
    } catch (error) {
      console.error('Error loading executive report:', error);
    }
  }, [reportPeriod]);

  const performGlobalSearch = useCallback(async () => {
    if (!globalSearchTerm || globalSearchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(globalSearchTerm)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Error performing global search:', error);
    }
  }, [globalSearchTerm]);

  const loadGuestJourney = useCallback(async (guestId: string) => {
    try {
      const response = await fetch(`/api/admin/guests/${guestId}/journey`);
      if (response.ok) {
        const data = await response.json();
        setSelectedGuest(data);
      }
    } catch (error) {
      console.error('Error loading guest journey:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadActivities();
    const interval = setInterval(() => {
      setActivityRefresh(prev => prev + 1);
      loadActivities();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [loadActivities]);

  useEffect(() => {
    loadExecutiveReport();
  }, [loadExecutiveReport]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performGlobalSearch();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [performGlobalSearch]);

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

  const getFilteredGuests = () => {
    let filtered = guests;
    
    switch (quickFilter) {
      case 'frequent':
        filtered = guests.filter(g => g.lifetimeVisits >= 3);
        break;
      case 'new':
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filtered = guests.filter(g => new Date(g.createdAt) >= sevenDaysAgo);
        break;
      case 'blacklisted':
        filtered = guests.filter(g => g.isBlacklisted);
        break;
      default:
        break;
    }
    
    return filtered;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <Logo size="lg" className="mx-auto mb-4" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-800">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const getActiveTabLabel = (tab: string): string => {
    const tabLabels: Record<string, string> = {
      overview: 'Overview',
      activity: 'Live Activity',
      guests: 'Guest Management',
      reports: 'Analytics Reports',
      policies: 'System Policies',
      audit: 'Access Log',
      journey: 'Guest Journey'
    };
    return tabLabels[tab] || 'Overview';
  };

  return (
    <div className="min-h-screen bg-gray-50 admin-container">
      <div className="container mx-auto px-4 py-8 space-y-8 main-content">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 admin-header">
          <div className="flex items-center gap-4 w-full">
            {/* Mobile Menu Button */}
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Logo size="sm" className="rounded-lg" />
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold text-gray-800">Frontier Tower</h1>
                  {/* Show current section on mobile */}
                  <p className="text-sm md:hidden text-blue-600 font-medium capitalize">{getActiveTabLabel(activeTab)}</p>
                </div>
              </div>
              <p className="text-lg text-gray-800 hidden md:block">Tower Operations & Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Location Selector */}
            {stats?.locations && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-600" />
                <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                  <SelectTrigger className="w-48 bg-white location-selector">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {stats.locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Admin Access</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadData();
                loadActivities();
                loadExecutiveReport();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Global Search */}
        <PageCard 
          title="Global Search" 
          description="Search across guests, hosts, and visits"
          icon={Globe}
        >
          <div className="flex gap-2">
            <SearchInput
              placeholder="Search guests, hosts, visits..."
              value={globalSearchTerm}
              onChange={setGlobalSearchTerm}
              className="flex-1"
            />
          </div>
            
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((result) => (
                <div key={`${result.type}-${result.id}`} className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                     onClick={() => result.type === 'guest' && loadGuestJourney(result.id)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{result.title}</p>
                      <p className="text-sm text-gray-600">{result.subtitle}</p>
                      <p className="text-xs text-gray-500">{result.description}</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                      {result.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>

        {/* Navigation Component */}
        <AdminNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {stats && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stats-grid">
                  <StatCard
                    title="Total Guests"
                    value={stats.overview.totalGuests}
                    description="Registered visitors"
                    icon={Users}
                    iconColor="blue"
                  />

                  <StatCard
                    title="Active Now"
                    value={stats.overview.activeVisits}
                    description="Currently in building"
                    icon={UserCheck}
                    iconColor="green"
                  />

                  <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Today&apos;s Visits</CardTitle>
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-800">{stats.overview.todayVisits}</div>
                      <p className="text-xs text-gray-600">
                        +{stats.overview.weekVisits - stats.overview.todayVisits} this week
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Security Alerts</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-800">{stats.system.blacklistedGuests}</div>
                      <p className="text-xs text-gray-600">
                        Restricted visitors
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts and Additional Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PageCard 
                    title="Top Hosts" 
                    description="Most active hosts by visit count"
                  >
                    <div className="space-y-3">
                      {stats.topHosts.slice(0, 5).map((host, index) => (
                        <div key={host.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-800">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{host.name}</p>
                              <p className="text-sm text-gray-600">{host.email}</p>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                            {host.visitCount} visits
                          </span>
                        </div>
                      ))}
                    </div>
                  </PageCard>

                  <PageCard 
                    title="Weekly Trend" 
                    description="Daily visit counts for the past week"
                  >
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
                  </PageCard>
                </div>
              </>
            )}
          </TabsContent>

          {/* Live Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <PageCard 
              title="Live Activity Feed" 
              description="Recent system events and activities"
              icon={Activity}
              headerClassName="pb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div></div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-800 border border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Auto-refresh: 30s
                  </span>
                  <Button variant="outline" size="sm" onClick={loadActivities}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {activities.length === 0 ? (
                    <p className="text-center text-gray-800 py-8">
                      No recent activity found.
                    </p>
                  ) : (
                    activities.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted">
                        <div className={`p-2 rounded-full ${getSeverityColor(activity.severity)}`}>
                          {getIconComponent(activity.icon)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{activity.title}</h4>
                            <span className="text-xs text-gray-500">
                              {new Date(activity.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
            </PageCard>
          </TabsContent>

          {/* Guest Management Tab */}
          <TabsContent value="guests" className="space-y-6">
            <PageCard 
              title="Guest Management" 
              description="Search and manage guest accounts"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <SearchInput
                    placeholder="Search guests by name or email..."
                    value={searchTerm}
                    onChange={setSearchTerm}
                    className="flex-1 min-w-64"
                  />
                  
                  <Select value={quickFilter} onValueChange={setQuickFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Guests</SelectItem>
                      <SelectItem value="frequent">Frequent Visitors</SelectItem>
                      <SelectItem value="new">New (7 days)</SelectItem>
                      <SelectItem value="blacklisted">Blacklisted</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant={showBlacklisted ? "default" : "outline"}
                    onClick={() => setShowBlacklisted(!showBlacklisted)}
                  >
                    {showBlacklisted ? "Show All" : "Show Blacklisted"}
                  </Button>
                </div>

                <DataTable
                  data={getFilteredGuests()}
                  columns={guestColumns}
                  emptyMessage={searchTerm ? 'No guests found matching your search.' : 'No guests found.'}
                />
              </div>
            </PageCard>
          </TabsContent>

          {/* Executive Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                      <FileText className="h-6 w-6 text-blue-600" />
                      Tower Analytics Reports
                    </CardTitle>
                    <CardDescription className="text-gray-800">Comprehensive visitor metrics and operational insights</CardDescription>
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
                      <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-700">Total Visits</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-gray-800">{executiveReport.metrics.totalVisits.value}</div>
                          <p className={`text-xs ${executiveReport.metrics.totalVisits.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {executiveReport.metrics.totalVisits.change >= 0 ? '+' : ''}{executiveReport.metrics.totalVisits.change}% from previous period
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-700">Unique Guests</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-gray-800">{executiveReport.metrics.uniqueGuests.value}</div>
                          <p className={`text-xs ${executiveReport.metrics.uniqueGuests.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {executiveReport.metrics.uniqueGuests.change >= 0 ? '+' : ''}{executiveReport.metrics.uniqueGuests.change}% from previous period
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-700">Conversion Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-gray-800">{executiveReport.conversions.overallConversion}%</div>
                          <p className="text-xs text-gray-600">Invitation to visit</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
                        <CardHeader>
                          <CardTitle className="text-2xl font-bold text-gray-800">Top Countries</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {executiveReport.demographics.countries.slice(0, 5).map((country) => (
                              <div key={country.country} className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">{country.country}</span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                                  {country.count} visitors
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
                        <CardHeader>
                          <CardTitle className="text-2xl font-bold text-gray-800">Access Operations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Security Approvals</span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                executiveReport.systemHealth.overrideRate > 10 
                                  ? 'bg-red-50 text-red-800 border border-red-200' 
                                  : 'bg-green-50 text-green-800 border border-green-200'
                              }`}>
                                {executiveReport.systemHealth.overrideRate}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">New Restrictions</span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                {executiveReport.systemHealth.blacklistGrowth}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-800 py-8">
                    Loading executive report...
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Policies Tab */}
          <TabsContent value="policies" className="space-y-6">
            <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                  <Settings className="h-6 w-6 text-blue-600" />
                  System Policies
                </CardTitle>
                <CardDescription className="text-gray-800">
                  Configure business rules and limits for the guest check-in system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePolicyUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="guestMonthlyLimit" className="text-sm font-medium text-gray-700">Guest Monthly Limit</Label>
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
                      <p className="text-xs text-gray-600">
                        Maximum visits per guest in a 30-day rolling window
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hostConcurrentLimit" className="text-sm font-medium text-gray-700">Host Concurrent Limit</Label>
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
                      <p className="text-xs text-gray-600">
                        Maximum active guests per host at any time
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Current Settings</p>
                        {policies && (
                          <p className="text-sm text-gray-600">
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
            <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-800">Recent Access Approvals</CardTitle>
                <CardDescription className="text-gray-800">Security override activities in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.recentOverrides && stats.recentOverrides.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guest</TableHead>
                        <TableHead>Host</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Approved By</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentOverrides.map((override) => (
                        <TableRow key={override.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{override.guestName}</p>
                              <p className="text-sm text-gray-600">{override.guestEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>{override.hostName}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
                              {override.overrideReason}
                            </span>
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
                  <p className="text-center text-gray-800 py-8">
                    No security approvals in the last 30 days.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Guest Journey Tab */}
          <TabsContent value="journey" className="space-y-6">
            {selectedGuest ? (
              <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                        <UserCheck className="h-6 w-6 text-blue-600" />
                        Guest Journey: {selectedGuest.guest.name}
                      </CardTitle>
                      <CardDescription className="text-gray-800">
                        Complete visit history and timeline for {selectedGuest.guest.email}
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setSelectedGuest(null)}>
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1">
                      <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium text-gray-700">Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm">Total Visits</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                              {selectedGuest.summary.totalVisits}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Invitations</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200">
                              {selectedGuest.summary.totalInvitations}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Discounts</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-800 border border-green-200">
                              {selectedGuest.summary.discountsEarned}
                            </span>
                          </div>
                          {selectedGuest.summary.mostFrequentHost && (
                            <div>
                              <span className="text-sm">Most Frequent Host</span>
                              <p className="text-xs text-gray-600">
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
                                <span className="text-xs text-gray-500">
                                  {new Date(event.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-800">Guest Journey</CardTitle>
                  <CardDescription className="text-gray-800">Select a guest from the search results or guest management to view their journey</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-800 py-8">
                    Use the global search above or click &quot;Journey&quot; button in Guest Management to view a guest&apos;s complete timeline.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}