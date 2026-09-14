import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative overflow-hidden bg-surface-container-high/60 dark:bg-white/5 rounded-xl ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-5 rounded-2xl bg-surface-container-low/80 dark:bg-surface-container-lowest/80 border border-outline-variant/30 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-lg" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <Skeleton className="h-10 w-36 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonRow: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-4 flex items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-32 rounded-md" />
          <Skeleton className="h-2.5 w-20 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-6 w-20 rounded-lg shrink-0" />
    </div>
  );
};
