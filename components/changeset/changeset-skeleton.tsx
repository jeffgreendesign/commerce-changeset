import { Skeleton } from "@/components/ui/skeleton";

export function ChangeSetSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Metadata skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="hidden h-3.5 w-28 sm:block" />
      </div>

      {/* Risk summary skeleton */}
      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-28" />
        </div>
      </div>

      {/* Operation card skeletons */}
      {[1, 2].map((i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          {/* Op header */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="ml-auto h-5 w-12 rounded-full" />
          </div>
          {/* Diff table skeleton */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-16" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReadResultSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <Skeleton className="h-5 w-48" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
