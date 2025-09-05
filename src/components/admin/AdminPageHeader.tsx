'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Globe, RefreshCw } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import type { Location } from '@/types/admin';

interface AdminPageHeaderProps {
  activeTab: string;
  selectedLocationId: string;
  onLocationChange: (locationId: string) => void;
  locations?: Location[];
  onRefresh: () => void;
}

function getActiveTabLabel(tab: string): string {
  const labels = {
    overview: 'Overview',
    activity: 'Live Activity',
    guests: 'Guest Management',
    reports: 'Executive Reports',
    policies: 'System Policies',
    audit: 'Audit Log',
    journey: 'Guest Journey'
  };
  return labels[tab as keyof typeof labels] || 'Dashboard';
}

export function AdminPageHeader({ 
  activeTab, 
  selectedLocationId, 
  onLocationChange, 
  locations, 
  onRefresh 
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b border-border">
      <div className="flex flex-col md:flex-row md:items-center md:gap-6">
        <div className="flex items-center gap-3 mb-2">
          <Logo size="sm" className="rounded-lg" />
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground">Frontier Tower</h1>
            {/* Show current section on mobile */}
            <p className="text-sm md:hidden text-primary font-medium capitalize">
              {getActiveTabLabel(activeTab)}
            </p>
          </div>
        </div>
        <p className="text-lg text-foreground hidden md:block">Tower Operations & Analytics</p>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Location Selector */}
        {locations && (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedLocationId} onValueChange={onLocationChange}>
              <SelectTrigger className="w-48 bg-background location-selector">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 dark:border-green-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-600 dark:text-green-500" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">Admin Access</span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
}