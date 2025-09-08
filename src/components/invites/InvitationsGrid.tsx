'use client';

import { useState, useEffect } from 'react';
import { PageCard } from '@/components/ui/page-card';
import { Calendar, Clock, UserCheck, RotateCcw } from 'lucide-react';
import { InvitationGridSkeleton } from '@/components/skeletons';
import { formatDateInLA, formatCountdown } from '@/lib/timezone';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth-token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

interface Guest {
  id: string;
  name?: string; // Now nullable since guest fills this later
  email: string;
  profileCompleted?: boolean;
  termsAcceptedAt?: string;
}

interface Invitation {
  id: string;
  status: 'PENDING' | 'ACTIVATED' | 'CHECKED_IN' | 'EXPIRED';
  inviteDate: string;
  qrToken?: string;
  qrIssuedAt?: string;
  qrExpiresAt?: string;
  guest: Guest;
  createdAt: string;
}

interface InvitationsGridProps {
  selectedDate: string;
  refreshTrigger?: number;
}

export function InvitationsGrid({ selectedDate, refreshTrigger }: InvitationsGridProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInvitations = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/invitations?date=${selectedDate}`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          setInvitations(data.invitations || []);
        }
      } catch (error) {
        console.error('Error loading invitations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInvitations();
  }, [selectedDate, refreshTrigger]);

  // Enhanced visual status system with card backgrounds and prominent badges
  const getCardStyling = (invitation: Invitation) => {
    const hasProfileCompleted = invitation.guest.profileCompleted;
    const hasTerms = !!invitation.guest.termsAcceptedAt;
    
    if (invitation.status === 'CHECKED_IN') {
      return {
        cardClasses: 'bg-green-50/80 dark:bg-green-950/40 border-green-200 dark:border-green-800/50 shadow-green-100/50 dark:shadow-green-900/20',
        primaryBadge: (
          <div className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white shadow-lg">
            <span className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></span>
            CHECKED IN
          </div>
        ),
        secondaryInfo: null,
        statusText: 'Guest is currently in the building'
      };
    }
    
    if (invitation.status === 'EXPIRED') {
      return {
        cardClasses: 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-800/50 shadow-red-100/50 dark:shadow-red-900/20',
        primaryBadge: (
          <div className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white shadow-lg">
            <span className="w-3 h-3 bg-white rounded-full mr-2"></span>
            EXPIRED
          </div>
        ),
        secondaryInfo: (
          <div className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
            <RotateCcw className="h-3 w-3 mr-1" />
            Generate New QR
          </div>
        ),
        statusText: 'QR code has expired - create new invitation'
      };
    }

    if (!hasProfileCompleted) {
      return {
        cardClasses: 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/50 shadow-orange-100/50 dark:shadow-orange-900/20',
        primaryBadge: (
          <div className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white shadow-lg">
            <span className="w-3 h-3 bg-white rounded-full mr-2"></span>
            AWAITING PROFILE
          </div>
        ),
        secondaryInfo: null,
        statusText: 'Guest needs to complete their profile first'
      };
    }
    
    if (hasTerms) {
      return {
        cardClasses: 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 shadow-emerald-100/50 dark:shadow-emerald-900/20',
        primaryBadge: (
          <div className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white shadow-lg">
            <span className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></span>
            READY FOR CHECK-IN
          </div>
        ),
        secondaryInfo: (
          <div className="inline-flex items-center px-3 py-2 rounded-md text-sm font-bold bg-green-600 text-white border-2 border-green-500 shadow-md">
            <UserCheck className="h-4 w-4 mr-2" />
            ✓ ON YOUR QR CODE
          </div>
        ),
        statusText: 'Guest accepted terms - included in your check-in QR'
      };
    }
    
    return {
      cardClasses: 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 shadow-amber-100/50 dark:shadow-amber-900/20',
      primaryBadge: (
        <div className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white shadow-lg">
          <Clock className="h-4 w-4 mr-2" />
          AWAITING TERMS
        </div>
      ),
      secondaryInfo: (
        <div className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          <span>Email invitation sent</span>
        </div>
      ),
      statusText: 'Waiting for guest to accept terms and conditions'
    };
  };

  return (
    <PageCard
      title="Today's Invitations"
      description={formatDateInLA(new Date(selectedDate))}
      icon={Calendar}
    >
      {isLoading ? (
        <InvitationGridSkeleton count={6} />
      ) : invitations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground mb-2">No invitations for this date</p>
          <p className="text-muted-foreground">Create your first invitation above to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {invitations.map((invitation) => {
            const styling = getCardStyling(invitation);
            return (
              <div key={invitation.id} className={`rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] p-6 border-2 ${styling.cardClasses}`}>
                <div className="space-y-4">
                  {/* Guest Info Header */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                      {invitation.guest.name || 'Pending Registration'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate font-medium">{invitation.guest.email}</p>
                  </div>
                  
                  {/* Primary Status Badge */}
                  <div className="flex flex-col gap-3">
                    {styling.primaryBadge}
                    
                    {/* Secondary Action/Info */}
                    {styling.secondaryInfo && (
                      <div className="flex justify-start">{styling.secondaryInfo}</div>
                    )}
                  </div>
                  
                  {/* Status Description */}
                  <p className="text-xs text-gray-600 dark:text-gray-400 italic leading-relaxed">
                    {styling.statusText}
                  </p>
                  
                  {/* QR Expiration Info */}
                  {invitation.qrExpiresAt && invitation.status === 'ACTIVATED' && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 font-mono">
                      ⏰ Expires {formatCountdown(new Date(invitation.qrExpiresAt))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageCard>
  );
}