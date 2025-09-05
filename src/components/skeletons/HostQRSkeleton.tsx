import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function HostQRSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <Skeleton className="w-48 h-48 rounded-lg" />
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );
}