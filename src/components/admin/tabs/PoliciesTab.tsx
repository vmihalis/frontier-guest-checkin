'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, CheckCircle } from 'lucide-react';

interface Policies {
  id: number;
  guestMonthlyLimit: number;
  hostConcurrentLimit: number;
  updatedAt: string;
}

interface PoliciesTabProps {
  isActive?: boolean;
}

export default function PoliciesTab({ isActive = false }: PoliciesTabProps) {
  const [policies, setPolicies] = useState<Policies | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    guestMonthlyLimit: 3,
    hostConcurrentLimit: 3
  });
  const { toast } = useToast();

  const loadPolicies = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/policies');
      if (response.ok) {
        const data = await response.json();
        setPolicies(data);
        setPolicyForm({
          guestMonthlyLimit: data.guestMonthlyLimit,
          hostConcurrentLimit: data.hostConcurrentLimit
        });
        setHasLoaded(true);
      }
    } catch (error) {
      console.error('Error loading policies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system policies. Please refresh.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadPolicies();
    }
  }, [isActive, hasLoaded, loadPolicies]);

  if (!isActive || isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-10 w-full bg-muted rounded animate-pulse" />
                <div className="h-3 w-48 bg-muted rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-10 w-full bg-muted rounded animate-pulse" />
                <div className="h-3 w-48 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
  );
}