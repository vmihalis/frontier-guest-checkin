import { PageCard } from '@/components/ui/page-card';
import { Skeleton } from '@/components/ui/skeleton';
import { HeaderSkeleton, CardSkeleton, TableSkeleton, InvitationCardSkeleton } from '@/components/skeletons';

interface InvitesSkeletonProps {
  showHostQR?: boolean;
}

export function InvitesSkeleton({ showHostQR = true }: InvitesSkeletonProps) {
  return (
    <div className="min-h-screen bg-muted">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header Skeleton */}
        <HeaderSkeleton showActions={true} actionsCount={2} />

        {/* Host QR Code Section Skeleton */}
        {showHostQR && (
          <CardSkeleton 
            showIcon={true} 
            contentRows={2} 
            showActions={true}
            className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-primary/20"
          />
        )}

        {/* Create Invitation Form Skeleton */}
        <PageCard
          title=""
          className="bg-card border border-border rounded-lg shadow-lg"
        >
          <div className="space-y-4">
            {/* Form Title and Description Skeleton */}
            <div className="mb-4">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-80" />
            </div>
            
            {/* Form Fields Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>

            {/* Info Box Skeleton */}
            <div className="pt-4 border-t">
              <div className="bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 rounded-lg p-4">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>

            {/* Submit Button Skeleton */}
            <Skeleton className="h-12 w-full" />
          </div>
        </PageCard>

        {/* Today's Invitations Skeleton */}
        <PageCard
          title=""
          className="bg-card border border-border rounded-lg shadow-lg"
        >
          <div className="space-y-4">
            {/* Section Title Skeleton */}
            <div className="mb-4">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            
            {/* Invitation Cards Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <InvitationCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </PageCard>

        {/* Guest History Table Skeleton */}
        <TableSkeleton 
          columns={6} 
          rows={8} 
          showSearch={true}
          title={true}
          description={true}
        />
      </div>
    </div>
  );
}