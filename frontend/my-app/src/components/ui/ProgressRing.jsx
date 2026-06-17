import { useEffect, useRef, useState } from 'react';

/**
 * SVG circular progress ring with animated fill.
 * Color gradient transitions based on value (red → amber → green).
 */
export default function ProgressRing({
  value = 0,
  size = 80,
  strokeWidth = 6,
  className = '',
  showValue = true,
  suffix = '%',
  animated = true,
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (displayValue / 100) * circumference;

  // Scroll trigger
  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animated, value]);

  // Count-up
  useEffect(() => {
    if (!isVisible && animated) return;
    
    let start = null;
    const duration = 1200;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplayValue(Math.round(easeOut(progress) * value));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [isVisible, value, animated]);

  const getColor = () => {
    if (displayValue >= 70) return { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.2)' };
    if (displayValue >= 50) return { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.2)' };
    return { stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)' };
  };

  const { stroke, glow } = getColor();

  return (
    <div ref={ref} className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: `drop-shadow(0 0 6px ${glow})`,
          }}
        />
      </svg>
      {showValue && (
        <span
          className="absolute text-sm font-bold font-mono"
          style={{ color: stroke }}
        >
          {displayValue}{suffix}
        </span>
      )}
    </div>
  );
}
