import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CardSkeletonProps {
  showIcon?: boolean;
  contentRows?: number;
  showActions?: boolean;
  className?: string;
}

export function CardSkeleton({ 
  showIcon = true, 
  contentRows = 3, 
  showActions = false,
  className 
}: CardSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          {showIcon && <Skeleton className="h-6 w-6" />}
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: contentRows }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
          {showActions && (
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}