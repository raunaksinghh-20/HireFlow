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
    <div className="glass-card text-center py-16 px-8">
      {/* Animated icon container */}
      <div className="relative inline-flex items-center justify-center mb-6">
        {/* Glow ring */}
        <div className="absolute w-24 h-24 rounded-full bg-brand-500/5 animate-pulse-soft" />
        <div className="absolute w-20 h-20 rounded-full bg-brand-500/10 animate-pulse-soft" style={{ animationDelay: '0.5s' }} />

        {/* Icon */}
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-surface-800 to-surface-800/50 border border-surface-700/50 flex items-center justify-center animate-float">
          {Icon && <Icon className="w-7 h-7 text-surface-500" />}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-surface-200 mb-2 font-display">
        {title}
      </h3>

      {description && (
        <p className="text-surface-500 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
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
