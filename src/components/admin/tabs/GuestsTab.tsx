'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, Ban, RotateCcw, Eye } from 'lucide-react';

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

interface GuestsTabProps {
  onViewJourney?: (guestId: string) => void;
  isActive?: boolean;
}

export default function GuestsTab({ onViewJourney, isActive = false }: GuestsTabProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBlacklisted, setShowBlacklisted] = useState(false);
  const [quickFilter, setQuickFilter] = useState('all');
  const { toast } = useToast();

  const loadGuests = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/guests?query=${searchTerm}&blacklisted=${showBlacklisted}`);
      if (response.ok) {
        const data = await response.json();
        setGuests(data.guests || []);
        setHasLoaded(true);
      }
    } catch (error) {
      console.error('Error loading guests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load guest data. Please refresh.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, showBlacklisted, toast]);

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
        loadGuests();
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

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadGuests();
    }
  }, [isActive, hasLoaded, loadGuests]);

  // Re-load when search terms change, but only if tab is active and has loaded initially
  useEffect(() => {
    if (isActive && hasLoaded) {
      loadGuests();
    }
  }, [searchTerm, showBlacklisted, isActive, hasLoaded, loadGuests]);

  if (!isActive || isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse mb-4" />
          <div className="flex flex-wrap gap-2">
            <div className="h-10 flex-1 min-w-64 bg-muted rounded animate-pulse" />
            <div className="h-10 w-40 bg-muted rounded animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guest Management</CardTitle>
        <CardDescription>Search and manage guest accounts</CardDescription>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guests by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
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
      </CardHeader>
      <CardContent>
        {getFilteredGuests().length === 0 ? (
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
              {getFilteredGuests().map((guest) => (
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
                        <Badge variant="default">Discount</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewJourney?.(guest.id)}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}