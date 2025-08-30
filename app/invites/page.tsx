'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDateInLA, formatTimeInLA, formatCountdown, TIMEZONE_DISPLAY } from '@/lib/timezone';
import { QRCodeComponent } from '@/components/ui/qrcode';
import { generateMultiGuestQR } from '@/lib/qr-token';
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

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function InvitesPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [guestHistory, setGuestHistory] = useState<GuestHistoryItem[]>([]);
  const [activeGuestCount, setActiveGuestCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
    hostQR?: string;
    countdown?: string;
  }>({ isOpen: false });

  // Host QR state
  const [hostQRData, setHostQRData] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load current user if not already loaded
      if (!currentUser) {
        const userRes = await fetch('/api/auth/me');
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.user);
        }
      }
      
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
        
        // Generate host QR data for guests who accepted terms
        const acceptedGuests = invitesData.invitations?.filter((inv: Invitation) => 
          inv.guest.termsAcceptedAt && inv.status !== 'EXPIRED'
        ) || [];
        
        if (acceptedGuests.length > 0) {
          const qrData = generateMultiGuestQR(
            acceptedGuests.map((inv: Invitation) => ({
              email: inv.guest.email,
              name: inv.guest.name
            }))
          );
          setHostQRData(qrData);
        } else {
          setHostQRData(null);
        }
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
  }, [selectedDate, searchTerm, currentUser, toast]);

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




  const copyQRToken = () => {
    if (qrModalData.invitation?.qrToken) {
      navigator.clipboard.writeText(qrModalData.invitation.qrToken);
      toast({ title: 'Copied', description: 'QR code token copied to clipboard!' });
    }
  };

  const regenerateQR = async () => {
    // Not used with multi-guest QR system
    toast({ title: 'Info', description: 'QR regeneration not available' });
  };

  const getStatusBadge = (invitation: Invitation) => {
    const { status } = invitation;
    
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
            Pending
          </span>
        );
      case 'ACTIVATED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Ready
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Checked In
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
            {status}
          </span>
        );
    }
  };


  const hasAcceptedTerms = (invitation: Invitation) => {
    return !!invitation.guest.termsAcceptedAt;
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-mono text-lg font-bold">ft</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-800">Frontier Tower</h1>
            </div>
            <p className="text-lg text-gray-800">Welcome, {currentUser?.name || 'Host'}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Active Guests: {activeGuestCount}/3</span>
            </div>
            <p className="text-xs text-gray-700">
              Times shown in {TIMEZONE_DISPLAY}
            </p>
          </div>
        </div>

        {/* Host QR Code Section */}
        {hostQRData && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
                <QrCode className="h-5 w-5 text-blue-600" />
                Your Check-in QR Code
              </CardTitle>
              <CardDescription className="text-gray-700">
                {invitations.filter(inv => inv.guest.termsAcceptedAt && inv.status !== 'EXPIRED').length} guest(s) available for check-in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  <p className="mb-2">This QR code contains all guests who have accepted the terms.</p>
                  <p className="text-xs text-gray-600">Show this at the kiosk to check in your guests.</p>
                </div>
                <Button
                  onClick={() => setQrModalData({ 
                    isOpen: true, 
                    hostQR: hostQRData
                  })}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Show QR Code
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Invitation Form */}
        <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-800">
              <UserCheck className="h-6 w-6 text-blue-600" />
              Create Invitation
            </CardTitle>
            <CardDescription className="text-gray-800">
              Send an invitation email to a guest. They must accept terms via email before QR activation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium text-gray-700">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Contact Method *</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={formData.contactMethod}
                      onValueChange={(value: 'TELEGRAM' | 'PHONE') => 
                        setFormData({ ...formData, contactMethod: value })
                      }
                    >
                      <SelectTrigger className="w-32 border border-gray-300 rounded-lg">
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
                  <Label htmlFor="inviteDate" className="text-sm font-medium text-gray-700">Invite Date</Label>
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

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium text-sm transition-colors">
                Create Invitation
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Today's Invitations */}
        <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                  <Calendar className="h-6 w-6 text-blue-600" />
                  Today&apos;s Invitations
                </CardTitle>
                <CardDescription className="text-gray-800">
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
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-gray-500" />
                </div>
                <p className="text-lg font-medium text-gray-800 mb-2">No invitations for this date</p>
                <p className="text-gray-600">Create your first invitation above to get started.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {invitations.map((invitation) => (
                  <Card key={invitation.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                      {/* Guest Info Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{invitation.guest.name}</h3>
                            {getStatusBadge(invitation)}
                          </div>
                          <p className="text-sm text-gray-600">{invitation.guest.email}</p>
                        </div>
                        
                        {/* Status Display */}
                        <div className="flex gap-3 ml-6">
                          {invitation.status === 'PENDING' && !hasAcceptedTerms(invitation) && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              <Clock className="h-3 w-3 mr-2" />
                              Awaiting Terms
                            </span>
                          )}
                          
                          {hasAcceptedTerms(invitation) && invitation.status !== 'EXPIRED' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              <UserCheck className="h-3 w-3 mr-2" />
                              On Your QR
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Status Information */}
                      <div className="space-y-3">
                        {hasAcceptedTerms(invitation) && (
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Terms Accepted
                          </div>
                        )}
                        
                        {!hasAcceptedTerms(invitation) && invitation.status === 'PENDING' && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-center text-sm text-amber-800">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>Waiting for guest to accept terms via email</span>
                            </div>
                          </div>
                        )}
                        
                        {invitation.status === 'ACTIVATED' && invitation.qrExpiresAt && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center text-sm text-blue-800">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>QR Code expires at {formatTimeInLA(new Date(invitation.qrExpiresAt))}</span>
                            </div>
                          </div>
                        )}
                        
                        {invitation.status === 'CHECKED_IN' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center text-sm text-green-800">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              <span>Successfully checked in</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guest History */}
        <Card className="bg-white border border-gray-300 rounded-lg shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-800">Guest History</CardTitle>
            <CardDescription className="text-gray-800">Search and view guest visit statistics</CardDescription>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-700" />
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
              <p className="text-center text-gray-800 py-8">
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          guest.hasDiscount 
                            ? 'bg-green-50 text-green-800 border border-green-200' 
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {guest.hasDiscount ? 'Yes' : 'No'}
                        </span>
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
          <DialogContent className="sm:max-w-md bg-white border-gray-300">
            <DialogHeader>
              <DialogTitle className="text-gray-800">
                {qrModalData.hostQR ? 'Your Check-in QR Code' : `QR Code - ${qrModalData.invitation?.guest.name}`}
              </DialogTitle>
              <DialogDescription className="text-gray-700">
                {qrModalData.hostQR 
                  ? 'Show this QR code at the kiosk to check in your guests' 
                  : 'Show this QR code to the guest for check-in'}
              </DialogDescription>
            </DialogHeader>
            
            {(qrModalData.invitation || qrModalData.hostQR) && (
              <div className="space-y-4">
                <Card className="p-8">
                  <div className="text-center flex flex-col items-center justify-center">
                    {(qrModalData.hostQR || qrModalData.invitation?.qrToken) ? (
                      <QRCodeComponent 
                        value={qrModalData.hostQR || qrModalData.invitation?.qrToken || ''}
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
                        <p className="text-sm text-gray-800">No QR data available</p>
                      </div>
                    )}
                    {!qrModalData.hostQR && (
                      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-xs font-mono text-gray-700 break-all leading-relaxed">
                          {qrModalData.invitation?.qrToken || 'No token available'}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
                
                {!qrModalData.hostQR && qrModalData.countdown && (
                  qrModalData.countdown === 'EXPIRED' ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="text-center">
                        <p className="text-sm text-red-800 mb-1">Time remaining:</p>
                        <p className="text-2xl font-mono font-semibold text-red-600">
                          EXPIRED
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-center">
                        <p className="text-sm text-green-800 mb-1">Time remaining:</p>
                        <p className="text-2xl font-mono font-semibold text-green-800">
                          {qrModalData.countdown || '00:00'}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
            
            <DialogFooter className="flex gap-3 pt-2">
              {!qrModalData.hostQR && (
                <>
                  <Button 
                    onClick={copyQRToken}
                    variant="secondary"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Token
                  </Button>
                  <Button 
                    onClick={regenerateQR}
                    variant="default"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Regenerate
                  </Button>
                </>
              )}
              {qrModalData.hostQR && (
                <Button 
                  onClick={() => setQrModalData({ isOpen: false })}
                  variant="default"
                >
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}