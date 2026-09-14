import { useEffect, useRef, useState } from 'react';

// Counts from 0 to target when the element scrolls into view.
export function useCountUp(target, suffix = '', duration = 1600) {
  const ref = useRef(null);
  const [text, setText] = useState('0' + suffix);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const run = () => {
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setText(Math.round(eased * target) + suffix);
        if (p < 1) requestAnimationFrame(tick);
        else setText(target + suffix);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) { run(); return; }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !done.current) {
          done.current = true;
          run();
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, suffix, duration]);

  return { ref, text };
}
