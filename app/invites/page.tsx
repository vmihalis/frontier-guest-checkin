'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDateInLA, formatTimeInLA, formatCountdown, TIMEZONE_DISPLAY } from '@/lib/timezone';
import { QRCodeComponent } from '@/components/ui/qrcode';
import { Search, QrCode, Copy, RotateCcw, UserCheck, Clock, Users, Calendar } from 'lucide-react';

interface Guest {
  id: string;
  name: string;
  email: string;
  country?: string;
  contactMethod?: 'TELEGRAM' | 'PHONE';
  contactValue?: string;
}

interface Invitation {
  id: string;
  status: 'PENDING' | 'ACTIVATED' | 'CHECKED_IN' | 'EXPIRED';
  inviteDate: string;
  qrToken?: string;
  qrIssuedAt?: string;
  qrExpiresAt?: string;
  guest: Guest & {
    termsAcceptedAt?: string;
  };
  createdAt: string;
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

const MOCK_HOST = {
  id: 'mock-host-id',
  name: 'John Host',
  email: 'host@example.com',
};

export default function InvitesPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [guestHistory, setGuestHistory] = useState<GuestHistoryItem[]>([]);
  const [activeGuestCount, setActiveGuestCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country: '',
    contactMethod: 'TELEGRAM' as 'TELEGRAM' | 'PHONE',
    contactValue: '',
    inviteDate: new Date().toISOString().split('T')[0],
  });

  // QR Modal state
  const [qrModalData, setQrModalData] = useState<{
    isOpen: boolean;
    invitation?: Invitation;
    countdown?: string;
  }>({ isOpen: false });

  // Load data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load today's invitations
      const invitesRes = await fetch(`/api/invitations?date=${selectedDate}`);
      const invitesData = await invitesRes.json();
      
      if (invitesRes.ok) {
        setInvitations(invitesData.invitations || []);
        
        // Calculate active guest count
        const activeCount = invitesData.invitations?.filter((inv: Invitation) => 
          inv.status === 'CHECKED_IN' && 
          inv.qrExpiresAt && 
          new Date(inv.qrExpiresAt) > new Date()
        ).length || 0;
        setActiveGuestCount(activeCount);
      }
      
      // Load guest history
      const historyRes = await fetch(`/api/guests/history?query=${searchTerm}`);
      const historyData = await historyRes.json();
      
      if (historyRes.ok) {
        setGuestHistory(historyData.guests || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error loading data', description: 'Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, searchTerm, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update countdown for QR modal
  useEffect(() => {
    if (!qrModalData.isOpen || !qrModalData.invitation?.qrExpiresAt) return;

    const interval = setInterval(() => {
      const countdown = formatCountdown(new Date(qrModalData.invitation!.qrExpiresAt!));
      setQrModalData(prev => ({ ...prev, countdown }));
      
      if (countdown === '00:00') {
        clearInterval(interval);
        setQrModalData(prev => ({ ...prev, countdown: 'EXPIRED' }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrModalData.isOpen, qrModalData.invitation]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        loadData();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create invitation' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.' });
    }
  };

  const handleActivateQR = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/invitations/${invitationId}/activate`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        const updatedInvitation = data.invitation;
        setQrModalData({ 
          isOpen: true, 
          invitation: updatedInvitation,
          countdown: formatCountdown(new Date(data.expiresAt))
        });
        loadData();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to activate QR code' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.' });
    }
  };

  const handleAdmit = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/invitations/${invitationId}/admit`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        toast({ 
          title: 'Success', 
          description: data.message || 'Guest checked in successfully!' 
        });
        loadData();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to admit guest' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.' });
    }
  };


  const copyQRToken = () => {
    if (qrModalData.invitation?.qrToken) {
      navigator.clipboard.writeText(qrModalData.invitation.qrToken);
      toast({ title: 'Copied', description: 'QR code token copied to clipboard!' });
    }
  };

  const regenerateQR = async () => {
    if (qrModalData.invitation) {
      await handleActivateQR(qrModalData.invitation.id);
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    const { status } = invitation;
    
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>;
      case 'ACTIVATED':
        return <Badge variant="info">Activated</Badge>;
      case 'CHECKED_IN':
        return <Badge variant="success">Checked In</Badge>;
      case 'EXPIRED':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canActivate = (invitation: Invitation) => {
    return invitation.status === 'PENDING' && invitation.guest.termsAcceptedAt;
  };

  const hasAcceptedTerms = (invitation: Invitation) => {
    return !!invitation.guest.termsAcceptedAt;
  };

  const canAdmit = (invitation: Invitation) => {
    return invitation.status === 'ACTIVATED' && 
           invitation.qrExpiresAt && 
           new Date(invitation.qrExpiresAt) > new Date();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">BerlinHouse – Invites</h1>
            <p className="text-muted-foreground">Welcome, {MOCK_HOST.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="info" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Guests: {activeGuestCount}/3
            </Badge>
            <p className="text-xs text-muted-foreground">
              Times shown in {TIMEZONE_DISPLAY}
            </p>
          </div>
        </div>

        {/* Create Invitation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Create Invitation
            </CardTitle>
            <CardDescription>
              Send an invitation email to a guest. They must accept terms via email before QR activation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contact Method *</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={formData.contactMethod}
                      onValueChange={(value: 'TELEGRAM' | 'PHONE') => 
                        setFormData({ ...formData, contactMethod: value })
                      }
                    >
                      <SelectTrigger className="w-32">
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
                  <Label htmlFor="inviteDate">Invite Date</Label>
                  <Input
                    id="inviteDate"
                    type="date"
                    value={formData.inviteDate}
                    onChange={(e) => setFormData({ ...formData, inviteDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>📧 Email Workflow:</strong> After creating the invitation, your guest will receive 
                    an email to accept the Terms & Conditions and Visitor Agreement before you can generate their QR code.
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full">
                Create Invitation
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Today's Invitations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today&apos;s Invitations
                </CardTitle>
                <CardDescription>
                  {formatDateInLA(new Date(selectedDate))}
                </CardDescription>
              </div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No invitations for this date.
              </p>
            ) : (
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{invitation.guest.name}</h3>
                        {getStatusBadge(invitation)}
                        {hasAcceptedTerms(invitation) && (
                          <Badge variant="success" className="text-xs">Terms Accepted</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{invitation.guest.email}</p>
                      
                      {!hasAcceptedTerms(invitation) && invitation.status === 'PENDING' && (
                        <p className="text-sm text-amber-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Waiting for guest to accept terms via email
                        </p>
                      )}
                      
                      {invitation.status === 'ACTIVATED' && invitation.qrExpiresAt && (
                        <p className="text-sm text-amber-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          QR Expires: {formatTimeInLA(new Date(invitation.qrExpiresAt))}
                        </p>
                      )}
                      
                      {invitation.status === 'CHECKED_IN' && (
                        <p className="text-sm text-green-600">
                          Checked in successfully
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {invitation.status === 'PENDING' && !hasAcceptedTerms(invitation) && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="opacity-50"
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          Awaiting Terms
                        </Button>
                      )}
                      
                      {canActivate(invitation) && (
                        <Button
                          size="sm"
                          onClick={() => handleActivateQR(invitation.id)}
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          Generate QR
                        </Button>
                      )}
                      
                      {invitation.status === 'ACTIVATED' && (
                        <Button
                          size="sm"
                          onClick={() => setQrModalData({ 
                            isOpen: true, 
                            invitation,
                            countdown: invitation.qrExpiresAt ? formatCountdown(new Date(invitation.qrExpiresAt)) : undefined
                          })}
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          Show QR
                        </Button>
                      )}
                      
                      {canAdmit(invitation) && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleAdmit(invitation.id)}
                        >
                          Admit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guest History */}
        <Card>
          <CardHeader>
            <CardTitle>Guest History</CardTitle>
            <CardDescription>Search and view guest visit statistics</CardDescription>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search guests by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {guestHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm ? 'No guests found matching your search.' : 'No guest history available.'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Visits (30d)</TableHead>
                    <TableHead>Lifetime Visits</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead>Discount Sent?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guestHistory.map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell className="font-medium">{guest.name}</TableCell>
                      <TableCell>{guest.email}</TableCell>
                      <TableCell>{guest.recentVisits}</TableCell>
                      <TableCell>{guest.lifetimeVisits}</TableCell>
                      <TableCell>
                        {guest.lastVisitDate 
                          ? formatDateInLA(new Date(guest.lastVisitDate))
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={guest.hasDiscount ? 'success' : 'outline'}>
                          {guest.hasDiscount ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* QR Code Modal */}
        <Dialog 
          open={qrModalData.isOpen} 
          onOpenChange={(open) => setQrModalData({ isOpen: open })}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>QR Code - {qrModalData.invitation?.guest.name}</DialogTitle>
              <DialogDescription>
                Show this QR code to the guest for check-in
              </DialogDescription>
            </DialogHeader>
            
            {qrModalData.invitation && (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-8 bg-white rounded-lg border">
                  <div className="text-center">
                    {qrModalData.invitation.qrToken ? (
                      <QRCodeComponent 
                        value={qrModalData.invitation.qrToken}
                        size={256}
                        className="mb-4"
                        onError={(error) => {
                          console.error('QR Code generation failed:', error);
                          toast({ 
                            title: 'QR Code Error', 
                            description: 'Failed to generate QR code. Please try regenerating.' 
                          });
                        }}
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-6xl mb-4">❌</div>
                        <p className="text-sm text-muted-foreground">No QR token available</p>
                      </div>
                    )}
                    <p className="text-xs font-mono bg-gray-100 p-2 rounded mt-2 break-all">
                      {qrModalData.invitation.qrToken || 'No token available'}
                    </p>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Time remaining:</p>
                  <p className={`text-2xl font-mono ${
                    qrModalData.countdown === 'EXPIRED' ? 'text-red-500' : 'text-green-600'
                  }`}>
                    {qrModalData.countdown || '00:00'}
                  </p>
                </div>
              </div>
            )}
            
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={copyQRToken}>
                <Copy className="h-4 w-4 mr-1" />
                Copy Token
              </Button>
              <Button variant="outline" onClick={regenerateQR}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}