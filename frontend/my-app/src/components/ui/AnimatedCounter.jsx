import { useEffect, useRef, useState } from 'react';
import useCountUp from '../../hooks/useCountUp';

/**
 * Displays a number with count-up animation triggered on scroll visibility.
 * @param {number} value - Target number
 * @param {string} suffix - Suffix like '%', 'pts', etc.
 * @param {string} prefix - Prefix like '$', etc.
 * @param {number} duration - Animation duration in ms
 */
export default function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  duration = 1500,
  className = '',
}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
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
  }, []);

  const displayValue = useCountUp(
    typeof value === 'number' ? value : 0,
    duration,
    isVisible
  );

  return (
    <span ref={ref} className={className}>
      {prefix}{typeof value === 'number' ? displayValue : value}{suffix}
    </span>
  );
}
