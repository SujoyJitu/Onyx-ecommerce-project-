import { motion, useReducedMotion } from 'framer-motion';

// Fade and lift content once as it enters the screen.
export default function Reveal({ children, className, ...props }) {
  const reduceMotion = useReducedMotion();
  return <motion.div className={className} initial={reduceMotion ? false : { opacity: 0, y: 22 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.55, ease: 'easeOut' }} {...props}>{children}</motion.div>;
}
