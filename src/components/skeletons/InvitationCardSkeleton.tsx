import { Skeleton } from '@/components/ui/skeleton';

export function InvitationCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-3">
      <div className="mb-2">
        <Skeleton className="h-5 w-32 mb-1" />
        <Skeleton className="h-3 w-48 mb-2" />
        
        <div className="space-y-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      
      <div className="border-t border-border pt-2 mt-2">
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}