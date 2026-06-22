/**
 * Animated empty state with floating illustration.
 */
export default function EmptyState({
  icon: Icon,
  title = 'Nothing here yet',
  description = '',
  action,
  actionLabel = 'Get Started',
}) {
  return (
    <div className="empty-state card-stone max-w-2xl mx-auto py-16 px-8">
      {/* Animated icon container */}
      <div className="relative inline-flex items-center justify-center mb-6">
        {/* Glow ring */}
        <div className="absolute w-24 h-24 rounded-full bg-primary/5 animate-pulse" />
        <div className="absolute w-20 h-20 rounded-full bg-primary/10 animate-pulse" style={{ animationDelay: '0.5s' }} />

        {/* Icon */}
        <div className="relative w-16 h-16 rounded-2xl bg-canvas border border-hairline flex items-center justify-center shadow-sm">
          {Icon && <Icon className="w-7 h-7 text-muted" />}
        </div>
      </div>

      <h3 className="text-xl font-medium text-ink mb-2 font-display">
        {title}
      </h3>

      {description && (
        <p className="text-muted text-sm max-w-sm mx-auto mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <button onClick={action} className="btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
