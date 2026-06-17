import { useState, useEffect, useRef } from 'react';

/**
 * Animated count-up hook. Smoothly animates from 0 to `end`.
 * @param {number} end - Target value
 * @param {number} duration - Animation duration in ms (default 1500)
 * @param {boolean} trigger - Whether to start counting (default true)
 */
export default function useCountUp(end, duration = 1500, trigger = true) {
  const [value, setValue] = useState(0);
  const startTime = useRef(null);
  const rafId = useRef(null);

  useEffect(() => {
    if (!trigger || typeof end !== 'number' || isNaN(end)) {
      setValue(end || 0);
      return;
    }

    setValue(0);

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      setValue(Math.round(easedProgress * end));

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    };

    startTime.current = null;
    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [end, duration, trigger]);

  return value;
}
