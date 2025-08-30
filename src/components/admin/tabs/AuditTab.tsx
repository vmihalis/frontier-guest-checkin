'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface OverrideRecord {
  id: string;
  guestName: string;
  guestEmail: string;
  hostName: string;
  overrideReason: string;
  overrideBy: string;
  createdAt: string;
}

interface AuditTabProps {
  recentOverrides?: OverrideRecord[];
  isActive?: boolean;
}

export default function AuditTab({ recentOverrides, isActive = false }: AuditTabProps) {
  const [overrides, setOverrides] = useState<OverrideRecord[]>(recentOverrides || []);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(!!recentOverrides);
  const { toast } = useToast();

  const loadOverrides = useCallback(async () => {
    if (recentOverrides) return; // Don't fetch if data is already provided
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setOverrides(data.recentOverrides || []);
        setHasLoaded(true);
      }
    } catch (error) {
      console.error('Error loading override records:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit records. Please refresh.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [recentOverrides, toast]);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadOverrides();
    }
  }, [isActive, hasLoaded, loadOverrides]);

  if (!isActive || isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
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
        <CardTitle>Recent Override Activities</CardTitle>
        <CardDescription>Security override actions in the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {overrides && overrides.length > 0 ? (
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
              {overrides.map((override) => (
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
  );
}