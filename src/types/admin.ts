// Shared type definitions for admin dashboard and related components

export interface Location {
  id: string;
  name: string;
}

export interface AdminStats {
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

export interface Activity {
  type: string;
  timestamp: string;
  title: string;
  description: string;
  icon: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  data: Record<string, unknown>;
}

export interface SearchResult {
  type: 'guest' | 'host' | 'visit';
  id: string;
  title: string;
  subtitle: string;
  description: string;
  data: Record<string, unknown>;
  relevanceScore: number;
}

export interface GuestJourney {
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

export interface ExecutiveReport {
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

export interface Policies {
  id: number;
  guestMonthlyLimit: number;
  hostConcurrentLimit: number;
  updatedAt: string;
}

export interface Guest {
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

// Props interfaces for tab components
export interface OverviewTabProps {
  stats: AdminStats;
}

export interface ActivityTabProps {
  activities: Activity[];
  onRefresh: () => void;
}

export interface GuestsTabProps {
  guests: Guest[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  showBlacklisted: boolean;
  onShowBlacklistedChange: (show: boolean) => void;
  quickFilter: string;
  onQuickFilterChange: (filter: string) => void;
  onBlacklistToggle: (guestId: string, action: 'blacklist' | 'unblacklist') => Promise<void>;
  onLoadGuestJourney: (guestId: string) => void;
}

export interface ReportsTabProps {
  report: ExecutiveReport | null;
  reportPeriod: string;
  onReportPeriodChange: (period: string) => void;
}

export interface PoliciesTabProps {
  policies: Policies | null;
  onPolicyUpdate: (policies: { guestMonthlyLimit: number; hostConcurrentLimit: number }) => Promise<void>;
}

export interface AuditTabProps {
  recentOverrides: AdminStats['recentOverrides'];
}

export interface JourneyTabProps {
  selectedGuest: GuestJourney | null;
  onClose: () => void;
}