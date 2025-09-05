'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    name: '',
    email: '',
    country: '',
    contactMethod: 'TELEGRAM' as 'TELEGRAM' | 'PHONE',
    contactValue: '',
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
        body: JSON.stringify({
          ...formData,
          termsAccepted: true, // Host acknowledges they will send terms to guest
          visitorAgreementAccepted: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({ 
          title: 'Invitation Sent!', 
          description: 'Guest will receive an email to accept terms before QR generation.' 
        });
        setFormData({
          name: '',
          email: '',
          country: '',
          contactMethod: 'TELEGRAM',
          contactValue: '',
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
      description="Send an invitation email to a guest. They must accept terms via email before QR activation."
      icon={UserCheck}
    >
      <form onSubmit={handleCreateInvitation} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country" className="text-sm font-medium text-foreground">Country *</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Contact Method *</Label>
            <div className="flex gap-2">
              <Select 
                value={formData.contactMethod}
                onValueChange={(value: 'TELEGRAM' | 'PHONE') => 
                  setFormData({ ...formData, contactMethod: value })
                }
              >
                <SelectTrigger className="w-32 border border-border rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TELEGRAM">Telegram</SelectItem>
                  <SelectItem value="PHONE">Phone</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder={formData.contactMethod === 'TELEGRAM' ? '@username' : '+1234567890'}
                value={formData.contactValue}
                onChange={(e) => setFormData({ ...formData, contactValue: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inviteDate" className="text-sm font-medium text-foreground">Invite Date</Label>
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
              <strong>📧 Email Workflow:</strong> After creating the invitation, your guest will receive 
              an email to accept the Terms & Conditions and Visitor Agreement before you can generate their QR code.
            </p>
          </div>
        </div>

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg font-medium text-sm transition-colors">
          Create Invitation
        </Button>
      </form>
    </PageCard>
  );
}