import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Add a small cursor-follow effect on devices with a mouse.
export default function Magnetic({ children, className, ...props }) {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const enabled = !reduceMotion && window.matchMedia('(pointer: fine)').matches;
  return <motion.div ref={ref} className={className} onMouseMove={(event) => { if (!enabled) return; const box = ref.current.getBoundingClientRect(); ref.current.style.transform = `translate(${(event.clientX - box.left - box.width / 2) * 0.12}px, ${(event.clientY - box.top - box.height / 2) * 0.12}px)`; }} onMouseLeave={() => { if (ref.current) ref.current.style.transform = 'translate(0, 0)'; }} transition={{ type: 'spring', stiffness: 180, damping: 14 }} {...props}>{children}</motion.div>;
}
