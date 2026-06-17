/**
 * Premium loading skeleton with shimmer animation.
 * Variants: 'card', 'text', 'avatar', 'chart', 'stat'.
 */
export default function SkeletonLoader({ variant = 'card', count = 1 }) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  const variants = {
    card: () => (
      <div className="glass-card animate-pulse">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-surface-800 shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded-lg bg-surface-800 shimmer" />
            <div className="h-3 w-1/2 rounded-lg bg-surface-800/70 shimmer" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded-lg bg-surface-800/50 shimmer" />
          <div className="h-3 w-5/6 rounded-lg bg-surface-800/50 shimmer" />
        </div>
      </div>
    ),
    text: () => (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 w-full rounded-lg bg-surface-800 shimmer" />
        <div className="h-4 w-5/6 rounded-lg bg-surface-800 shimmer" />
        <div className="h-4 w-4/6 rounded-lg bg-surface-800 shimmer" />
      </div>
    ),
    avatar: () => (
      <div className="flex items-center gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-surface-800 shimmer" />
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-surface-800 shimmer" />
          <div className="h-2 w-16 rounded bg-surface-800/70 shimmer" />
        </div>
      </div>
    ),
    chart: () => (
      <div className="glass-card animate-pulse">
        <div className="h-4 w-1/3 rounded bg-surface-800 shimmer mb-4" />
        <div className="h-[200px] rounded-xl bg-surface-800/30 shimmer" />
      </div>
    ),
    stat: () => (
      <div className="glass-card animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-surface-800 shimmer" />
        </div>
        <div className="h-7 w-16 rounded bg-surface-800 shimmer mb-1" />
        <div className="h-3 w-24 rounded bg-surface-800/70 shimmer" />
      </div>
    ),
  };

  const Skeleton = variants[variant] || variants.card;

  return (
    <>
      {skeletons.map((i) => (
        <div key={i}>{Skeleton()}</div>
      ))}
    </>
  );
}
