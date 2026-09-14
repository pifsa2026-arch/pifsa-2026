import { useCountUp } from './useCountUp.js';

export default function StatNumber({ target, suffix, className }) {
  const { ref, text } = useCountUp(target, suffix);
  return <div ref={ref} className={className}>{text}</div>;
}
