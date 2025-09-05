import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  showSearch?: boolean;
  title?: boolean;
  description?: boolean;
}

export function TableSkeleton({ 
  columns = 4, 
  rows = 5, 
  showSearch = true,
  title = true,
  description = true
}: TableSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        {title && <Skeleton className="h-6 w-32 mb-2" />}
        {description && <Skeleton className="h-4 w-64 mb-4" />}
        {showSearch && <Skeleton className="h-10 w-full" />}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: columns }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}