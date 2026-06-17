import { useEffect, useRef } from 'react';

/**
 * Intersection Observer hook for scroll-triggered animations.
 * Watches for elements with scroll-reveal classes and adds 'revealed' class.
 */
export default function useScrollAnimation(options = {}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const { threshold = 0.1, rootMargin = '0px 0px -60px 0px' } = options;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target); // Only animate once
          }
        });
      },
      { threshold, rootMargin }
    );

    const container = containerRef.current || document;
    const elements = container.querySelectorAll(
      '.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale'
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]);

  return containerRef;
}
