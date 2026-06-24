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
        {Icon && <Icon className="w-8 h-8 text-muted" />}
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
