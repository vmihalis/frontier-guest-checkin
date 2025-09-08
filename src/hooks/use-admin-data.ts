import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AdminStats, GuestJourney, ExecutiveReport, Policies, SearchResult, Activity } from '@/types/admin';

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadStats = useCallback(async (locationId?: string) => {
    try {
      setIsLoading(true);
      const statsUrl = locationId 
        ? `/api/admin/stats?locationId=${locationId}` 
        : '/api/admin/stats';
      const response = await fetch(statsUrl);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch {
      console.error('Error loading stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin statistics. Please refresh.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { stats, isLoading, loadStats };
}

export function useAdminPolicies() {
  const [policies, setPolicies] = useState<Policies | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadPolicies = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/policies');
      if (response.ok) {
        const data = await response.json();
        setPolicies(data.policies);
      }
    } catch {
      console.error('Error loading policies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load policies. Please refresh.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updatePolicies = useCallback(async (policyData: { guestMonthlyLimit: number; hostConcurrentLimit: number }) => {
    try {
      const response = await fetch('/api/admin/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyData)
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: 'Success', description: 'Policies updated successfully!' });
        setPolicies(data.policies);
        return true;
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update policies', variant: 'destructive' });
        return false;
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  return { policies, isLoading, loadPolicies, updatePolicies };
}

export function useAdminActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadActivities = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/activity');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch {
      console.error('Error loading activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activities. Please refresh.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { activities, isLoading, loadActivities };
}

export function useExecutiveReport() {
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadReport = useCallback(async (period: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/reports?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      }
    } catch {
      console.error('Error loading executive report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load executive report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { report, isLoading, loadReport };
}

export function useGlobalSearch() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(searchTerm)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch {
      console.error('Error performing search:', error);
      toast({
        title: 'Error',
        description: 'Search failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { searchResults, isLoading, performSearch };
}

export function useGuestJourney() {
  const [selectedGuest, setSelectedGuest] = useState<GuestJourney | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadGuestJourney = useCallback(async (guestId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/guests/${guestId}/journey`);
      if (response.ok) {
        const data = await response.json();
        setSelectedGuest(data);
      }
    } catch {
      console.error('Error loading guest journey:', error);
      toast({
        title: 'Error',
        description: 'Failed to load guest journey. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearSelectedGuest = useCallback(() => {
    setSelectedGuest(null);
  }, []);

  return { selectedGuest, isLoading, loadGuestJourney, clearSelectedGuest };
}