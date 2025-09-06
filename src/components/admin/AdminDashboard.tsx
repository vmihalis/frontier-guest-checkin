'use client';

import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Search,
  RefreshCw,
  Globe
} from 'lucide-react';

// Import overview tab immediately since it's the default active tab
import OverviewTab from './tabs/OverviewTab';
// Import skeleton for initial loading
import { AdminSkeleton } from './AdminSkeleton';
// Import error boundary for tab error handling
import { TabErrorBoundary } from './TabErrorBoundary';

// Lazy load tab components only when needed
const ActivityTab = lazy(() => import('./tabs/ActivityTab'));
const GuestsTab = lazy(() => import('./tabs/GuestsTab'));
const ReportsTab = lazy(() => import('./tabs/ReportsTab'));
const PoliciesTab = lazy(() => import('./tabs/PoliciesTab'));
const AuditTab = lazy(() => import('./tabs/AuditTab'));

// Import modal component for guest journey
import GuestJourneyModal from './GuestJourneyModal';

// Loading component for lazy-loaded tabs
const TabLoading = () => (
  <div className="flex justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

interface SearchResult {
  type: 'guest' | 'host' | 'visit';
  id: string;
  title: string;
  subtitle: string;
  description: string;
  data: Record<string, unknown>;
  relevanceScore: number;
}

export default function AdminDashboard() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isOverviewDataLoaded, setIsOverviewDataLoaded] = useState(false);
  const [prefetchedTabs, setPrefetchedTabs] = useState<Set<string>>(new Set());
  
  // Modal state for guest journey
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  

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

  // Prefetch tab components in the background
  const prefetchTab = useCallback(async (tabName: string) => {
    if (prefetchedTabs.has(tabName)) return;
    
    try {
      switch (tabName) {
        case 'activity':
          await import('./tabs/ActivityTab');
          break;
        case 'guests':
          await import('./tabs/GuestsTab');
          break;
        case 'reports':
          await import('./tabs/ReportsTab');
          break;
        case 'policies':
          await import('./tabs/PoliciesTab');
          break;
        case 'audit':
          await import('./tabs/AuditTab');
          break;
      }
      setPrefetchedTabs(prev => new Set([...prev, tabName]));
    } catch (error) {
      console.warn(`Failed to prefetch tab: ${tabName}`, error);
    }
  }, [prefetchedTabs]);

  // Handle tab changes with smart loading
  const handleTabChange = useCallback((tabName: string) => {
    setActiveTab(tabName);
    
    // Prefetch likely next tabs based on current tab
    const prefetchMap: Record<string, string[]> = {
      overview: ['activity', 'guests'], // Most common flow
      activity: ['guests', 'reports'],
      guests: ['reports'],
      reports: ['policies'],
      policies: ['audit'],
      audit: []
    };
    
    prefetchMap[tabName]?.forEach(nextTab => {
      // Delay prefetching to not interfere with current tab loading
      setTimeout(() => prefetchTab(nextTab), 100);
    });
  }, [prefetchTab]);

  const handleGuestJourneyView = (guestId: string) => {
    setSelectedGuestId(guestId);
    setIsGuestModalOpen(true);
  };

  const handleCloseGuestModal = () => {
    setIsGuestModalOpen(false);
    setSelectedGuestId(null);
  };

  const handleRefreshAll = () => {
    // Clear prefetch cache and reload overview data
    setPrefetchedTabs(new Set());
    setIsOverviewDataLoaded(false);
    window.location.reload();
  };

  const handleOverviewDataLoaded = () => {
    setIsOverviewDataLoaded(true);
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performGlobalSearch();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [performGlobalSearch]);

  // Start prefetching commonly used tabs after overview loads
  useEffect(() => {
    if (isOverviewDataLoaded) {
      // Prefetch activity tab since it's the most likely next tab to be visited
      setTimeout(() => prefetchTab('activity'), 500);
    }
  }, [isOverviewDataLoaded, prefetchTab]);

  // Show skeleton until overview data is loaded
  if (!isOverviewDataLoaded) {
    return (
      <>
        <AdminSkeleton />
        {/* Hidden overview tab that loads data in background */}
        <div style={{ display: 'none' }}>
          <OverviewTab onDataLoaded={handleOverviewDataLoaded} />
        </div>
      </>
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
          <div className="flex items-center gap-4">
            <Badge variant="default" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Access
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Global Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Global Search
            </CardTitle>
            <CardDescription>Search across guests, hosts, and visits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search guests, hosts, visits..."
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((result) => (
                  <div key={`${result.type}-${result.id}`} className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                       onClick={() => result.type === 'guest' && handleGuestJourneyView(result.id)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{result.title}</p>
                        <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                        <p className="text-xs text-muted-foreground">{result.description}</p>
                      </div>
                      <Badge variant="outline">{result.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Live Activity</TabsTrigger>
            <TabsTrigger value="guests">Guest Management</TabsTrigger>
            <TabsTrigger value="reports">Executive Reports</TabsTrigger>
            <TabsTrigger value="policies">System Policies</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab onDataLoaded={handleOverviewDataLoaded} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <TabErrorBoundary tabName="Activity">
              <Suspense fallback={<TabLoading />}>
                <ActivityTab isActive={activeTab === 'activity'} />
              </Suspense>
            </TabErrorBoundary>
          </TabsContent>

          <TabsContent value="guests" className="space-y-6">
            <TabErrorBoundary tabName="Guest Management">
              <Suspense fallback={<TabLoading />}>
                <GuestsTab 
                  onViewJourney={handleGuestJourneyView}
                  isActive={activeTab === 'guests'}
                />
              </Suspense>
            </TabErrorBoundary>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <TabErrorBoundary tabName="Executive Reports">
              <Suspense fallback={<TabLoading />}>
                <ReportsTab isActive={activeTab === 'reports'} />
              </Suspense>
            </TabErrorBoundary>
          </TabsContent>

          <TabsContent value="policies" className="space-y-6">
            <TabErrorBoundary tabName="System Policies">
              <Suspense fallback={<TabLoading />}>
                <PoliciesTab isActive={activeTab === 'policies'} />
              </Suspense>
            </TabErrorBoundary>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <TabErrorBoundary tabName="Audit Log">
              <Suspense fallback={<TabLoading />}>
                <AuditTab isActive={activeTab === 'audit'} />
              </Suspense>
            </TabErrorBoundary>
          </TabsContent>

        </Tabs>
        
        {/* Guest Journey Modal */}
        <GuestJourneyModal
          isOpen={isGuestModalOpen}
          guestId={selectedGuestId}
          onClose={handleCloseGuestModal}
        />
      </div>
    </div>
  );
}