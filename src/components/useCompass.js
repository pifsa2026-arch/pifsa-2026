import { useEffect, useRef, useState } from 'react';

// Scroll-driven compass: returns the active step index and a ref for the wrap.
export function useCompass(stepCount) {
  const wrapRef = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const update = () => {
      const rect = wrap.getBoundingClientRect();
      const total = wrap.offsetHeight - window.innerHeight;
      const progress = Math.max(0, Math.min(1, (-rect.top) / total));
      const idx = Math.min(stepCount - 1, Math.floor(progress * stepCount));
      setActive(idx);
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [stepCount]);

  const goToStep = (idx) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const total = wrap.offsetHeight - window.innerHeight;
    const targetY = wrap.offsetTop + (total * (idx + 0.5)) / stepCount;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  return { wrapRef, active, goToStep };
}
