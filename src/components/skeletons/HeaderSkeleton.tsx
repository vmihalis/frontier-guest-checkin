import { Skeleton } from '@/components/ui/skeleton';

interface HeaderSkeletonProps {
  showActions?: boolean;
  actionsCount?: number;
}

export function HeaderSkeleton({ showActions = true, actionsCount = 2 }: HeaderSkeletonProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-4 w-full">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div>
              <Skeleton className="h-9 w-80 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
          </div>
        </div>
      </div>
      
      {showActions && (
        <div className="flex items-center gap-4">
          {Array.from({ length: actionsCount }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
      )}
    </div>
  );
}