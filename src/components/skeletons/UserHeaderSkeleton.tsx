import { Skeleton } from '@/components/ui/skeleton';

export function UserHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 mb-2">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <div>
        <Skeleton className="h-9 w-80 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>
    </div>
  );
}