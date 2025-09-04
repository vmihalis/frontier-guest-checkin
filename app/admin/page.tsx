'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import './globals-responsive.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AdminDataProvider, useAdminData } from '@/contexts/AdminDataContext';
import { AdminNavigation } from '@/components/admin/AdminNavigation';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { PageCard } from '@/components/ui/page-card';
import { StatCard } from '@/components/ui/stat-card';
import { SearchInput } from '@/components/ui/search-input';
import { DataTable, type Column } from '@/components/ui/data-table';
// Import tab components
import OverviewTab from '@/components/admin/tabs/OverviewTab';
import ActivityTab from '@/components/admin/tabs/ActivityTab';
import GuestsTab from '@/components/admin/tabs/GuestsTab';
import ReportsTab from '@/components/admin/tabs/ReportsTab';
import PoliciesTab from '@/components/admin/tabs/PoliciesTab';
import AuditTab from '@/components/admin/tabs/AuditTab';
import JourneyTab from '@/components/admin/tabs/JourneyTab';
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
  Activity as ActivityIcon,
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

// Import shared types
import type {
  AdminStats,
  Activity,
  SearchResult,
  GuestJourney,
  ExecutiveReport,
  Policies,
  Guest,
  Location
} from '@/types/admin';

function AdminPageContent() {
  // Use centralized data context
  const {
    stats,
    activities,
    guests,
    policies,
    executiveReport,
    searchResults,
    selectedGuest,
    isLoadingStats,
    isLoadingActivities,
    isLoadingGuests,
    isLoadingPolicies,
    isLoadingReport,
    isSearching,
    isLoadingJourney,
    loadStats,
    loadActivities,
    loadGuests,
    loadPolicies,
    loadExecutiveReport,
    performSearch,
    loadGuestJourney,
    updatePolicies,
    blacklistToggle,
    clearSelectedGuest,
    refreshAll
  } = useAdminData();

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
            onClick={() => handleLoadGuestJourney(guest.id)}
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
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

  // Mark as loaded immediately to show UI - tabs handle their own loading now
  useEffect(() => {
    setIsInitialLoad(false);
  }, []);

  // Search and report period changes are now handled by individual tab components

  // Global search with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(globalSearchTerm);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [performSearch, globalSearchTerm]);
  
  // Update policy form when policies change
  useEffect(() => {
    if (policies) {
      setPolicyForm({
        guestMonthlyLimit: policies.guestMonthlyLimit,
        hostConcurrentLimit: policies.hostConcurrentLimit
      });
    }
  }, [policies]);

  const handlePolicyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updatePolicies(policyForm);
    if (success) {
      // Policy update successful - optimistic update already applied
    }
  };

  const handleBlacklistToggle = async (guestId: string, action: 'blacklist' | 'unblacklist') => {
    const success = await blacklistToggle(guestId, action);
    if (success) {
      // Blacklist update successful - optimistic update already applied
    }
  };

  // Wrap loadGuestJourney to also switch to journey tab
  const handleLoadGuestJourney = async (guestId: string) => {
    await loadGuestJourney(guestId);
    setActiveTab('journey');
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
      'activity': ActivityIcon,
    };
    
    const IconComponent = iconMap[iconName] || ActivityIcon;
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

  // Only show loading on initial page load, not on data refresh
  const isLoading = isInitialLoad;
  
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


  return (
    <div className="min-h-screen bg-gray-50 admin-container">
      <div className="container mx-auto px-4 py-8 space-y-8 main-content">
        {/* Header */}
        <AdminPageHeader 
          activeTab={activeTab}
          selectedLocationId={selectedLocationId}
          onLocationChange={setSelectedLocationId}
          locations={stats?.locations}
          onRefresh={refreshAll}
        />

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
                     onClick={() => result.type === 'guest' && handleLoadGuestJourney(result.id)}>
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
            <OverviewTab onDataLoaded={() => {}} />
          </TabsContent>

          {/* Live Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <ActivityTab isActive={activeTab === 'activity'} />
          </TabsContent>

          {/* Guest Management Tab */}
          <TabsContent value="guests" className="space-y-6">
            <GuestsTab 
              onViewJourney={handleLoadGuestJourney}
              isActive={activeTab === 'guests'}
            />
          </TabsContent>

          {/* Executive Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <ReportsTab 
              isActive={activeTab === 'reports'}
            />
          </TabsContent>

          {/* System Policies Tab */}
          <TabsContent value="policies" className="space-y-6">
            <PoliciesTab 
              isActive={activeTab === 'policies'}
            />
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-6">
            <AuditTab 
              recentOverrides={stats?.recentOverrides} 
              isActive={activeTab === 'audit'}
            />
          </TabsContent>

          {/* Guest Journey Tab */}
          <TabsContent value="journey" className="space-y-6">
            <JourneyTab 
              selectedGuestId={selectedGuest?.guest?.id} 
              onClose={clearSelectedGuest}
              isActive={activeTab === 'journey'}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminDataProvider>
      <AdminPageContent />
    </AdminDataProvider>
  );
}