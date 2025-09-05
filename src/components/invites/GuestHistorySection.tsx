'use client';

import { useState, useEffect } from 'react';
import { PageCard } from '@/components/ui/page-card';
import { SearchInput } from '@/components/ui/search-input';
import { DataTable, type Column } from '@/components/ui/data-table';
import { TableSkeleton } from '@/components/skeletons';
import { formatDateInLA } from '@/lib/timezone';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth-token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

interface GuestHistoryItem {
  id: string;
  name: string;
  email: string;
  recentVisits: number;
  lifetimeVisits: number;
  lastVisitDate?: string;
  hasDiscount: boolean;
}

export function GuestHistorySection() {
  const [guestHistory, setGuestHistory] = useState<GuestHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGuestHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/guests/history?query=${searchTerm}`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          setGuestHistory(data.guests || []);
        }
      } catch (error) {
        console.error('Error loading guest history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(loadGuestHistory, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const columns: Column<GuestHistoryItem>[] = [
    {
      key: 'name',
      label: 'Guest',
      className: 'font-medium'
    },
    {
      key: 'email',
      label: 'Email'
    },
    {
      key: 'recentVisits',
      label: 'Visits (30d)'
    },
    {
      key: 'lifetimeVisits',
      label: 'Lifetime Visits'
    },
    {
      key: 'lastVisitDate',
      label: 'Last Visit',
      render: (value) => value ? formatDateInLA(new Date(value)) : 'Never'
    },
    {
      key: 'hasDiscount',
      label: 'Discount Sent?',
      render: (value) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value
            ? 'bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/20 dark:border-green-500/30'
            : 'bg-muted text-muted-foreground border border-border'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      )
    }
  ];

  return (
    <PageCard
      title="Guest History"
      description="Search and view guest visit statistics"
    >
      <div className="space-y-4">
        <SearchInput
          placeholder="Search guests by name or email..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
        {isLoading ? (
          <TableSkeleton 
            columns={6} 
            rows={5} 
            showSearch={false} 
            title={false} 
            description={false} 
          />
        ) : (
          <DataTable
            data={guestHistory}
            columns={columns}
            emptyMessage={searchTerm ? 'No guests found matching your search.' : 'No guest history available.'}
          />
        )}
      </div>
    </PageCard>
  );
}