/**
 * Page transition wrapper — fade + slide animation.
 */
export default function PageTransition({ children, className = '' }) {
  return (
    <div
      className={`animate-fade-up ${className}`}
      style={{ animationFillMode: 'both' }}
    >
      {children}
    </div>
  );
}
