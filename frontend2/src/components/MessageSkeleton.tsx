import { Skeleton } from "@/components/ui/skeleton";

interface MessageSkeletonProps {
  count?: number;
}

export function MessageSkeleton({ count = 3 }: MessageSkeletonProps) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="max-w-[85%] space-y-1 animate-pulse">
          {/* Username skeleton */}
          <div className="px-1">
            <div
              className="h-2.5 bg-muted rounded w-16"
              style={{ fontSize: "10px" }}
            ></div>
          </div>
          {/* Message bubble skeleton */}
          <div className="bg-muted/50 rounded-lg p-2 space-y-1">
            <div className="h-2.5 bg-muted-foreground/20 rounded w-full"></div>
            <div className="h-2.5 bg-muted-foreground/20 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
