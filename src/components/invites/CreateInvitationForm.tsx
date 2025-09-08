'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageCard } from '@/components/ui/page-card';
import { UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth-token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export function CreateInvitationForm({ onInvitationCreated }: { onInvitationCreated?: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    inviteDate: new Date().toISOString().split('T')[0],
  });

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({ 
          title: 'Invitation Sent!', 
          description: 'Guest will receive an email to complete their profile and accept terms.' 
        });
        setFormData({
          email: '',
          inviteDate: new Date().toISOString().split('T')[0],
        });
        // Notify parent component to refresh data
        onInvitationCreated?.();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create invitation' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.' });
    }
  };

  return (
    <PageCard
      title="Create Invitation"
      description="Send an invitation email to a guest. They will complete their profile and accept terms via email."
      icon={UserCheck}
    >
      <form onSubmit={handleCreateInvitation} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">Guest Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="guest@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inviteDate" className="text-sm font-medium text-foreground">Visit Date</Label>
            <Input
              id="inviteDate"
              type="date"
              value={formData.inviteDate}
              onChange={(e) => setFormData({ ...formData, inviteDate: e.target.value })}
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>📧 Simplified Workflow:</strong> Just enter the guest&apos;s email address. They will receive 
              an invitation to:
            </p>
            <ol className="list-decimal list-inside mt-2 ml-4 text-sm text-blue-700 dark:text-blue-400">
              <li>Complete their profile (name, country, contact info)</li>
              <li>Accept Terms & Conditions and Visitor Agreement</li>
              <li>Receive QR code for check-in after approval</li>
            </ol>
          </div>
        </div>

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg font-medium text-sm transition-colors">
          Send Invitation
        </Button>
      </form>
    </PageCard>
  );
}