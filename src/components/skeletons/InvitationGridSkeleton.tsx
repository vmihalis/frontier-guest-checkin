import { InvitationCardSkeleton } from './InvitationCardSkeleton';

export function InvitationGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <InvitationCardSkeleton key={i} />
      ))}
    </div>
  );
}